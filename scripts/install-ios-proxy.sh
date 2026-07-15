#!/usr/bin/env bash
set -euo pipefail

DOMAIN="${PROXY_DOMAIN:-80-190-72-122.sslip.io}"
PROXY_USER="${PROXY_USER:-nexus}"
PROXY_PASSWORD="${PROXY_PASSWORD:-}"
GOST_VERSION="3.2.6"
GOST_SHA256="b39037b0380ea001fb3c0c28441c2e10bfc694f90682739a65b53e55dce5238b"

if [[ "$(id -u)" != "0" ]]; then echo "Run this installer as root." >&2; exit 1; fi
if [[ -z "$PROXY_PASSWORD" ]]; then echo "Set PROXY_PASSWORD to a long, unique password." >&2; exit 1; fi
if [[ ! "$PROXY_USER" =~ ^[A-Za-z0-9._-]+$ ]]; then echo "PROXY_USER contains unsupported characters." >&2; exit 1; fi
if [[ ! "$PROXY_PASSWORD" =~ ^[A-Za-z0-9._-]{16,}$ ]]; then echo "Use a password of 16+ letters, numbers, dots, underscores, or hyphens." >&2; exit 1; fi

apt-get update
DEBIAN_FRONTEND=noninteractive apt-get install -y ca-certificates certbot curl tar

if [[ ! -f "/etc/letsencrypt/live/$DOMAIN/fullchain.pem" ]]; then
  certbot certonly --webroot -w /var/www/html --non-interactive --agree-tos --register-unsafely-without-email -d "$DOMAIN"
fi

tmp="$(mktemp -d)"
trap 'rm -rf "$tmp"' EXIT
archive="$tmp/gost.tar.gz"
curl -fL --retry 3 -o "$archive" "https://github.com/go-gost/gost/releases/download/v${GOST_VERSION}/gost_${GOST_VERSION}_linux_amd64.tar.gz"
echo "$GOST_SHA256  $archive" | sha256sum -c -
tar -xzf "$archive" -C "$tmp"
install -m 0755 "$tmp/gost" /usr/local/bin/gost

cat >/etc/systemd/system/nexus-ios-proxy.service <<EOF
[Unit]
Description=Nexus iOS encrypted app-only proxy
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
ExecStart=/usr/local/bin/gost -L "https://${PROXY_USER}:${PROXY_PASSWORD}@:8443?cert=/etc/letsencrypt/live/${DOMAIN}/fullchain.pem&key=/etc/letsencrypt/live/${DOMAIN}/privkey.pem"
Restart=always
RestartSec=3
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=strict
ProtectHome=true
ReadOnlyPaths=/etc/letsencrypt

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable --now nexus-ios-proxy.service
if command -v ufw >/dev/null && ufw status | grep -q '^Status: active'; then ufw allow 8443/tcp; fi
systemctl --no-pager --full status nexus-ios-proxy.service

echo
echo "Nexus proxy ready"
echo "Server: $DOMAIN"
echo "Port: 8443"
echo "Username: $PROXY_USER"
echo "Enter the password you supplied in Nexus Settings."
