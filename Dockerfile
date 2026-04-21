# Same as engine in package.json
# Alpine saves us a bunch of space
FROM node:22.14-alpine

WORKDIR /app

ENV NODE_ENV="production"

COPY package*.json ./

# Clean install
RUN npm ci --production

COPY ./ ./

# https://stackoverflow.com/a/47722899
# This docker stuff is easy when you just nick it
HEALTHCHECK  --interval=1m --timeout=3s \
  CMD wget --no-verbose --tries=1 --spider http://localhost:20221/ || exit 1

CMD [ "npm","start"]