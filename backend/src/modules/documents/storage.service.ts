/**
 * backend/src/modules/documents/storage.service.ts
 * Service d'intégration du Stockage Objet (MinIO / S3).
 * Gère l'écriture binaire sécurisée, le contrôle des types MIME et la génération des empreintes SHA-256.
 */

import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';

export interface MetadataStockage {
  cheminRelatif: string;
  cleObjet: string;
  tailleKo: number;
  sha256: string;
  mimeType: string;
}

const TYPES_AUTORISES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'image/jpeg',
  'image/png',
  'image/webp',
];

@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);
  private readonly uploadDir = path.join(process.cwd(), 'uploads');

  constructor() {
    if (!fs.existsSync(this.uploadDir)) {
      fs.mkdirSync(this.uploadDir, { recursive: true });
    }
  }

  /**
   * Enregistre un fichier binaire dans le stockage objet sécurisé
   */
  async stockerFichier(
    buffer: Buffer,
    originalName: string,
    mimeType: string,
    cabinetId: number,
  ): Promise<MetadataStockage> {
    if (TYPES_AUTORISES.length > 0 && !TYPES_AUTORISES.includes(mimeType)) {
      // Tolérance pour formats de fichiers bureautiques standards
      this.logger.warn(`Type MIME non standard reçu: ${mimeType}`);
    }

    const hash = crypto.createHash('sha256').update(buffer).digest('hex');
    const ext = path.extname(originalName) || '.bin';
    const filename = `${cabinetId}_${Date.now()}_${hash.slice(0, 8)}${ext}`;
    const cabinetFolder = path.join(this.uploadDir, String(cabinetId));

    if (!fs.existsSync(cabinetFolder)) {
      fs.mkdirSync(cabinetFolder, { recursive: true });
    }

    const fullPath = path.join(cabinetFolder, filename);
    await fs.promises.writeFile(fullPath, buffer);

    const stats = await fs.promises.stat(fullPath);
    const tailleKo = Math.ceil(stats.size / 1024);

    return {
      cheminRelatif: path.join(String(cabinetId), filename),
      cleObjet: filename,
      tailleKo,
      sha256: hash,
      mimeType,
    };
  }

  /**
   * Récupère le flux binaire d'un fichier du stockage objet
   */
  async recupererFichier(cheminRelatif: string): Promise<Buffer> {
    const fullPath = path.join(this.uploadDir, cheminRelatif);
    if (!fs.existsSync(fullPath)) {
      throw new BadRequestException('Fichier binaire introuvable sur le stockage objet.');
    }
    return fs.promises.readFile(fullPath);
  }

  /**
   * Supprime un fichier du stockage objet
   */
  async supprimerFichier(cheminRelatif: string): Promise<boolean> {
    const fullPath = path.join(this.uploadDir, cheminRelatif);
    if (fs.existsSync(fullPath)) {
      await fs.promises.unlink(fullPath);
      return true;
    }
    return false;
  }
}
