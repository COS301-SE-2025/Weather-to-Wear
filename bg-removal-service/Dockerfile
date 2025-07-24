FROM python:3.10-slim

# install system dependencies
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
      build-essential git libglib2.0-0 libsm6 libxext6 libxrender-dev && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY requirements.txt .

# install Python deps (this pulls down the U2NET model weights)
RUN pip install --no-cache-dir -r requirements.txt

COPY app.py .

# expose port & start
EXPOSE 8000
CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "8000"]
