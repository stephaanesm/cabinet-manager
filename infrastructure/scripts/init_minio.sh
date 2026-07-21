#!/bin/sh
# ==============================================================================
# CABINET MANAGER — init_minio.sh
# 2.3 Stockage documentaire — initialisation des buckets, politiques et accès
#
# Exécuté une seule fois par le service "minio-init" au premier démarrage.
# ==============================================================================
set -e

echo "[minio-init] Connexion au serveur MinIO..."
mc alias set local http://minio:9000 "${MINIO_ROOT_USER}" "${MINIO_ROOT_PASSWORD}"

echo "[minio-init] Création des buckets..."
mc mb --ignore-existing local/cabinet-manager-documents   # GED : contrats, pièces, jugements
mc mb --ignore-existing local/db-backups                  # sauvegardes PostgreSQL (2.2)

echo "[minio-init] Activation du chiffrement au repos (SSE) sur les buckets..."
mc encrypt set sse-s3 local/cabinet-manager-documents
mc encrypt set sse-s3 local/db-backups

echo "[minio-init] Application de la politique d'accès sur le bucket documents..."
mc anonymous set none local/cabinet-manager-documents      # aucun accès anonyme/public
mc admin policy create local cm-documents-policy /policies/bucket-policy.json

echo "[minio-init] Application de la politique de cycle de vie..."
mc ilm import local/db-backups < /policies/lifecycle-policy.json

echo "[minio-init] Création de la clé d'accès applicative dédiée (jamais le compte root)..."
mc admin user add local "${APP_ACCESS_KEY}" "${APP_SECRET_KEY}" || true
mc admin policy attach local cm-documents-policy --user "${APP_ACCESS_KEY}"

echo "[minio-init] Activation du versionnement (protection contre l'écrasement accidentel)..."
mc version enable local/cabinet-manager-documents

echo "[minio-init] Initialisation MinIO terminée avec succès."
