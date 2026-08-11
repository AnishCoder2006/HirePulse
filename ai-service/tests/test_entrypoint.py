import os
import subprocess
import sys
from pathlib import Path


def test_service_entrypoint_module_imports_from_service_root():
    service_root = Path(__file__).resolve().parents[1]
    env = os.environ.copy()
    env.setdefault("PYTHONPATH", str(service_root))

    proc = subprocess.run(
        [sys.executable, "-c", "import main; print(main.app.title)"],
        cwd=service_root,
        capture_output=True,
        text=True,
        env=env,
    )

    assert proc.returncode == 0, proc.stderr
    assert "Job Hunt AI Service" in proc.stdout
