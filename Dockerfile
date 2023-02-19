FROM node:18.14

ENV DEBIAN_FRONTEND=noninteractive
ENV NODE_ENV production

COPY ./src ./src/

WORKDIR /src

RUN npm ci

RUN apt-get install curl
RUN curl -s https://packagecloud.io/install/repositories/ookla/speedtest-cli/script.deb.sh | bash
RUN apt-get install speedtest

EXPOSE 3000

CMD ["node", "./exporter.js"]
