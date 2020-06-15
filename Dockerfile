FROM node:14.2-alpine

RUN apk add --update \
  git \
  openssh-client \
&& rm -rf /var/cache/apk/*

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .

EXPOSE 3000
CMD ["node", "src/main.js"]
