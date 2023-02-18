from flask import Response, Flask, make_response
import prometheus_client
from prometheus_client.core import CollectorRegistry
from prometheus_client import Summary, Counter, Histogram, Gauge
import time
import subprocess
from datetime import datetime

app = Flask(__name__)

_INF = float("inf")


last_speedtest_datetime = datetime.min

graphs = {}
graphs["up"] = Gauge("up", "up speed")
graphs["down"] = Gauge("down", "up speed")

def do_speedtest():
    global last_speedtest_datetime
    sec_since_last = (datetime.now() - last_speedtest_datetime).total_seconds()
    print(sec_since_last)
    if sec_since_last < 60:
        return False
    last_speedtest_datetime = datetime.now()
    yes_pipe = subprocess.Popen(["yes", "Yes"], stdout=subprocess.PIPE)
    result = subprocess.run(["speedtest"], stdout=subprocess.PIPE, stdin=yes_pipe.stdout).stdout.decode("utf-8")
    yes_pipe.terminate()
    return result

@app.route("/")
def home():
    result = do_speedtest()
    if result == False:
        res = make_response("", 423)
        return res
    res = make_response(result, 200)
    res.mimetype = "text/plain"
    return res


@app.route("/metrics")
def metrics():
    res = []
    for k, v in graphs.items():
        res.append(prometheus_client.generate_latest(v))
    return Response(res, mimetype="text/plain")


app.run(host="0.0.0.0", port=3001)
