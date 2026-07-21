/**
 * backend/src/modules/auth/two-factor.service.ts
 * Service de gestion du 2FA TOTP + preAuthToken.
 */
import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { authenticator } from 'otplib';
import * as crypto from 'crypto';

const PRE_AUTH_TTL_SECONDS = 5 * 60; // 5 minutes
const ENCRYPTION_KEY = process.env.TOTP_ENCRYPTION_KEY ?? '';

@Injectable()
export class TwoFactorService {
  constructor(private readonly jwtService: JwtService) {}

  /**
   * Génère un preAuthToken JWT court (5 min) signé avec JWT_ACCESS_SECRET,
   * portant un flag `preAuth: true` pour l'identifier comme intermédiaire.
   */
  async genererPreAuthToken(utilisateurId: number, appareilId: string): Promise<string> {
    return this.jwtService.sign(
      { sub: utilisateurId, appareilId, preAuth: true },
      { expiresIn: `${PRE_AUTH_TTL_SECONDS}s` },
    );
  }

  /** Génère un secret TOTP et retourne le secret ET l'URL otpauth. */
  genererSecret(email: string): { secret: string; otpauthUrl: string } {
    const secret = authenticator.generateSecret();
    const otpauthUrl = authenticator.keyuri(email, 'Cabinet Manager', secret);
    return { secret, otpauthUrl };
  }

  /** Vérifie un code TOTP contre le secret chiffré stocké en base. */
  verifierCode(secretChiffre: string, code: string): boolean {
    try {
      const secret = this.dechiffrer(secretChiffre);
      return authenticator.verify({ token: code, secret });
    } catch {
      return false;
    }
  }

  /** Chiffre le secret TOTP (AES-256-GCM) avant stockage en base. */
  chiffrer(texte: string): string {
    const iv = crypto.randomBytes(12);
    const key = Buffer.from(ENCRYPTION_KEY, 'hex');
    const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
    const encrypted = Buffer.concat([cipher.update(texte, 'utf8'), cipher.final()]);
    const tag = cipher.getAuthTag();
    return `${iv.toString('hex')}:${tag.toString('hex')}:${encrypted.toString('hex')}`;
  }

  private dechiffrer(texteChiffre: string): string {
    const [ivHex, tagHex, encryptedHex] = texteChiffre.split(':');
    const key = Buffer.from(ENCRYPTION_KEY, 'hex');
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, Buffer.from(ivHex, 'hex'));
    decipher.setAuthTag(Buffer.from(tagHex, 'hex'));
    const decrypted = Buffer.concat([
      decipher.update(Buffer.from(encryptedHex, 'hex')),
      decipher.final(),
    ]);
    return decrypted.toString('utf8');
  }
}
