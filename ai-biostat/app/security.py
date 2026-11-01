import hashlib, secrets, hmac


def hash_password(pwd: str, salt: str | None = None):
    salt = salt or secrets.token_hex(16)
    h = hashlib.pbkdf2_hmac("sha256", pwd.encode(), salt.encode(), 200_000).hex()
    return h, salt


def check_password(pwd: str, h: str, salt: str) -> bool:
    return hmac.compare_digest(hash_password(pwd, salt)[0], h)


def new_password() -> str:
    """6 цифр — выдаётся участнику вместе с кодом."""
    return f"{secrets.randbelow(10**6):06d}"


def new_token() -> str:
    return secrets.token_urlsafe(32)
