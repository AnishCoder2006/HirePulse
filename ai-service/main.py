import os
import socket

from app.main import app


def _get_available_port(default_port: int) -> int:
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as sock:
        try:
            sock.bind(("0.0.0.0", default_port))
            return default_port
        except OSError:
            pass

    for candidate in range(default_port + 1, default_port + 20):
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as sock:
            try:
                sock.bind(("0.0.0.0", candidate))
                return candidate
            except OSError:
                continue

    raise RuntimeError(f"No available port found near {default_port}")


if __name__ == "__main__":
    import uvicorn

    port = _get_available_port(int(os.getenv("PORT", "8000")))
    # Use the correct module path and enable reload
    uvicorn.run("app.main:app", host="0.0.0.0", port=port, reload=True)
