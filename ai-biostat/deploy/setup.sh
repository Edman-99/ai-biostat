#!/usr/bin/env bash
# AI-Biostat: установка на сервер Ubuntu 22.04/24.04 (Amazon EC2 и любой VPS).
# Запуск из папки проекта:  sudo bash deploy/setup.sh
# Повторный запуск безопасен: обновляет код, данные (data/) не трогает.
set -euo pipefail
[ "$(id -u)" -eq 0 ] || { echo "Запустите через sudo: sudo bash deploy/setup.sh"; exit 1; }
SRC="$(cd "$(dirname "$0")/.." && pwd)"
APP=/opt/ai-biostat
echo "==> 1/6 Системные пакеты"
export DEBIAN_FRONTEND=noninteractive
apt-get update -y -qq
apt-get install -y -qq python3 python3-venv sqlite3 rsync curl debian-keyring debian-archive-keyring apt-transport-https gnupg >/dev/null
if ! command -v caddy >/dev/null; then
  curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | gpg --dearmor --yes -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
  curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' > /etc/apt/sources.list.d/caddy-stable.list
  apt-get update -y -qq && apt-get install -y -qq caddy >/dev/null
fi
echo "==> 2/6 Код сайта в $APP"
id aib >/dev/null 2>&1 || useradd --system --home "$APP" --shell /usr/sbin/nologin aib
mkdir -p "$APP/data" "$APP/backups"
rsync -a --delete --exclude data --exclude backups --exclude .git --exclude '.venv' "$SRC/" "$APP/"
python3 -m venv "$APP/.venv"
"$APP/.venv/bin/pip" install -q --upgrade pip
"$APP/.venv/bin/pip" install -q fastapi uvicorn
chown -R aib:aib "$APP"
chmod 700 "$APP/data" "$APP/backups"
echo "==> 3/6 Служба сайта"
cat > /etc/systemd/system/ai-biostat.service <<UNIT
[Unit]
Description=AI-Biostat
After=network.target
[Service]
User=aib
WorkingDirectory=$APP
Environment=AIB_SECURE_COOKIE=1
ExecStart=$APP/.venv/bin/uvicorn app.main:app --host 127.0.0.1 --port 8000 --proxy-headers
Restart=always
[Install]
WantedBy=multi-user.target
UNIT
systemctl daemon-reload
systemctl enable --now ai-biostat >/dev/null
systemctl restart ai-biostat
echo "==> 4/6 Адрес сайта и HTTPS"
TOKEN=$(curl -s -m 3 -X PUT http://169.254.169.254/latest/api/token -H "X-aws-ec2-metadata-token-ttl-seconds: 60" || true)
IP=$(curl -s -m 3 -H "X-aws-ec2-metadata-token: $TOKEN" http://169.254.169.254/latest/meta-data/public-ipv4 || true)
[[ "$IP" =~ ^[0-9.]+$ ]] || IP=$(curl -s -m 5 https://checkip.amazonaws.com | tr -d '[:space:]')
DOMAIN="${AIB_DOMAIN:-${IP//./-}.sslip.io}"
cat > /etc/caddy/Caddyfile <<CADDY
$DOMAIN {
    encode gzip
    reverse_proxy 127.0.0.1:8000
}
CADDY
systemctl enable caddy >/dev/null; systemctl restart caddy
echo "==> 5/6 Ежедневная резервная копия (хранится 14 дней)"
cat > /etc/cron.daily/ai-biostat-backup <<'BK'
#!/bin/sh
D=/opt/ai-biostat
[ -f $D/data/ai_biostat.db ] || exit 0
sqlite3 $D/data/ai_biostat.db ".backup '$D/backups/ai_biostat-$(date +%F).db'"
find $D/backups -name 'ai_biostat-*.db' -mtime +14 -delete
BK
chmod +x /etc/cron.daily/ai-biostat-backup
echo "==> 6/6 Команда для участников"
cat > /usr/local/bin/aib-participants <<'PT'
#!/bin/sh
# aib-participants import файл.csv | reset КОД | list
set -e
[ "$1" = "import" ] && [ -n "$2" ] && { install -o aib -g aib -m 600 "$2" /opt/ai-biostat/data/_import.csv; set -- import /opt/ai-biostat/data/_import.csv; }
cd /opt/ai-biostat/data
sudo -u aib /opt/ai-biostat/.venv/bin/python /opt/ai-biostat/tools/participants.py "$@"
rm -f /opt/ai-biostat/data/_import.csv
for f in /opt/ai-biostat/data/пароли_*.csv; do [ -f "$f" ] && { echo; echo "----- $f -----"; cat "$f"; echo; echo "Скопируйте пароли, затем удалите файл: sudo rm \"$f\""; }; done
PT
chmod 755 /usr/local/bin/aib-participants
sleep 3
if curl -s -m 5 http://127.0.0.1:8000/api/me | grep -q "Требуется вход"; then
  echo; echo "Готово. Сайт: https://$DOMAIN"
  echo "(сертификат HTTPS выдаётся автоматически в течение 1–2 минут)"
else
  echo; echo "Сайт не ответил. Посмотрите журнал: sudo journalctl -u ai-biostat -n 50"
fi
