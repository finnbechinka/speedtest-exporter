const express = require("express");
const path = require("path");
const client = require("prom-client");
const { promisify } = require("util");
const exec = promisify(require("child_process").exec);

const PORT = 3000;
const HOST = "0.0.0.0";
let last_speedtest_timestamp = Date.now() - Date.now();

const up = new client.Gauge({
  name: "speedtest_up_megabits_per_second",
  help: "speedtest upload result in Mbps",
});
const down = new client.Gauge({
  name: "speedtest_down_megabits_per_second",
  help: "speedtest download result in Mbps",
});
const loss = new client.Gauge({
  name: "speedtest_loss_percent",
  help: "speedtest packet loss result in percent",
});
const lat = new client.Gauge({
  name: "speedtest_lat_milliseconds",
  help: "speedtest idle latency result in ms",
});
const jitter = new client.Gauge({
  name: "speedtest_jitter_milliseconds",
  help: "speedtest idle jitter result in ms",
});

function log(message) {
  console.log("[" + new Date().toISOString() + "] " + message);
}

function update_metrics(measurements) {
  up.set(measurements.up_megabit_per_second);
  down.set(measurements.down_megabit_per_second);
  loss.set(measurements.packet_loss_percent);
  lat.set(measurements.latency_miliseconds);
  jitter.set(measurements.jitter_miliseconds);
}

function parse_result(result) {
  try {
    parsed = JSON.parse(result);
    if (parsed["error"]) {
      log("SPEEDTEST ERROR: " + parsed["error"]);
    }
    if (parsed["type"] == "log") {
      log("SPEEDTEST LOG: " + parsed["level"] + ": " + parsed["message"]);
      console.log("complete output:\n" + parsed);
    }
    if (parsed["type"] == "result") {
      measurements = {
        down_megabit_per_second: parsed["download"]["bandwidth"] / 125000,
        up_megabit_per_second: parsed["upload"]["bandwidth"] / 125000,
        packet_loss_percent: parsed["packetLoss"],
        latency_miliseconds: parsed["ping"]["latency"],
        jitter_miliseconds: parsed["ping"]["jitter"],
      };
      return measurements;
    }
    log("ERROR: unable to handle result format");
  } catch (e) {
    log("ERROR: unable to parse speedtest result");
  }

  return false;
}

async function do_speedtest() {
  sec_since_last = (Date.now() - last_speedtest_timestamp) / 1000;
  if (sec_since_last < 60) {
    return false;
  }
  result = await exec("speedtest -f json-pretty --accept-license --accept-gdpr");
  last_speedtest_timestamp = Date.now();
  return result.stdout.trim();
}

const app = express();

app.get("/", (req, res) => {
  return res.sendFile(path.join(__dirname, "/index.html"));
});

app.get("/metrics", async (req, res) => {
  result = await do_speedtest();
  if (!result) {
    res.status(423);
    return res.send();
  }
  const measurements = parse_result(result);
  if (!measurements){
    res.status(500);
    return res.send();
  } 
  update_metrics(measurements);
  res.set("Content-Type", client.register.contentType);
  return res.send(await client.register.metrics());
});
app.listen(PORT);
log("INFO: listening on port " + PORT);
