# LiveKit self-host runbook (single VPS)

## 0. DNS

`livekit.azenion.com` → A record → VPS public IP. Verify: `dig +short livekit.azenion.com`.

## 1. VPS prep (Ubuntu)

```bash
curl -fsSL https://get.docker.com | sh
sudo apt install -y ufw
sudo ufw allow OpenSSH
sudo ufw allow 80,443/tcp
sudo ufw allow 3478,7881/tcp
sudo ufw allow 50000:50100/udp
sudo ufw --force enable
mkdir -p ~/livekit && cd ~/livekit
```

## 2. Stack files

Copy `docker-compose.yml`, `livekit.yaml`, `Caddyfile`, `.env.example` here, then:

```bash
cp .env.example .env
nano .env  # paste LIVEKIT_SECRET (shown once at generation time)
docker compose up -d
sleep 8 && docker compose ps
docker compose logs --tail=30 livekit  # expect "starting LiveKit server"
```

## 3. Health check

```bash
curl -s -o /dev/null -w "%{http_code}\n" https://livekit.azenion.com
```

Non-5xx (typically 404) = TLS + proxy alive; 502 = Caddy can't reach livekit.

## 4. Updates

```bash
docker compose pull && docker compose up -d
```

## Notes

- Stateless: no backups needed (rooms vanish when empty, `empty_timeout: 300`).
- Strict-firewall fallback (TURN/TLS on 443) intentionally deferred — see `livekit.yaml`.
- App wiring (token route, client swap) is the next task, not this stack.
