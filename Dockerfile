# Use official Node.js runtime as base image
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm install --production && npm cache clean --force

# Copy application files
COPY bot.js helper.js ./

# Create directories for SSH keys and data
RUN mkdir -p /var/telegram-ssh /app/keys

# Create non-root user for security
RUN addgroup -g 1001 -S telegram && \
    adduser -S telegram -u 1001 -G telegram

# Change ownership of app directory
RUN chown -R telegram:telegram /app /var/telegram-ssh

# Switch to non-root user
USER telegram

# Default command
CMD ["node", "bot.js"]