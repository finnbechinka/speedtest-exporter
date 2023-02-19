# Speedtest Exporter

Exposes a "/metrics" endpoint on port 3000 internally that when called performs a speedtest (min intervall 60s) and returns up/down bandwidth, loss and idle latency metrics. 