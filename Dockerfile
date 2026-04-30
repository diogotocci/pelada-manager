# ---------------------------------------
# Base stage: lightweight Python image
# ---------------------------------------
FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .

# dependencies
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

ENV FLASK_APP=app.py
ENV FLASK_RUN_HOST=0.0.0.0
ENV FLASK_ENV=production
ENV PYTHONUNBUFFERED=1

EXPOSE 5000

CMD ["gunicorn", "-w", "2", "-b", "0.0.0.0:5000", "app:app"]
