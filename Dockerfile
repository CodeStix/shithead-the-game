FROM node:16.7

WORKDIR /app
COPY . . 

ENV NODE_ENV="development"

WORKDIR /app/client
RUN yarn
WORKDIR /app/server
RUN yarn

ENV NODE_ENV="production"

WORKDIR /app
RUN chmod u+x build.sh
RUN ./build.sh

WORKDIR /app/build
RUN yarn install

CMD ["node", "src/server.js"]