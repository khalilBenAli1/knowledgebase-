FROM node:18-alpine

# Install ImageMagick and other dependencies
RUN apk add --no-cache \
    imagemagick \
    ghostscript \
    poppler-utils \
    python3 \
    make \
    g++

# Create app directory
WORKDIR /usr/src/app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy app source
COPY . .

# Build the app
RUN npm run build

# Expose port
EXPOSE 3000

# Start the app
CMD ["npm", "run", "start:prod"]
