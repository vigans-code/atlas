"""Standalone entry point bundled with the Atlas Windows desktop application."""

import multiprocessing
import os
import traceback
from pathlib import Path


def main() -> None:
    multiprocessing.freeze_support()
    try:
        import uvicorn

        from atlas_model.server import app

        port = int(os.environ.get("ATLAS_MODEL_PORT", "47636"))
        uvicorn.run(
            app,
            host="127.0.0.1",
            port=port,
            access_log=False,
            log_config=None,
            log_level="warning",
        )
    except BaseException:
        log_path = os.environ.get("ATLAS_MODEL_ERROR_LOG")
        if log_path:
            Path(log_path).write_text(traceback.format_exc(), encoding="utf-8")
        raise


if __name__ == "__main__":
    main()
