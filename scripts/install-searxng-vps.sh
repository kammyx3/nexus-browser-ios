#!/usr/bin/env bash
set -euo pipefail

DOMAIN="${SEARXNG_DOMAIN:-80-190-72-122.sslip.io}"
SEARCH_USER="${SEARCH_USER:-nexus}"
SEARCH_PASSWORD="${SEARCH_PASSWORD:?Set SEARCH_PASSWORD to a strong password}"

if [[ "$(id -u)" != 0 ]]; then echo "Run as root" >&2; exit 1; fi
if [[ ! "$SEARCH_USER" =~ ^[A-Za-z0-9._-]+$ ]]; then echo "Invalid username" >&2; exit 1; fi
if [[ ${#SEARCH_PASSWORD} -lt 16 ]]; then echo "Password must be at least 16 characters" >&2; exit 1; fi

apt-get update
DEBIAN_FRONTEND=noninteractive apt-get install -y docker.io docker-compose-v2 certbot python3-certbot-nginx apache2-utils openssl
systemctl enable --now docker nginx

install -d -m 0750 /opt/nexus-searxng
secret="$(openssl rand -hex 32)"
cat >/opt/nexus-searxng/settings.yml <<EOF
use_default_settings: true
server:
  bind_address: "0.0.0.0"
  port: 8080
  secret_key: "$secret"
  limiter: false
  image_proxy: true
search:
  safe_search: 0
  formats:
    - html
    - json
EOF

cat >/opt/nexus-searxng/compose.yml <<'EOF'
services:
  searxng:
    image: docker.io/searxng/searxng:latest
    container_name: nexus-searxng
    restart: unless-stopped
    ports:
      - "127.0.0.1:8888:8080"
    volumes:
      - ./settings.yml:/etc/searxng/settings.yml:ro
    environment:
      - SEARXNG_BASE_URL=https://${SEARXNG_DOMAIN}/
EOF
sed -i "s/\${SEARXNG_DOMAIN}/${DOMAIN}/g" /opt/nexus-searxng/compose.yml

htpasswd -bc /etc/nginx/.nexus-search.htpasswd "$SEARCH_USER" "$SEARCH_PASSWORD"
cat >/etc/nginx/sites-available/nexus-search <<EOF
limit_req_zone \$binary_remote_addr zone=nexus_search:10m rate=30r/m;
server {
  listen 80;
  listen [::]:80;
  server_name $DOMAIN;
  location /.well-known/acme-challenge/ { root /var/www/html; }
  location / { return 301 https://\$host\$request_uri; }
}
EOF
ln -sf /etc/nginx/sites-available/nexus-search /etc/nginx/sites-enabled/nexus-search
nginx -t
systemctl reload nginx

certbot certonly --webroot -w /var/www/html --non-interactive --agree-tos --register-unsafely-without-email -d "$DOMAIN"

cat >/etc/nginx/sites-available/nexus-search <<EOF
limit_req_zone \$binary_remote_addr zone=nexus_search:10m rate=30r/m;
server {
  listen 80;
  listen [::]:80;
  server_name $DOMAIN;
  location /.well-known/acme-challenge/ { root /var/www/html; }
  location / { return 301 https://\$host\$request_uri; }
}
server {
  listen 443 ssl http2;
  listen [::]:443 ssl http2;
  server_name $DOMAIN;
  ssl_certificate /etc/letsencrypt/live/$DOMAIN/fullchain.pem;
  ssl_certificate_key /etc/letsencrypt/live/$DOMAIN/privkey.pem;
  ssl_protocols TLSv1.2 TLSv1.3;
  client_max_body_size 1m;
  location / {
    auth_basic "Nexus Private Search";
    auth_basic_user_file /etc/nginx/.nexus-search.htpasswd;
    limit_req zone=nexus_search burst=20 nodelay;
    proxy_set_header Host \$host;
    proxy_set_header X-Real-IP \$remote_addr;
    proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto https;
    proxy_pass http://127.0.0.1:8888;
  }
}
EOF

cd /opt/nexus-searxng
docker compose pull
docker compose up -d
nginx -t
systemctl reload nginx
sleep 4
curl -fsS -u "$SEARCH_USER:$SEARCH_PASSWORD" "https://$DOMAIN/search?q=nexus&format=json" >/dev/null
echo "SearXNG ready at https://$DOMAIN"
