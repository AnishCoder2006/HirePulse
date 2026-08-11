import logging
import sys


def configure_logging() -> None:
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s %(levelname)s %(name)s %(message)s",
        stream=sys.stdout,
    )
    # Quiet down noisy third-party loggers so ours stays readable.
    logging.getLogger("httpx").setLevel(logging.WARNING)
