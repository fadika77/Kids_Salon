# ═══════════════════════════════════════════════════════════════════════════
# Kids Barbershop backend — FastAPI + pyodbc + Microsoft ODBC Driver 18
# Used by Render (or any Docker host). The MS ODBC driver is required for
# connecting to Azure SQL, and is not available in plain Python images.
# ═══════════════════════════════════════════════════════════════════════════
FROM python:3.11-slim-bookworm

# ── Install Microsoft ODBC Driver 18 for SQL Server ──────────────────────────
RUN apt-get update && apt-get upgrade -y && apt-get install -y --no-install-recommends \
        curl gnupg2 ca-certificates apt-transport-https \
    && curl -fsSL https://packages.microsoft.com/keys/microsoft.asc \
        | gpg --dearmor -o /usr/share/keyrings/microsoft-prod.gpg \
    && echo "deb [signed-by=/usr/share/keyrings/microsoft-prod.gpg] https://packages.microsoft.com/debian/12/prod bookworm main" \
        > /etc/apt/sources.list.d/mssql-release.list \
    && apt-get update \
    && ACCEPT_EULA=Y apt-get install -y --no-install-recommends msodbcsql18 unixodbc \
    && apt-get clean && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# ── Python dependencies ──────────────────────────────────────────────────────
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# ── App code ─────────────────────────────────────────────────────────────────
COPY app ./app

# Gallery uploads folder (mount a persistent disk here on Render)
RUN mkdir -p uploads/gallery

# Render provides $PORT; default to 8000 for local Docker runs
CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}"]
