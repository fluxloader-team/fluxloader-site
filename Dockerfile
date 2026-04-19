# Same as engine in package.json
# Alpine saves us a bunch of space
FROM node:22.14-alpine

WORKDIR /app

ENV NODE_ENV="production"

COPY package*.json ./

# Clean install
RUN npm ci --production

COPY ./ ./

CMD [ "npm","run","deploy"]