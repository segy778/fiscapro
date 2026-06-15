# CLAUDE.md — FiscaPro QC

Ce fichier guide Claude Code à chaque session de travail sur ce dépôt. **Lis-le en entier avant toute tâche.** Si une instruction ici contredit une demande ambiguë, demande clarification plutôt que de deviner — l'exactitude fiscale prime sur la vitesse.

---

## 1. Contexte du projet

**FiscaPro QC** est une application de gestion fiscale pour les **travailleurs autonomes du Québec**. Elle suit revenus et dépenses en cours d'année et estime en temps réel l'impôt à payer.

Objectifs cœur (le PRD complet est dans `PRD_FiscaPro_QC.md`) :
1. Estimer l'impôt à payer en fin d'année (**fédéral ARC + provincial Revenu Québec**).
2. Calculer le total des dépenses déductibles.
3. Saisir des dépenses par photo de facture (OCR) ou manuellement.
4. Suivre le revenu cumulé de l'année.
5. Suivre le kilométrage du véhicule et les frais associés (essence, entretien).

**Public :** travailleurs autonomes (livreurs/chauffeurs, pigistes/consultants, métiers). **Pas** de sociétés incorporées.

---

## 2. Plateforme et stratégie

- **v1 = application web** : React 18 + Vite + TypeScript.
- **Mobile plus tard** : l'architecture doit garder la logique métier **découplée de l'UI** pour pouvoir réutiliser le cœur (calcul fiscal, modèles de données) dans une future app mobile.
- **Conséquence concrète :** toute la logique fiscale, les modèles et les calculs vivent dans `src/lib/` et `src/core/`, **jamais** dans les composants React. Les composants ne font qu'afficher et appeler cette logique.

---

## 3. Stack technique

| Domaine | Choix |
|---------|-------|
| Langage | TypeScript (strict) |
| Build | Vite |
| UI | React 18 |
| Styles | Tailwind CSS |
| Graphiques | Recharts |
| État | Zustand (léger, simple à porter sur mobile) |
| Stockage local | IndexedDB via `idb` (web) — abstrait derrière une interface pour pouvoir brancher SQLite sur mobile |
| Routing | React Router |
| Tests | Vitest + Testing Library |
| OCR | Interface `OcrProvider` + implémentation Tesseract.js locale. Ressources (worker, core WASM, données `fra`) servies depuis `public/tesseract/` — aucune dépendance CDN à l'exécution (local-first, Loi 25). |

> Si un choix n'est pas encore tranché, propose-le, ne l'impose pas en silence.

---

## 4. Conventions de code

- **Interface 100 % en français québécois.** Tout texte vu par l'utilisateur est en français.
- **Code en anglais** : variables, fonctions, types, fichiers. Commentaires en français acceptés.
- **TypeScript strict** : pas de `any` implicite. Typer les modèles de données.
- **Composants** : un par fichier, PascalCase. Logique métier extraite dans des hooks ou des modules `lib/`.
- **Argent : TOUJOURS en cents (entiers).** Jamais de montants en flottants. Une valeur de 19,99 $ est stockée comme `1999`. Le formatage en dollars se fait seulement à l'affichage.
- **Dates** : stockage en ISO 8601, affichage localisé `fr-CA`.
- **Pas de `localStorage`/`sessionStorage` pour les données** — utiliser la couche de stockage abstraite (IndexedDB).
- **Nommer les fichiers fiscaux par année** : `2026.json`, `2027.json`, etc.

---

## 5. Règles fiscales — CRITIQUE

C'est le cœur de l'app. À respecter sans exception.

1. **JAMAIS coder en dur les paramètres fiscaux.** Paliers d'imposition, taux, montants personnels de base, plafonds et taux RRQ/RQAP changent **chaque année**. Ils vivent uniquement dans `src/config/fiscal/<année>.json`. Le moteur de calcul lit ce fichier; il ne contient aucun chiffre fiscal en dur.

2. **Deux paliers d'impôt obligatoires :** fédéral (ARC) **et** provincial (Revenu Québec). Les deux sont calculés et additionnés.

3. **Cotisations à inclure dans l'estimation :**
   - **RRQ** — le travailleur autonome paie la part employé **et** employeur.
   - **RQAP** — cotisation du travailleur autonome.

4. **Crédits de base** : appliquer le montant personnel de base fédéral et provincial.

5. **Dépenses déductibles par pourcentage** : chaque catégorie a son taux (ex. repas et représentation = 50 %). Ne jamais supposer 100 % par défaut.

6. **Frais de véhicule** : déductibles selon le **ratio d'usage commercial** (km affaires ÷ km totaux). Séparer rigoureusement km personnels et km d'affaires.

7. **Acomptes provisionnels** : estimer les versements trimestriels quand applicable (fonctionnalité v1.5, mais le modèle doit le permettre).

8. **ESTIMATION, pas avis fiscal.** Afficher en tout temps un avertissement clair. Ne jamais présenter un résultat comme une déclaration officielle.

---

## 6. Architecture cible

```
src/
  core/                  # logique métier pure, sans dépendance UI (réutilisable mobile)
    models/              # types : Income, Expense, Trip, Vehicle, TaxResult...
    tax/                 # MOTEUR DE CALCUL FISCAL (pur, testé unitairement)
  config/
    fiscal/
      2026.json          # paramètres fiscaux de l'année — SOURCE UNIQUE DE VÉRITÉ
  lib/
    storage/             # interface de stockage + implémentation IndexedDB
    ocr/                 # interface OcrProvider + implémentation
    format/              # formatage monnaie (cents → $), dates (fr-CA)
  features/
    dashboard/           # tableau de bord (revenu, impôt estimé, provision)
    income/              # gestion des revenus
    expenses/            # dépenses (saisie manuelle + photo/OCR)
    vehicle/             # kilométrage et frais de véhicule
    reports/             # rapports et exports (PDF/CSV)
  components/            # composants UI réutilisables
  store/                 # état global (Zustand)
  App.tsx
  main.tsx
```

**Règle d'or :** `core/` et `config/` ne doivent jamais importer de React. C'est ce qui rendra le portage mobile possible.

---

## 7. Modèles de données (référence)

À implémenter dans `core/models/`. Montants en **cents**.

- **Income** : `id`, `date`, `amountCents`, `client?`, `description?`, `gstQstCollected?`
- **Expense** : `id`, `date`, `amountCents`, `category`, `deductiblePercent`, `description?`, `receiptImageId?`, `gstCents?`, `qstCents?`
- **Trip** : `id`, `date`, `businessKm`, `personalKm?`, `purpose?`
- **Vehicle** : `id`, `name`, `expenses[]` (essence, entretien, assurance...)
- **TaxResult** : `grossIncomeCents`, `deductionsCents`, `netIncomeCents`, `federalTaxCents`, `provincialTaxCents`, `rrqCents`, `rqapCents`, `totalTaxCents`, `suggestedSetAsideCents`

---

## 8. Commandes

Scripts réels définis dans `package.json` (vérifiés après le scaffold) :

```bash
npm install        # installer les dépendances
npm run dev        # serveur de dev Vite (http://localhost:5173)
npm run build      # tsc -b && vite build (typecheck strict + build prod)
npm run preview    # prévisualiser le build de production
npm run test       # tests Vitest
npm run lint       # ESLint (portée src/)
```

> Note environnement conteneurisé : `vite.config.ts` active `server.watch.usePolling`
> pour contourner la limite système de file watchers (ENOSPC).

---

## 9. Hors périmètre (v1)

- Transmission officielle des déclarations à l'ARC / Revenu Québec
- Gestion de paie d'employés
- Comptabilité de sociétés incorporées
- Conseils fiscaux personnalisés
- Synchronisation cloud (local d'abord)

---

## 10. Loi 25 et sécurité

- Données financières sensibles → privilégier le **stockage local** et le fonctionnement **hors ligne**.
- Minimisation des données : ne collecter que le nécessaire.
- Prévoir le chiffrement au repos pour les données sensibles.
- Aucun partage de données sans consentement explicite.

---

## 11. Rappels pour Claude Code

- Avant de toucher à la logique fiscale, lis `src/config/fiscal/<année>.json`.
- Le moteur de calcul (`core/tax/`) doit être **pur et testé unitairement** — pas d'effets de bord, pas d'UI.
- Toute nouvelle catégorie de dépense doit définir son pourcentage déductible.
- Tout texte utilisateur en français québécois.
- En cas de doute sur une règle fiscale précise, **signale-le explicitement** au lieu de deviner. Les chiffres fiscaux doivent être validés avec les sources officielles (Revenu Québec, ARC).
- Travaille par petites étapes vérifiables; ne génère pas tout le projet d'un coup.
