# Use an official Node.js runtime as a parent image
FROM node:18-alpine

# Set the working directory inside the container
WORKDIR /usr/src/app

# Copy package.json and package-lock.json to install dependencies
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the rest of the application code (including src folder)
COPY . .

# Copy environment variables
COPY .env .env

# Expose the port the app runs on
EXPOSE 3000

# Run the application from the index.js file in the root
CMD ["npm", "start"]
