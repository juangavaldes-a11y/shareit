FROM node:22-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY src ./src
COPY config ./config
COPY migrations ./migrations
COPY seeders ./seeders
COPY .sequelizerc ./.sequelizerc

EXPOSE 4000

USER node
CMD ["npm", "run", "start"]
