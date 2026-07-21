/**
 * modules/auth/password-policy.util.ts
 * ---------------------------------------------------------------------------
 * Fonction pure (aucune dépendance Nest/DB) qui vérifie la complexité d'un
 * mot de passe selon les règles définies dans les spécifications de sécurité
 * (section 4.7) :
 *   - au moins 10 caractères
 *   - au moins une majuscule
 *   - au moins un chiffre
 *   - au moins un caractère spécial
 *
 * Retourne un TABLEAU des règles violées (vide = mot de passe conforme),
 * plutôt qu'un simple booléen, pour pouvoir afficher un message d'erreur
 * précis côté client ("il manque un chiffre", etc.) — bien plus facile à
 * déboguer pour l'utilisateur qu'un simple "mot de passe invalide".
 * ---------------------------------------------------------------------------
 */

export function validerComplexiteMotDePasse(motDePasse: string): string[] {
  const violations: string[] = [];

  if (motDePasse.length < 10) {
    violations.push('Le mot de passe doit comporter au moins 10 caractères.');
  }
  if (!/[A-Z]/.test(motDePasse)) {
    violations.push('Le mot de passe doit contenir au moins une lettre majuscule.');
  }
  if (!/[0-9]/.test(motDePasse)) {
    violations.push('Le mot de passe doit contenir au moins un chiffre.');
  }
  if (!/[^A-Za-z0-9]/.test(motDePasse)) {
    violations.push('Le mot de passe doit contenir au moins un caractère spécial.');
  }

  return violations;
}

export function motDePasseEstConforme(motDePasse: string): boolean {
  return validerComplexiteMotDePasse(motDePasse).length === 0;
}
