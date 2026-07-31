/**
 * src/lib/fileViewerManager.ts
 * Gestionnaire de Téléchargement Direct & Aperçu via Application Compatible Externe.
 *
 * Deux fonctions principales :
 *   apercuAvecAppCompatible()   — Télécharge en cache puis ouvre via le sélecteur d'apps
 *                                  natif (Adobe Acrobat, Word, Google Docs, Galerie…)
 *   telechargerDansTelephone()  — Enregistre dans le dossier Téléchargements de l'appareil
 *
 * MIME types gérés automatiquement depuis le nom de fichier (getMimeType).
 */

import { getAccessToken } from '@/lib/secureStorage';
import {
  cacheDirectory,
  downloadAsync,
  getInfoAsync,
  StorageAccessFramework,
  readAsStringAsync,
  EncodingType,
} from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { Alert, Platform } from 'react-native';

// ── Détection MIME depuis le nom du fichier ───────────────────────────────────

export function getMimeType(fileName: string): string {
  const lower = (fileName || '').toLowerCase();
  if (lower.endsWith('.pdf'))                        return 'application/pdf';
  if (lower.endsWith('.doc'))                        return 'application/msword';
  if (lower.endsWith('.docx'))                       return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
  if (lower.endsWith('.xls'))                        return 'application/vnd.ms-excel';
  if (lower.endsWith('.xlsx'))                       return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
  if (lower.endsWith('.ppt') || lower.endsWith('.pptx')) return 'application/vnd.ms-powerpoint';
  if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) return 'image/jpeg';
  if (lower.endsWith('.png'))                        return 'image/png';
  if (lower.endsWith('.gif'))                        return 'image/gif';
  if (lower.endsWith('.webp'))                       return 'image/webp';
  if (lower.endsWith('.txt'))                        return 'text/plain';
  if (lower.endsWith('.csv'))                        return 'text/csv';
  if (lower.endsWith('.zip'))                        return 'application/zip';
  if (lower.endsWith('.rar'))                        return 'application/x-rar-compressed';
  if (lower.endsWith('.mp4'))                        return 'video/mp4';
  if (lower.endsWith('.mp3'))                        return 'audio/mpeg';
  return 'application/octet-stream';
}

function getUTI(mimeType: string): string {
  if (mimeType === 'application/pdf')  return 'com.adobe.pdf';
  if (mimeType.startsWith('image/'))   return 'public.image';
  if (mimeType.startsWith('video/'))   return 'public.movie';
  if (mimeType.startsWith('audio/'))   return 'public.audio';
  if (mimeType.startsWith('text/'))    return 'public.plain-text';
  return 'public.data';
}

// ── Téléchargement sécurisé en cache local ────────────────────────────────────

async function downloadToCache(
  fileUrl: string,
  fileName: string
): Promise<string> {
  const token     = await getAccessToken();
  const safeFileName = fileName.replace(/[^a-zA-Z0-9._\-]/g, '_');
  const localUri  = `${cacheDirectory ?? 'file:///'}${safeFileName}`;

  const result = await downloadAsync(fileUrl, localUri, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });

  if (result.status !== 200) {
    throw new Error(`Erreur serveur HTTP ${result.status} lors du téléchargement.`);
  }

  const info = await getInfoAsync(result.uri);
  if (!info.exists) {
    throw new Error('Le fichier téléchargé est introuvable en cache local.');
  }

  return result.uri;
}

// ── 1. APERÇU VIA UNE APPLICATION COMPATIBLE EXTERNE ─────────────────────────
//   Adobe Acrobat, Word, Excel, Galerie, VLC, etc.
//   L'OS présente le sélecteur d'applications qui peuvent ouvrir ce type de fichier.

export async function apercuAvecAppCompatible(
  fileUrl: string,
  fileName: string,
  mimeTypeHint?: string
): Promise<void> {
  const mime = mimeTypeHint && mimeTypeHint !== 'application/octet-stream'
    ? mimeTypeHint
    : getMimeType(fileName);

  try {
    const localUri  = await downloadToCache(fileUrl, fileName);
    const canShare  = await Sharing.isAvailableAsync();

    if (canShare) {
      await Sharing.shareAsync(localUri, {
        mimeType:    mime,
        dialogTitle: `Ouvrir "${fileName}" avec…`,
        UTI:         getUTI(mime),
      });
    } else {
      Alert.alert(
        '📄 Fichier prêt',
        `Le fichier "${fileName}" est en cache local.\n\n${localUri}`,
        [{ text: 'OK' }]
      );
    }
  } catch (err: any) {
    Alert.alert(
      'Impossible d\'ouvrir le fichier',
      err?.message ?? 'Une erreur inattendue est survenue.'
    );
  }
}

// ── 2. TÉLÉCHARGEMENT DANS LES FICHIERS DU TÉLÉPHONE ─────────────────────────
//   Android : StorageAccessFramework → dossier choisi par l'utilisateur
//   iOS     : "Enregistrer dans Fichiers" via l'interface système

export async function telechargerDansTelephone(
  fileUrl: string,
  fileName: string,
  mimeTypeHint?: string
): Promise<void> {
  const mime = mimeTypeHint && mimeTypeHint !== 'application/octet-stream'
    ? mimeTypeHint
    : getMimeType(fileName);

  try {
    const tempUri = await downloadToCache(fileUrl, fileName);

    // ── Android : StorageAccessFramework ──────────────────────────────────
    if (Platform.OS === 'android') {
      try {
        const permissions = await StorageAccessFramework.requestDirectoryPermissionsAsync();
        if (permissions.granted) {
          const safeFileName = fileName.replace(/[^a-zA-Z0-9._\-]/g, '_');
          const fileContent  = await readAsStringAsync(tempUri, { encoding: EncodingType.Base64 });
          const newFileUri   = await StorageAccessFramework.createFileAsync(
            permissions.directoryUri,
            safeFileName,
            mime
          );
          await StorageAccessFramework.writeAsStringAsync(newFileUri, fileContent, {
            encoding: EncodingType.Base64,
          });
          Alert.alert(
            '✅ Téléchargement réussi',
            `"${fileName}" a été enregistré dans le dossier sélectionné.`
          );
          return;
        }
        // L'utilisateur a refusé la permission du dossier → on bascule sur le partage
      } catch {
        // SAF non disponible → fallback
      }
    }

    // ── iOS & Fallback Android : interface "Enregistrer dans Fichiers" ────
    const canShare = await Sharing.isAvailableAsync();
    if (canShare) {
      await Sharing.shareAsync(tempUri, {
        mimeType:    mime,
        dialogTitle: `Enregistrer "${fileName}" dans vos Fichiers`,
        UTI:         getUTI(mime),
      });
    } else {
      Alert.alert(
        '✅ Téléchargement réussi',
        `Fichier disponible en cache local : ${tempUri}`
      );
    }
  } catch (err: any) {
    Alert.alert(
      'Impossible de télécharger le fichier',
      err?.message ?? 'Une erreur inattendue est survenue.'
    );
  }
}
