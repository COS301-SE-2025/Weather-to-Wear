# Use Node.js base image
FROM node:20-alpine

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Clean npm cache & retry install
RUN npm cache clean --force && npm install --legacy-peer-deps

# Copy rest of the code
COPY . .

EXPOSE 3000

CMD ["npm", "start"]
