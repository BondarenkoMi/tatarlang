FROM python:3.10.11-slim

# Устанавливаем зависимости для psycopg2 (PostgreSQL)
RUN apt-get update && apt-get install -y \
    gcc \
    python3-dev \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*


WORKDIR /app


COPY requirements.txt .

RUN pip install --upgrade pip && \
    pip install -r requirements.txt


COPY . .

CMD ["gunicorn", "tatarlang.wsgi:application", "--bind=0.0.0.0:8000", "--workers=2", "--threads=2", "--timeout=120", "--access-logfile=-", "--error-logfile=-"]
