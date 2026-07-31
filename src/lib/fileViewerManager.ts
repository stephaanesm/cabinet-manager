/**
 * src/lib/fileViewerManager.ts
 * Gestionnaire de Téléchargement Direct & Aperçu via Application Compatible Externe.
 */

import { getAccessToken } from '@/lib/secureStorage';
import { downloadAsync, getInfoAsync, cacheDirectory, StorageAccessFramework, readAsStringAsync, EncodingType } from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { Alert, Platform } from 'react-native';

/**
 * 1. APERÇU VIA UNE APPLICATION COMPATIBLE EXTERNE (Adobe Acrobat, Word, Galerie, etc.)
 */
export async function apercuAvecAppCompatible(
  fileUrl: string,
  fileName: string,
  mimeType: string = 'application/pdf'
) {
  try {
    const token = await getAccessToken();
    const safeFileName = fileName.replace(/[^a-zA-Z0-9._\-]/g, '_');
    const localUri = `${cacheDirectory ?? 'file:///'}${safeFileName}`;

    // Téléchargement sécurisé en cache local avec Bearer Token
    const downloadResult = await downloadAsync(fileUrl, localUri, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });

    if (downloadResult.status !== 200) {
      throw new Error(`Code erreur serveur ${downloadResult.status}`);
    }

    const info = await getInfoAsync(downloadResult.uri);
    if (!info.exists) {
      throw new Error('Le fichier téléchargé n\'a pas pu être trouvé.');
    }

    // Ouverture immédiate via le sélecteur d'applications compatibles du téléphone
    const canShare = await Sharing.isAvailableAsync();
    if (canShare) {
      await Sharing.shareAsync(downloadResult.uri, {
        mimeType: mimeType || 'application/octet-stream',
        dialogTitle: `Ouvrir "${fileName}" avec une application...`,
        UTI: mimeType === 'application/pdf' ? 'com.adobe.pdf' : 'public.data',
      });
    } else {
      Alert.alert('Fichier prêt', `Le fichier est disponible : ${downloadResult.uri}`);
    }
  } catch (err: any) {
    Alert.alert('Erreur Aperçu', err?.message ?? 'Impossible d\'ouvrir le fichier avec une application compatible.');
  }
}

/**
 * 2. TÉLÉCHARGEMENT DIRECT DANS LES FICHIERS DU TÉLÉPHONE (Dossier Téléchargements / Stockage)
 */
export async function telechargerDansTelephone(
  fileUrl: string,
  fileName: string,
  mimeType: string = 'application/pdf'
) {
  try {
    const token = await getAccessToken();
    const safeFileName = fileName.replace(/[^a-zA-Z0-9._\-]/g, '_');
    const tempUri = `${cacheDirectory ?? 'file:///'}${safeFileName}`;

    // Téléchargement temporaire en mémoire/cache
    const downloadResult = await downloadAsync(fileUrl, tempUri, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });

    if (downloadResult.status !== 200) {
      throw new Error(`Code serveur ${downloadResult.status}`);
    }

    // Android : utilisation de StorageAccessFramework si disponible pour sauvegarder dans Téléchargements
    if (Platform.OS === 'android') {
      try {
        const permissions = await StorageAccessFramework.requestDirectoryPermissionsAsync();
        if (permissions.granted) {
          const fileContent = await readAsStringAsync(downloadResult.uri, { encoding: EncodingType.Base64 });
          const newFileUri = await StorageAccessFramework.createFileAsync(
            permissions.directoryUri,
            safeFileName,
            mimeType || 'application/pdf'
          );
          await StorageAccessFramework.writeAsStringAsync(newFileUri, fileContent, { encoding: EncodingType.Base64 });
          Alert.alert('✅ Téléchargement réussi', `"${fileName}" a été enregistré dans le dossier sélectionné de votre téléphone.`);
          return;
        }
      } catch {
        // Fallback vers le sélecteur d'enregistrement natif
      }
    }

    // iOS & Fallback Android : Enregistrer dans les Fichiers via l'interface système
    const canShare = await Sharing.isAvailableAsync();
    if (canShare) {
      await Sharing.shareAsync(downloadResult.uri, {
        mimeType: mimeType || 'application/octet-stream',
        dialogTitle: `Enregistrer "${fileName}" dans vos Fichiers`,
        UTI: mimeType === 'application/pdf' ? 'com.adobe.pdf' : 'public.data',
      });
      Alert.alert('✅ Téléchargement réussi', `"${fileName}" est prêt à être enregistré dans votre téléphone.`);
    } else {
      Alert.alert('✅ Téléchargement réussi', `Fichier enregistré sous : ${downloadResult.uri}`);
    }
  } catch (err: any) {
    Alert.alert('Erreur de Téléchargement', err?.message ?? 'Impossible d\'enregistrer le fichier dans le téléphone.');
  }
}
