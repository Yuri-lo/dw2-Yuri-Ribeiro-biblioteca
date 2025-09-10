Projeto Biblioteca Escolar

Run backend (FastAPI):
- create a virtualenv and install dependencies in backend/requirements.txt
- from repository root run:
  python -m pip install -r backend\requirements.txt
  python -m uvicorn backend.app:app --reload --port 8000

Frontend: open frontend/index.html in the browser (scripts.js expects API at http://127.0.0.1:8000)
