# Use an official Node.js image
FROM node:20-alpine

# Install curl for diagnostics
RUN apk add --no-cache curl postgresql-client

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the rest of the app
COPY . .

# Generate Prisma Client
RUN npx prisma generate

# Set environment variable
ENV PORT=5000

# Expose app port
EXPOSE 5000

# Deploy migrations before starting server
CMD npx prisma migrate deploy && npx ts-node src/server.ts
