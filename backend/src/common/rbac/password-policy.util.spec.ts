/**
 * modules/auth/password-policy.util.spec.ts
 * ---------------------------------------------------------------------------
 */
import { validerComplexiteMotDePasse, motDePasseEstConforme } from './password-policy.util';

describe('validerComplexiteMotDePasse', () => {
  it("ne retourne aucune violation pour un mot de passe conforme", () => {
    expect(validerComplexiteMotDePasse('Motdepasse123!')).toEqual([]);
  });

  it('signale un mot de passe trop court', () => {
    const violations = validerComplexiteMotDePasse('Ab1!');
    expect(violations.some((v) => v.includes('10 caractères'))).toBe(true);
  });

  it('signale l\'absence de majuscule', () => {
    const violations = validerComplexiteMotDePasse('motdepasse123!');
    expect(violations.some((v) => v.includes('majuscule'))).toBe(true);
  });

  it('signale l\'absence de chiffre', () => {
    const violations = validerComplexiteMotDePasse('Motdepasseabc!');
    expect(violations.some((v) => v.includes('chiffre'))).toBe(true);
  });

  it('signale l\'absence de caractère spécial', () => {
    const violations = validerComplexiteMotDePasse('Motdepasse123');
    expect(violations.some((v) => v.includes('caractère spécial'))).toBe(true);
  });

  it('cumule plusieurs violations simultanées', () => {
    const violations = validerComplexiteMotDePasse('abc');
    expect(violations.length).toBeGreaterThan(1);
  });
});

describe('motDePasseEstConforme', () => {
  it('retourne true pour un mot de passe valide', () => {
    expect(motDePasseEstConforme('Motdepasse123!')).toBe(true);
  });

  it('retourne false pour un mot de passe non conforme', () => {
    expect(motDePasseEstConforme('abc')).toBe(false);
  });
});
