FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./

# Install dependencies
RUN npm install


# Copy the rest of the application code
COPY . .


# Expose the application port
EXPOSE 7000

# Start the application
CMD ["npm", "start"]