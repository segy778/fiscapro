// Politique de mot de passe pour le chiffrement. Module PUR (aucune UI).
//
// Pourquoi : le trousseau stocké en clair permet à un attaquant qui copie la
// base de tester des mots de passe hors ligne, sans limite d'essais. PBKDF2
// (600 000 itérations) ralentit chaque essai, mais ne protège pas un mot de
// passe court ou courant. On exige donc une longueur minimale et on refuse
// les motifs que les outils d'attaque essaient en premier.
//
// Règles :
//  - 12 caractères minimum;
//  - moins de 16 caractères : au moins 3 types (minuscules, majuscules,
//    chiffres, symboles). À partir de 16 : phrase de passe acceptée telle quelle;
//  - refus des mots de passe courants, des répétitions et des suites.

export const MIN_PASSWORD_LENGTH = 12;
/** Longueur à partir de laquelle une phrase de passe n'a pas besoin de variété. */
export const PASSPHRASE_LENGTH = 16;

export type PasswordScore = 0 | 1 | 2 | 3 | 4;

export const SCORE_LABELS: Record<PasswordScore, string> = {
  0: 'Très faible',
  1: 'Faible',
  2: 'Moyen',
  3: 'Bon',
  4: 'Excellent',
};

export interface PasswordCheck {
  /** true si le mot de passe respecte toutes les règles. */
  acceptable: boolean;
  /** Robustesse estimée, pour la jauge (0 à 4). */
  score: PasswordScore;
  /** Problèmes à corriger, en français, prêts à afficher. */
  problems: string[];
}

// Mots et mots de passe parmi les plus essayés (français et anglais), sous
// forme normalisée : minuscules, sans accents, lettres et chiffres seulement.
const COMMON = [
  'motdepasse', 'password', 'passw0rd', 'azerty', 'qwerty', 'qwertz', 'azertyuiop',
  'qwertyuiop', 'admin', 'administrateur', 'bonjour', 'salut', 'soleil', 'chocolat',
  'doudou', 'loulou', 'chouchou', 'amour', 'jetaime', 'iloveyou', 'welcome', 'bienvenue',
  'letmein', 'secret', 'monkey', 'dragon', 'football', 'hockey', 'baseball', 'canadiens',
  'quebec', 'montreal', 'canada', 'fiscapro', 'impots', 'impot', 'taxes', 'comptable',
  'princesse', 'motdepass', 'changeme', 'test', 'utilisateur', 'user', 'login',
];

const SEQUENCES = [
  'abcdefghijklmnopqrstuvwxyz',
  '01234567890',
  'azertyuiopqsdfghjklmwxcvbn',
  'qwertyuiopasdfghjklzxcvbnm',
];

/** Minuscules, sans accents, lettres et chiffres seulement. */
function normalize(password: string): string {
  return password
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

function characterClasses(password: string): number {
  let n = 0;
  if (/\p{Ll}/u.test(password)) n++;
  if (/\p{Lu}/u.test(password)) n++;
  if (/\d/.test(password)) n++;
  if (/[^\p{L}\d]/u.test(password)) n++;
  return n;
}

/** Le mot de passe est-il essentiellement un mot courant (avec quelques ajouts) ? */
function isCommon(normalized: string): boolean {
  if (normalized.length === 0) return false;
  const lettersOnly = normalized.replace(/\d/g, '');
  return COMMON.some(
    (word) =>
      normalized === word ||
      lettersOnly === word ||
      // Le mot courant forme au moins 60 % du mot de passe (ex. « Password2026! »).
      (normalized.includes(word) && word.length >= normalized.length * 0.6),
  );
}

/** Un motif court répété (ex. « aaaaaa », « abcabcabc », « 121212 »). */
function isRepetitive(normalized: string): boolean {
  if (normalized.length < 4) return false;
  for (let size = 1; size <= normalized.length / 3; size++) {
    const unit = normalized.slice(0, size);
    if (unit.repeat(Math.ceil(normalized.length / size)).startsWith(normalized)) return true;
  }
  return new Set(normalized).size <= 2;
}

/** Une suite (alphabet, chiffres, clavier) forme au moins la moitié du mot de passe. */
function hasLongSequence(normalized: string): boolean {
  const threshold = Math.max(4, Math.ceil(normalized.length / 2));
  for (const seq of SEQUENCES) {
    const reversed = [...seq].reverse().join('');
    for (const source of [seq, reversed]) {
      for (let i = 0; i + threshold <= source.length; i++) {
        if (normalized.includes(source.slice(i, i + threshold))) return true;
      }
    }
  }
  return false;
}

/** Entropie grossière : longueur × log2(taille de l'alphabet utilisé). */
function estimateBits(password: string): number {
  let charset = 0;
  if (/\p{Ll}/u.test(password)) charset += 26;
  if (/\p{Lu}/u.test(password)) charset += 26;
  if (/\d/.test(password)) charset += 10;
  if (/[^\p{L}\d]/u.test(password)) charset += 33;
  return [...password].length * Math.log2(Math.max(charset, 2));
}

/** Évalue un mot de passe selon la politique ci-dessus. */
export function checkPassword(password: string): PasswordCheck {
  const length = [...password].length;
  const normalized = normalize(password);
  const problems: string[] = [];

  if (length < MIN_PASSWORD_LENGTH) {
    problems.push(`Au moins ${MIN_PASSWORD_LENGTH} caractères (actuellement ${length}).`);
  }
  const common = isCommon(normalized);
  if (common) problems.push('Trop courant : il fait partie des premiers essayés par les pirates.');
  const repetitive = isRepetitive(normalized);
  if (repetitive) problems.push('Évitez les répétitions (ex. « aaaa », « abcabc »).');
  const sequence = !repetitive && hasLongSequence(normalized);
  if (sequence) problems.push('Évitez les suites (ex. « 123456 », « abcdef », « azerty »).');
  if (length >= MIN_PASSWORD_LENGTH && length < PASSPHRASE_LENGTH && characterClasses(password) < 3) {
    problems.push(
      `Mélangez majuscules, minuscules, chiffres et symboles, ou allongez-le à ${PASSPHRASE_LENGTH} caractères ou plus (phrase de passe).`,
    );
  }

  let bits = estimateBits(password);
  if (common || repetitive) bits = Math.min(bits, 20);
  if (sequence) bits *= 0.5;
  let score: PasswordScore = bits < 40 ? 0 : bits < 55 ? 1 : bits < 70 ? 2 : bits < 90 ? 3 : 4;
  // Un mot de passe refusé ne s'affiche jamais mieux que « Faible ».
  if (problems.length > 0 && score > 1) score = 1;

  return { acceptable: problems.length === 0, score, problems };
}
