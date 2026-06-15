# FiscaPro QC

Application web *local-first* d'estimation fiscale pour les travailleurs autonomes du Québec. Suit revenus, dépenses, frais de véhicule et justificatifs ; estime impôt, cotisations (RRQ/RQAP), taxes (TPS/TVQ) et acomptes provisionnels. Toutes les données restent sur l'appareil de l'utilisateur (aucun serveur).

> **Avant toute mise en marché auprès d'utilisateurs réels :** valider les calculs par un·e fiscaliste (CPA), faire auditer le chiffrement par un·e spécialiste en sécurité, et obtenir un avis juridique sur la Loi 25. Voir `Points_a_valider_FiscaPro_QC.md`. Les résultats affichés sont des **estimations**.

## Pile technique

Vite · React 18 · TypeScript (strict) · Tailwind CSS · Zustand · IndexedDB · Recharts · jsPDF · Tesseract.js (OCR local) · Web Crypto (chiffrement). Tests : Vitest + Testing Library.

## Lancer en développement

Prérequis : Node.js 18 ou plus récent.

```bash
npm install
npm run dev
```

L'application démarre sur `http://localhost:5173`.

## Autres commandes

```bash
npm run build    # compile la version de production dans dist/
npm run preview  # sert localement la version de production
npm test         # lance les tests (143 tests)
npm run lint     # vérifie le code
```

## Déployer sur Vercel

1. Pousser ce dépôt sur GitHub.
2. Sur **vercel.com**, créer un compte (forfait Hobby, gratuit), puis **« Add New… → Project »**.
3. Importer ce dépôt GitHub. Vercel détecte automatiquement Vite.
4. Laisser les réglages par défaut (commande de build `npm run build`, dossier de sortie `dist`) et cliquer sur **Deploy**.

Le fichier `vercel.json` (déjà inclus) gère le routage des pages. Vercel fournit le HTTPS automatiquement, ce qui est **requis** pour le chiffrement (Web Crypto).

## Confidentialité

Aucune donnée utilisateur n'est transmise à un serveur. Stockage local (IndexedDB), OCR local (Tesseract servi depuis l'application). Voir `Politique_confidentialite_BROUILLON.md` (à faire valider juridiquement).

## Documentation

- `Guide_utilisation_FiscaPro_QC.md` — guide pour les utilisateurs finaux.
- `Points_a_valider_FiscaPro_QC.md` — points à soumettre aux experts (fiscaliste, sécurité).
- `CLAUDE.md` — architecture et conventions du projet.

## Mise à jour annuelle

Les paramètres fiscaux (`src/config/fiscal/2026.json`) sont propres à l'année 2026 et doivent être mis à jour chaque année, puis revalidés par un·e fiscaliste.
