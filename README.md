# 📊 Full Monitoring Stack — Grafana + Prometheus + Alertmanager

![Grafana](https://img.shields.io/badge/Dashboards-Grafana_10-F46800?style=flat&logo=grafana&logoColor=white)
![Prometheus](https://img.shields.io/badge/Metrics-Prometheus-E6522C?style=flat&logo=prometheus&logoColor=white)
![Docker](https://img.shields.io/badge/Deploy-Docker_Compose-2496ED?style=flat&logo=docker&logoColor=white)
![Slack](https://img.shields.io/badge/Alerts-Slack-4A154B?style=flat&logo=slack&logoColor=white)

Production monitoring stack with **custom app metrics, infra dashboards, SLO tracking, and Slack alerting** — deployed in one command via Docker Compose on AWS EC2.

> 🎯 **Portfolio demo** — this is exactly what I deliver to clients as a Monitoring & Alerting Setup service.

---

## 📐 Architecture

```
┌─────────────────────────────────────────────────────┐
│                  EC2 t2.micro                       │
│                                                     │
│  ┌──────────────┐     scrapes      ┌─────────────┐ │
│  │  Node.js App │ ◄──────────────  │ Prometheus  │ │
│  │  :3000       │  /metrics        │ :9090       │ │
│  │              │                  │             │ │
│  │  Custom      │  ┌─────────────► │ Evaluates   │ │
│  │  metrics:    │  │  scrapes      │ alert rules │ │
│  │  - req rate  │  │               └──────┬──────┘ │
│  │  - latency   │  │                      │ fires  │
│  │  - errors    │  │               ┌──────▼──────┐ │
│  │  - orders    │  │               │Alertmanager │ │
│  └──────────────┘  │               │ :9093       │ │
│                    │               └──────┬──────┘ │
│  ┌─────────────┐   │                      │        │
│  │Node Exporter│───┘               Slack  │        │
│  │ :9100       │   scrapes         webhook▼        │
│  │ CPU/RAM/disk│                  #alerts channel  │
│  └─────────────┘                                   │
│                    reads          ┌─────────────┐  │
│  ┌─────────────┐ ◄──────────────  │   Grafana   │  │
│  │  cAdvisor   │   container      │   :3001     │  │
│  │  :8080      │   metrics        │             │  │
│  │  Docker     │                  │  Dashboards:│  │
│  │  metrics    │                  │  - App & Infra│ │
│  └─────────────┘                  │  - SLO      │  │
│                                   └─────────────┘  │
└─────────────────────────────────────────────────────┘
```

---

## ✨ What's Included

| Component | Purpose |
|---|---|
| **Node.js App** | Sample app with custom Prometheus metrics (req rate, latency, errors, orders) |
| **Prometheus** | Scrapes all targets every 15s, stores 15 days of data |
| **Grafana** | 2 pre-built dashboards — App+Infra and SLO — auto-loaded on startup |
| **Alertmanager** | Routes critical vs warning alerts to different Slack channels |
| **Node Exporter** | Host metrics — CPU, RAM, disk, network |
| **cAdvisor** | Docker container metrics — per-container CPU/memory |
| **Load Test script** | Generates realistic traffic for portfolio screenshots |

---

## 🚀 Run Locally (2 minutes)

```bash
git clone https://github.com/BhavikaChauhan/grafana-prometheus-monitoring
cd grafana-prometheus-monitoring

docker compose up -d

# Wait ~30 seconds for everything to start
docker compose ps   # All should show "running"
```

Open:
- **Grafana:** http://localhost:3001 → login: `admin` / `admin`
- **Prometheus:** http://localhost:9090
- **App metrics:** http://localhost:3000/metrics
- **Alertmanager:** http://localhost:9093

---

## 📸 Generate Dashboard Data (for screenshots)

```bash
# Terminal 1 — start the stack
docker compose up -d

# Terminal 2 — run load test (generates 5 min of realistic traffic)
cd apps/node-app
npm install
node load-test.js

# While it runs, open Grafana and watch the dashboards fill up
# Take your screenshots when load test is running
```

---

## 🔔 Set Up Slack Alerts

1. Go to **api.slack.com/apps → Create App → Incoming Webhooks**
2. Add webhook to your workspace, copy the URL
3. Edit `alertmanager/alertmanager.yml` — replace `YOUR_SLACK_WEBHOOK_URL`
4. Create two Slack channels: `#alerts` and `#alerts-critical`
5. Restart alertmanager: `docker compose restart alertmanager`

Test it fires:
```bash
# Stop the app — triggers AppDown alert within 1 minute
docker compose stop node-app
# Check Slack for the alert, then bring it back
docker compose start node-app
```

---

## ☁️ Deploy to EC2 (Live Demo)

```bash
# 1. Launch EC2 t2.micro (Ubuntu 22.04), open ports 3000,3001,9090,9093

# 2. SSH in and run setup
scp -i key.pem scripts/setup-ec2.sh ubuntu@<EC2_IP>:~/
ssh -i key.pem ubuntu@<EC2_IP>
chmod +x setup-ec2.sh && sudo ./setup-ec2.sh

# 3. Upload project
scp -i key.pem -r . ubuntu@<EC2_IP>:~/grafana-prometheus-monitoring/

# 4. Start the stack
ssh -i key.pem ubuntu@<EC2_IP>
cd grafana-prometheus-monitoring
docker compose up -d

# 5. Open Grafana
# http://<EC2_IP>:3001  →  admin / admin
```

---

## 📊 Dashboards

**App & Infrastructure Dashboard**
- App status (UP/DOWN)
- Request rate (RPS)
- Error rate %
- p50/p95/p99 latency
- Orders processed (success vs failed)
- CPU and memory over time

**SLO Dashboard**
- Availability gauge (target: 99.9%)
- Error rate gauge (target: < 1%)
- p95 latency gauge (target: < 500ms)
- Error budget remaining
- 24h uptime rolling window

---

## 🚨 Alert Rules

| Alert | Condition | Severity |
|---|---|---|
| AppDown | App unreachable for 1 min | Critical |
| HighCPUUsage | CPU > 80% for 2 min | Warning |
| CriticalCPUUsage | CPU > 95% for 1 min | Critical |
| HighMemoryUsage | Memory > 85% for 2 min | Warning |
| DiskSpaceLow | Disk < 15% for 5 min | Warning |
| HighErrorRate | Error rate > 5% for 2 min | Warning |
| SlowResponseTime | p95 > 1s for 3 min | Warning |
| SLOErrorBudgetBurning | Error rate > 1% over 1h | Critical |

---
