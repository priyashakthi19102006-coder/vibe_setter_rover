"""
VIBESETTER OS - Application Entrypoint (Backward Compatibility Bridge)
====================================================================
Exposes the modular FastAPI application defined in backend.main:app.
"""

import sys
from pathlib import Path

# Bootstrap sys.path so app.py can run from root or backend directory
BASE_DIR = Path(__file__).resolve().parent
ROOT_DIR = BASE_DIR.parent
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))
if str(BASE_DIR) not in sys.path:
    sys.path.insert(0, str(BASE_DIR))

from backend.main import app
from backend.config import settings

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.main:app", host=settings.HOST, port=settings.PORT, reload=settings.DEBUG)
