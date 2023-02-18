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
graphs["up"] = Gauge("speedtest_up_megabytes_per_second", "speedtest upload result in mbps")
graphs["down"] = Gauge("speedtest_down_megabytes_per_second", "speedtest download result in mbps")
graphs["loss"] = Gauge("speedtest_loss_percent", "speedtest packet loss result in percent")
graphs["lat"] = Gauge("speedtest_lat_milliseconds", "speedtest idle latency result in ms")


def parse_result(result):
    lat_split = result[result.find("Idle Latency:") :].splitlines()[0].split(" ")
    lat_ms = float(lat_split[lat_split.index("ms") - 1])

    down_split = result[result.find("Download:") :].splitlines()[0].split(" ")
    down_mbps = float(down_split[down_split.index("Mbps") - 1])

    up_split = result[result.find("Upload:") :].splitlines()[0].split(" ")
    up_mbps = float(up_split[up_split.index("Mbps") - 1])

    loss_split = result[result.find("Packet Loss:") :].splitlines()[0].split(" ")
    loss_pct = float(loss_split[-1][:-1])

    return lat_ms, down_mbps, up_mbps, loss_pct


def do_speedtest():
    global last_speedtest_datetime
    sec_since_last = (datetime.now() - last_speedtest_datetime).total_seconds()
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
    speedtest_result = do_speedtest()
    if speedtest_result == False:
        res = make_response("", 423)
        return res
    lat_ms, down_mbps, up_mbps, loss_pct = parse_result(speedtest_result)
    graphs["lat"].set(lat_ms)
    graphs["down"].set(down_mbps)
    graphs["up"].set(up_mbps)
    graphs["loss"].set(loss_pct)

    res = []
    for k, v in graphs.items():
        res.append(prometheus_client.generate_latest(v))
    return Response(res, mimetype="text/plain")


app.run(host="0.0.0.0", port=3000)
