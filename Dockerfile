FROM node:20

# Set working directory
WORKDIR /app

# Copy dependency files and install dependencies
COPY package*.json ./
RUN npm install

# Copy the rest of the code
COPY . .

# Set environment to development (optional)
ENV NODE_ENV=development

# Expose the required ports
EXPOSE 19000 19001 19002

# Use the local expo CLI to start the project
CMD ["npx", "expo", "start", "--tunnel"]
