const express = require("express");
const path = require("path");
const client = require("prom-client");
const { promisify } = require("util");
const exec = promisify(require("child_process").exec);

const PORT = 3000;
const HOST = "0.0.0.0";
let last_speedtest_timestamp = Date.now() - Date.now();

const up = new client.Gauge({
  name: "speedtest_up_megabytes_per_second",
  help: "speedtest upload result in mbps",
});
const down = new client.Gauge({
  name: "speedtest_down_megabytes_per_second",
  help: "speedtest download result in mbps",
});
const loss = new client.Gauge({
  name: "speedtest_loss_percent",
  help: "speedtest packet loss result in percent",
});
const lat = new client.Gauge({
  name: "speedtest_lat_milliseconds",
  help: "speedtest idle latency result in ms",
});

function parse_result(result) {
  lat_split = result.slice(result.search("Idle Latency:"), result.length).split("\n")[0].split(" ");
  lat_ms = Number(lat_split[lat_split.indexOf("ms") - 1]);

  down_split = result.slice(result.search("Download:"), result.length).split("\n")[0].split(" ");
  down_mbps = Number(down_split[down_split.indexOf("Mbps") - 1]);

  up_split = result.slice(result.search("Upload:"), result.length).split("\n")[0].split(" ");
  up_mbps = Number(up_split[up_split.indexOf("Mbps") - 1]);

  loss_split = result.slice(result.search("Packet Loss:"), result.length).split("\n")[0].split(" ");
  loss_pct = Number(
    loss_split[loss_split.length - 1].slice(0, loss_split[loss_split.length - 1].length - 1)
  );

  return { up_mbps, down_mbps, lat_ms, loss_pct };
}

async function do_speedtest() {
  sec_since_last = (Date.now() - last_speedtest_timestamp) / 1000;
  console.log(sec_since_last);
  if (sec_since_last < 60) {
    return false;
  }
  result = await exec("speedtest");
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
  const { up_mbps, down_mbps, loss_pct, lat_ms } = parse_result(result);
  up.set(up_mbps);
  down.set(down_mbps);
  loss.set(loss_pct);
  lat.set(lat_ms);
  res.set("Content-Type", client.register.contentType);
  return res.send(await client.register.metrics());
});
app.listen(PORT);
console.log("listening on port " + PORT);
