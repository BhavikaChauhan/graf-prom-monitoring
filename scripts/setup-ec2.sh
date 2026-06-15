#!/bin/bash
# ================================================================
# Setup monitoring stack on EC2 t2.micro
# Run on fresh Ubuntu 22.04
# ================================================================
set -e

echo "🚀 Setting up Grafana + Prometheus monitoring stack..."

# System update
apt-get update -y

# Install Docker
apt-get install -y ca-certificates curl gnupg
install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
chmod a+r /etc/apt/keyrings/docker.gpg
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null
apt-get update -y
apt-get install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin
systemctl start docker && systemctl enable docker
usermod -aG docker ubuntu

echo "✅ Docker installed"

# Open required ports in UFW
apt-get install -y ufw
ufw --force reset
ufw default deny incoming
ufw default allow outgoing
ufw allow ssh
ufw allow 3000/tcp   # App
ufw allow 3001/tcp   # Grafana
ufw allow 9090/tcp   # Prometheus
ufw allow 9093/tcp   # Alertmanager
ufw --force enable

echo "✅ Firewall configured"
echo ""
echo "✅ Setup complete! Now:"
echo "   1. Upload your project files to this server"
echo "   2. Add your Slack webhook to alertmanager/alertmanager.yml"
echo "   3. Run: docker compose up -d"
echo "   4. Open Grafana at http://\$(curl -s ifconfig.me):3001"
