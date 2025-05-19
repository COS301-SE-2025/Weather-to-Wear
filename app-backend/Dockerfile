# Use an official Node.js image
FROM node:20-alpine

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy rest of the app
COPY . .

# Set environment variable (override in prod)
ENV PORT=5000

# Expose the port
EXPOSE 5000

# Start the app
CMD ["npx", "ts-node", "src/server.ts"]
