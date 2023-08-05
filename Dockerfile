# Use the official Node.js image
FROM node:14

# Set the working directory
WORKDIR /app

# Copy package.json and package-lock.json to the container
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the rest of the application
COPY . .

# Expose the necessary port
EXPOSE 3000

EXPOSE 6379

# Start the application
CMD [ "npm", "run","start" ]
