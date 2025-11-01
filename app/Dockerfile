FROM node:18-alpine

WORKDIR /usr/src/app

# Copy package files
COPY package*.json ./

# Install dependencies with explicit registry and clean npm cache
RUN npm config set registry https://registry.npmjs.org/ && \
    npm install && \
    npm cache clean --force

# Copy application files
COPY . .

# Start the application
CMD ["node", "src/server.js"]

