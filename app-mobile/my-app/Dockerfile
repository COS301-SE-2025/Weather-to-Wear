# # Use Node.js base image
# FROM node:20-alpine

# # Set working directory
# WORKDIR /app

# # Copy package files
# COPY package*.json ./

# # Clean npm cache & retry install
# RUN npm cache clean --force && npm install --legacy-peer-deps

# # Copy rest of the code
# COPY . .

# EXPOSE 3000

# CMD ["npm", "start"]


FROM node:20-alpine

# Set working directory
WORKDIR /app

# Install dependencies separately to enable caching
COPY package*.json ./
RUN npm cache clean --force && \
    rm -rf node_modules package-lock.json && \
    npm install --legacy-peer-deps --no-optional

# Copy rest of the code
COPY . .

# Expose frontend port
EXPOSE 3000

# Enable polling for hot reload
ENV CHOKIDAR_USEPOLLING=true

CMD ["npm", "start"]
