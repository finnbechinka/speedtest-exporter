FROM python:3.10

COPY ./src ./src/

ENV DEBIAN_FRONTEND=noninteractive

RUN pip install flask
RUN pip install prometheus_client

RUN apt-get install curl
RUN curl -s https://packagecloud.io/install/repositories/ookla/speedtest-cli/script.deb.sh | sudo bash
RUN apt-get install speedtest

CMD ["python3", "./src/exporter.py"]
