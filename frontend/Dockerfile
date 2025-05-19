FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

# Environment variable for API URL will be set by docker-compose
# EXPOSE 3000
# CMD ["npm", "run", "dev"]