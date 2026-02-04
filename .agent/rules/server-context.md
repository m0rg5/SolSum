---
name: "server-context"
description: "Linode server details including IP, OS, service users, and directory structure for abs.morgs.dev"
---
# Server Context: Linode Instance (abs.morgs.dev)

This document contains persistent context regarding the server environment for the Linode instance supporting `abs.morgs.dev`.

## System Overview
- **Provider**: Linode
- **Linode ID**: 75626378
- **Primary Domain**: [abs.morgs.dev](https://abs.morgs.dev)
- **IPv4 Address**: `172.105.176.28`
- **Operating System**: Ubuntu 24.04.3 LTS (Verified)
- **Primary Admin User**: `root`
- **Service User Host ID/GID**: 1000 (Standard user for containers/non-root services)

## Networking & Security
- **Firewall**: UFW (Active)
- **External Firewall**: Linode Cloud Firewall
- **Open Ports**:
    - `22` (SSH)
    - `80` (HTTP)
    - `443` (HTTPS)

## Core Services
- **Containerization**: Docker 28.4.0, Docker Compose v2.39.1
- **Web Server**: Nginx (Reverse Proxy)
- **SSL**: Certbot (Let's Encrypt)

## Important Paths

### Application Base
- **ABS Config Base**: `/opt/abs`
- **ABS Docker Config**: `/opt/abs/config`
- **ABS Compose File**: `/opt/abs/docker-compose.yml`

### Media Storage
- **Audiobook Media**: `/srv/audiobooks`
- **Podcast Media**: `/srv/podcasts`

### Configuration
- **Nginx Config**: `/etc/nginx/sites-available/abs.morgs.dev`
- **Certbot Live**: `/etc/letsencrypt/live/abs.morgs.dev/`
- **Certbot Renewal**: `/etc/letsencrypt/renewal/abs.morgs.dev.conf`
