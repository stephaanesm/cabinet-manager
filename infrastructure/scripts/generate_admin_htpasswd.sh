#!/bin/bash
# ==============================================================================
# CABINET MANAGER — generate_admin_htpasswd.sh
# 2.4 API Gateway & sécurité réseau
# Génère traefik/admin_htpasswd (utilisé par le middleware "admin-auth") sans
# dépendre du paquet apache2-utils, via openssl (format APR1, supporté par Traefik).
#
# Usage : ./generate_admin_htpasswd.sh <utilisateur> <mot_de_passe>
# ==============================================================================
set -euo pipefail

if [ $# -ne 2 ]; then
    echo "Usage: $0 <utilisateur> <mot_de_passe>"
    exit 1
fi

USERNAME="$1"
PASSWORD="$2"
OUTPUT_FILE="$(dirname "$0")/../traefik/admin_htpasswd"

HASH=$(openssl passwd -apr1 "$PASSWORD")
echo "${USERNAME}:${HASH}" > "$OUTPUT_FILE"

echo "[generate_admin_htpasswd] Fichier généré : ${OUTPUT_FILE}"
echo "[generate_admin_htpasswd] Redémarrer Traefik pour prise en compte : docker compose restart traefik"
