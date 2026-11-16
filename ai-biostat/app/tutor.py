"""Встроенный ИИ-репетитор (Claude Haiku 5.5 через Anthropic API).

Ключ — только в окружении службы (ANTHROPIC_API_KEY из /opt/ai-biostat/secrets.env), никогда в репозитории.
Основа системного промпта — инструкции авторского GPT (файл AIB_TUTOR_PROMPT на сервере, не в публичном репо);
поверх — правила пилота (PILOT_RULES). Без ключа репетитор выключен — сайт показывает ссылку на GPT.
"""
import os

MODEL = "claude-haiku-5-5"            # самая дешёвая модель (решение автора 17.11.2026)
MAX_TOKENS = 900                      # короткие ответы — дешевле и удобнее читать
DAILY_LIMIT = 80                      # сообщений на участника в сутки
HISTORY = 12                          # последних реплик в запросе
MAX_CHARS = 2000                      # длина одного сообщения студента
BLOCKED_STEPS = {4, 7, 8}             # решение методиста: тут студент работает сам
PROMPT_FILE = os.environ.get("AIB_TUTOR_PROMPT", "/opt/ai-biostat/data/tutor_prompt.txt")

FALLBACK_PROMPT = """Сен – медициналық университеттің «Биостатистика» пәні бойынша ЖИ-репетиторысың.
You are an AI tutor for the Biostatistics course at a medical university: explain simply, with medical examples,
step by step, correct mistakes gently, offer short exercises."""

PILOT_RULES = """
ПРАВИЛА ПИЛОТА AI-Biostat (имеют приоритет над инструкциями выше):
1. Язык ответа = язык последнего сообщения студента: қазақша → қазақша, по-русски → по-русски, in English → in English.
   Термины давай на языке ответа и международное название в скобках, например: мүмкіндіктер қатынасы (odds ratio).
2. Ты встроен в учебный кейс. Не решай за студента задание текущего шага кейса: не называй правильный вариант
   метода, правильные типы переменных, номера строк с ошибками, точные значения пропусков в коде и не пиши за него
   вывод. Наводи вопросами, объясняй понятия, давай аналогичный пример на других данных. Учебные задачи вне кейса
   («Тест», «Есеп», «Қайталайық») решать и объяснять можно полностью.
3. Отвечай кратко: обычно 3–8 предложений или короткий список. Длинные лекции — только если студент просит.
4. Не проси и не принимай персональные данные пациентов (ФИО, ИИН, даты рождения, адреса). Если студент их прислал —
   попроси удалить и работать с обезличенными данными.
5. Данные кейса учебные (смоделированы). Не выдумывай ссылки на статьи и цифры «из официальной статистики».
6. Если вопрос не о биостатистике, анализе данных, R/Python или работе с ИИ — вежливо верни к теме курса.
"""


def base_prompt() -> str:
    try:
        with open(PROMPT_FILE, encoding="utf-8") as f:
            text = f.read().strip()
            if text:
                return text
    except OSError:
        pass
    return FALLBACK_PROMPT


def system_prompt(context: str) -> str:
    return f"{base_prompt()}\n{PILOT_RULES}\nКОНТЕКСТ СЕЙЧАС: {context}"


def enabled() -> bool:
    return bool(os.environ.get("ANTHROPIC_API_KEY"))


_client = None


def client():
    global _client
    if _client is None:
        import anthropic                       # импорт здесь: без ключа сервер работает и без пакета
        _client = anthropic.Anthropic(timeout=60.0, max_retries=2)
    return _client


def ask(messages: list[dict], context: str) -> dict:
    """messages: [{role: user|assistant, content: str}], последнее — от студента.
    Возвращает {text, refused, input_tokens, output_tokens}."""
    resp = client().messages.create(
        model=MODEL,
        max_tokens=MAX_TOKENS,
        system=system_prompt(context),
        messages=messages,
        thinking={"type": "disabled"},         # беседа — без «размышлений»: быстрее и дешевле
        output_config={"effort": "low"},
    )
    if resp.stop_reason == "refusal":
        return {"text": "", "refused": True, "input_tokens": resp.usage.input_tokens, "output_tokens": resp.usage.output_tokens}
    text = "".join(b.text for b in resp.content if b.type == "text").strip()
    return {"text": text, "refused": False, "input_tokens": resp.usage.input_tokens, "output_tokens": resp.usage.output_tokens}
