FROM node:18.14

ENV DEBIAN_FRONTEND=noninteractive

COPY ./src ./src/

WORKDIR /src

RUN npm ci

RUN apt-get install curl
RUN curl -s https://packagecloud.io/install/repositories/ookla/speedtest-cli/script.deb.sh | bash
RUN apt-get install speedtest

RUN speedtest --accept-license --accept-gdpr

CMD ["node", "./exporter.js"]
