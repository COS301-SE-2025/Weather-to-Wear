# #Dockerfile
# # Use an official Node.js image
# FROM node:20-alpine

# # Install curl for diagnostics
# RUN apk add --no-cache curl postgresql-client

# # Set working directory
# WORKDIR /app

# # Copy package files
# COPY package*.json ./

# # Install dependencies
# RUN npm install

# # Copy the rest of the app
# COPY . .

# # Generate Prisma Client
# RUN npx prisma generate

# # Set environment variable
# ENV PORT=5000

# # Expose app port
# EXPOSE 5000

# # Deploy migrations before starting server
# CMD npx prisma migrate deploy && npx ts-node src/server.ts


FROM node:20-slim

# Install Python and image processing dependencies
RUN apt-get update && apt-get install -y \
  python3 python3-pip python3-dev \
  build-essential libjpeg-dev zlib1g-dev libffi-dev \
  libgl1 libglib2.0-0 ffmpeg curl git \
  && pip3 install --break-system-packages --no-cache-dir \
  torch torchvision pillow opencv-python \
  && apt-get clean


# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install Node.js deps
RUN npm install

# Copy the rest of the backend
COPY . .
COPY scripts/background-removal/U-2-Net /app/scripts/background-removal/U-2-Net


# Generate Prisma Client
RUN npx prisma generate

# Expose backend port
EXPOSE 5000

CMD npx prisma migrate deploy && npx ts-node src/server.ts

