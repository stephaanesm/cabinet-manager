/**
 * modules/auth/two-factor.service.spec.ts
 * ---------------------------------------------------------------------------
 * Ces tests utilisent la vraie librairie `otplib` (pas de mock) car la
 * génération/vérification TOTP est rapide et déterministe une fois le secret
 * fixé — c'est le comportement réel qu'on veut valider, notamment le
 * chiffrement/déchiffrement symétrique du secret.
 * ---------------------------------------------------------------------------
 */
import { TwoFactorService } from './two-factor.service';
import { authenticator } from 'otplib';

describe('TwoFactorService', () => {
  let service: TwoFactorService;

  beforeEach(() => {
    // Clé de test fixe (32+ caractères) — jamais utiliser cette valeur en production.
    process.env.TWO_FACTOR_ENCRYPTION_KEY = 'clé-de-test-uniquement-ne-jamais-utiliser-en-prod';
    service = new TwoFactorService();
  });

  it("lève une erreur au démarrage si la clé de chiffrement n'est pas configurée", () => {
    delete process.env.TWO_FACTOR_ENCRYPTION_KEY;
    expect(() => new TwoFactorService()).toThrow(/TWO_FACTOR_ENCRYPTION_KEY/);
  });

  it('génère un secret non vide', () => {
    const secret = service.genererSecret();
    expect(secret).toBeTruthy();
    expect(secret.length).toBeGreaterThan(10);
  });

  it("génère une URI otpauth:// exploitable par une application d'authentification", () => {
    const secret = service.genererSecret();
    const uri = service.genererUriProvisionnement('avocat@cabinet.cm', secret);
    expect(uri).toMatch(/^otpauth:\/\/totp\//);
    expect(uri).toContain('Cabinet%20Manager');
  });

  it('valide un code TOTP correct généré à partir du même secret', () => {
    const secret = service.genererSecret();
    const codeValide = authenticator.generate(secret);
    expect(service.verifierCode(codeValide, secret)).toBe(true);
  });

  it('rejette un code TOTP incorrect', () => {
    const secret = service.genererSecret();
    expect(service.verifierCode('000000', secret)).toBe(false);
  });

  it('rejette un code malformé sans lever d\'exception', () => {
    const secret = service.genererSecret();
    expect(() => service.verifierCode('pas-un-code', secret)).not.toThrow();
    expect(service.verifierCode('pas-un-code', secret)).toBe(false);
  });

  it('chiffre puis déchiffre un secret et retrouve la valeur exacte d\'origine', () => {
    const secretOriginal = service.genererSecret();
    const chiffre = service.chiffrerSecret(secretOriginal);

    expect(chiffre).not.toEqual(secretOriginal); // bien chiffré, pas stocké en clair
    expect(chiffre.split(':')).toHaveLength(3); // format iv:authTag:donnees

    const dechiffre = service.dechiffrerSecret(chiffre);
    expect(dechiffre).toEqual(secretOriginal);
  });

  it('lève une erreur si le format du secret chiffré est invalide (protection contre la corruption)', () => {
    expect(() => service.dechiffrerSecret('format-invalide-sans-deux-points')).toThrow(
      /invalide/,
    );
  });

  it('un code généré ne doit pas être validé avec un AUTRE secret (isolation entre utilisateurs)', () => {
    const secretA = service.genererSecret();
    const secretB = service.genererSecret();
    const codeA = authenticator.generate(secretA);
    expect(service.verifierCode(codeA, secretB)).toBe(false);
  });
});
