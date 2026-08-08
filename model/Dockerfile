FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

WORKDIR /model

COPY pyproject.toml README.md ./

RUN pip install --no-cache-dir --index-url https://download.pytorch.org/whl/cpu "torch>=2.5,<3.0" \
    && pip install --no-cache-dir "fastapi>=0.115,<1.0" "numpy>=2.0,<3.0" "pydantic>=2.10,<3.0" "uvicorn[standard]>=0.32,<1.0" "pytest>=8.3,<9.0" "ruff>=0.8,<1.0"

COPY atlas_model ./atlas_model
COPY tests ./tests
COPY data ./data

RUN pip install --no-cache-dir --no-deps -e .

EXPOSE 47636

CMD ["uvicorn", "atlas_model.server:app", "--host", "0.0.0.0", "--port", "47636"]
