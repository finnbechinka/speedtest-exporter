from flask import Response, Flask, request
import prometheus_client
from prometheus_client.core import CollectorRegistry
from prometheus_client import Summary, Counter, Histogram, Gauge
import time
import subprocess


app = Flask(__name__)

_INF = float("inf")

graphs = {}
graphs["up"] = Gauge("up", "up speed")
graphs["down"] = Gauge("down", "up speed")


def do_speedtest():
    yes_pipe = subprocess.Popen(["yes", "Yes"], stdout=subprocess.PIPE)
    result = subprocess.run(["speedtest"], stdout=subprocess.PIPE, stdin=yes_pipe.stdout).stdout.decode("utf-8")
    yes_pipe.terminate()


@app.route("/metrics")
def metrics():
    res = []
    for k, v in graphs.items():
        res.append(prometheus_client.generate_latest(v))
    return Response(res, mimetype="text/plain")


app.run(host="0.0.0.0", port=81)
