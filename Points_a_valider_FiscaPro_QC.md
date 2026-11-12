# FiscaPro QC — Points à valider avant mise en marché

**Document destiné à deux experts externes :** un·e fiscaliste agréé·e (CPA) et un·e spécialiste en sécurité applicative.

**Pourquoi ce document.** FiscaPro QC est une application web *local-first* qui estime l'impôt et les obligations fiscales des travailleurs autonomes du Québec. Le développement et les tests automatisés sont complets, mais deux volets exigent une validation professionnelle indépendante qui ne peut pas être faite par l'équipe de développement elle-même : l'exactitude fiscale et la solidité du chiffrement. Ce document liste les questions précises, les hypothèses retenues et les angles morts connus, pour orienter efficacement ces deux revues.

**Posture actuelle de l'application.** Toutes les estimations affichées portent la mention « estimation à valider ». Cette posture doit être maintenue tant que les validations ci-dessous ne sont pas faites.

**Dossiers détaillés (12 novembre 2026).** Ce document résume les deux revues. Chacune a maintenant son dossier détaillé, à remettre à l'expert concerné : le *Dossier de validation fiscale (CPA)*, avec des cas de référence chiffrés étape par étape, et le *Dossier d'audit de sécurité*, avec les constats préliminaires de l'équipe. En cas d'écart, les dossiers détaillés font foi.

---

## Partie 1 — Pour le ou la fiscaliste (CPA)

### 1.1 Contexte du calcul

L'application cible le travailleur autonome québécois (revenu d'entreprise, pas d'emploi salarié). Elle estime, pour l'année courante : l'impôt fédéral et québécois, les cotisations RRQ et RQAP, la provision à mettre de côté, les taxes de vente (TPS/TVQ) et les acomptes provisionnels. Tous les montants sont calculés en cents entiers.

### 1.2 Paramètres 2026 — déjà recroisés aux sources officielles

Les paramètres suivants ont été vérifiés contre Revenu Québec, l'ARC et Retraite Québec, et **correspondent aux valeurs officielles 2026**. À confirmer néanmoins dans le cadre d'une revue formelle :

- Paliers fédéraux : 14 % / 20,5 % / 26 % / 29 % / 33 % aux seuils 58 523 $ / 117 045 $ / 181 440 $ / 258 482 $.
- Paliers québécois : 14 % / 19 % / 24 % / 25,75 % aux seuils 54 345 $ / 108 680 $ / 132 245 $.
- Montant personnel de base : fédéral 16 452 $, Québec 18 952 $.
- Abattement du Québec sur l'impôt fédéral : 16,5 %.
- RRQ travailleur autonome : taux total 12,6 %, exemption 3 500 $, MGA 74 600 $, maximum supplémentaire 85 000 $.
- RQAP travailleur autonome : taux 0,764 %, maximum assurable 103 000 $.
- TPS 5 %, TVQ 9,975 %.
- Seuils d'acomptes : fédéral 3 000 $, Québec 1 800 $.

> **À confirmer en priorité** (relecture du 12 novembre 2026) : le taux RRQ de base (5,3 % par part), le taux RQAP de travailleur autonome (0,764 %) et le seuil d'acomptes fédéral, qui serait de 1 800 $ pour un résident du Québec. La cotisation au Fonds des services de santé n'est pas calculée. Voir le dossier CPA.

**Important :** la vérification faite par l'équipe ne portait que sur ces *paramètres*. Elle ne vaut pas validation de la *logique* de calcul ni de la *méthode*. C'est l'objet des questions ci-dessous.

### 1.3 Questions sur la méthode de calcul

1. **Application des crédits non remboursables.** Les montants personnels de base (fédéral et Québec) sont convertis en crédits au taux du palier le plus bas (14 %) puis soustraits de l'impôt. La part « employé » des cotisations RRQ/RQAP est aussi traitée en crédit au fédéral. **La méthode et l'ordre d'application des crédits sont-ils conformes aux guides T1 et TP-1 ?**

2. **Séparation crédit / déduction des cotisations sociales.** Pour le travailleur autonome, la cotisation RRQ/RQAP est scindée : une part « employeur » est déductible du revenu (lignes 22200 et 22215 au fédéral, ligne 248 au Québec ; une version antérieure de ce document citait par erreur la ligne 21200), une part « employé » donne un crédit. L'application utilise un facteur de partage de 0,5. **Ce traitement et ce partage sont-ils corrects, y compris pour les cotisations supplémentaires (bonifiées) du RRQ ?**

3. **Abattement du Québec.** Il est appliqué comme une réduction de 16,5 % de l'impôt fédéral de base. **L'assiette de l'abattement (impôt « de base » avant ou après quels crédits) est-elle la bonne ?**

4. **Revenu imposable distinct fédéral / Québec.** L'application calcule deux revenus imposables potentiellement différents. **Les déductions retenues de chaque côté sont-elles les bonnes pour un travailleur autonome ?**

5. **Cas de référence à valider.** Pour un revenu net d'entreprise de 50 000 $, l'application produit un impôt total (fédéral + Québec + RRQ + RQAP) de **13 277,94 $**. **Ce montant est-il exact ? Si non, où se situe l'écart ?**

### 1.4 TPS / TVQ

6. **Récupération des intrants (CTI / RTI).** La récupération de taxe sur une dépense suit le pourcentage déductible de cette dépense. **Cette règle est-elle correcte de manière générale ?**

7. **Angle mort documenté — l'assurance.** L'application ne gère **pas** automatiquement le fait que la TVQ sur les primes d'assurance n'est pas récupérable au RTI. L'utilisateur doit l'ajuster manuellement (un champ le permet). **Cette limite est-elle acceptable, ou faut-il une gestion automatique ? Y a-t-il d'autres catégories avec des règles de récupération particulières (repas à 50 %, etc.) à traiter spécifiquement ?**

### 1.5 Acomptes provisionnels

8. **Angle mort documenté — année antérieure.** La règle officielle des acomptes évalue à la fois l'année courante et l'année antérieure. L'application n'a que les données de l'année courante ; elle produit donc une **estimation prudente fondée sur l'année en cours seulement**. **Cette simplification est-elle acceptable comme estimation, et bien communiquée ?**

9. **Assiette des acomptes.** Les seuils (3 000 $ / 1 800 $) sont évalués sur l'impôt seul (fédéral d'un côté, Québec de l'autre), en **excluant** RRQ et RQAP (réglés à la production). Les 4 versements sont égaux, aux dates des 15 mars, juin, septembre et décembre. **Cette assiette et ce découpage sont-ils corrects ?**

### 1.6 Questions générales

10. **Périmètre.** L'application ne gère pas : revenus mixtes (emploi + entreprise), conjoint et personnes à charge, REER/CELI, gains en capital, crédits remboursables spécifiques au Québec (solidarité, prime au travail, etc.). **Ces absences doivent-elles être signalées plus explicitement à l'utilisateur ?**

11. **Mention légale.** La formulation « estimation seulement, ne remplace pas l'avis d'un comptable » est-elle suffisante du point de vue de la responsabilité ?

---

## Partie 2 — Pour le ou la spécialiste en sécurité

### 2.1 Contexte et modèle de menace

Application *local-first* : toutes les données restent sur l'appareil de l'utilisateur (IndexedDB du navigateur), rien n'est envoyé à un serveur. Le chiffrement au repos vise la conformité à la Loi 25 (Québec). Le modèle de menace visé : **appareil perdu ou volé, ou base IndexedDB exfiltrée**. Il **ne** vise pas un appareil déjà compromis pendant l'utilisation (keylogger, écran déverrouillé sous surveillance).

### 2.2 Implémentation cryptographique (à auditer)

L'ensemble utilise l'API Web Crypto native du navigateur, sans dépendance externe.

- **Clé de données** : 256 bits aléatoires, utilisée pour chiffrer toutes les données (AES-GCM 256 bits, IV aléatoire de 12 octets par enregistrement). Importée comme clé non extractible.
- **Enveloppe de clé** : la clé de données est chiffrée par une clé dérivée du mot de passe (PBKDF2, SHA-256, **600 000 itérations**, sel aléatoire de 16 octets). Le sel et la clé enveloppée forment un **trousseau**, stocké en une seule métadonnée.
- **Vérification du mot de passe** : le déchiffrement authentifié du trousseau échoue si le mot de passe est faux. Le mot de passe n'est jamais stocké.
- **Politique de mot de passe** : 12 caractères minimum ; sous 16 caractères, au moins 3 types de caractères ; refus des mots de passe courants, des répétitions et des suites, avec une jauge de robustesse. Un mot de passe existant trop faible reste utilisable, mais l'app invite à le changer après le déverrouillage.
- **Changement de mot de passe** : seul le trousseau est réécrit, en une seule écriture ; les données ne sont pas touchées.
- **Deux bases distinctes** : les données en clair et les données chiffrées vivent dans deux bases IndexedDB séparées. L'activation construit la base chiffrée, écrit un drapeau en dernier, puis supprime la base en clair en entier (et inversement à la désactivation). Une opération interrompue est annulée ou terminée au redémarrage.
- **Clé en mémoire** : la clé de données vit en mémoire pour la durée de la session, jamais persistée. Perdue au rechargement de page (re-déverrouillage requis). Verrouillée, l'app refuse tout accès aux données.
- **Format hérité** : les bases chiffrées par une version antérieure (clé dérivée directement du mot de passe) sont migrées au premier déverrouillage.

### 2.2 bis Déploiement et dépendances

- **En-têtes de sécurité** (`vercel.json`) : politique CSP stricte, sans `'unsafe-inline'` ni `'unsafe-eval'`. Tout vient du même domaine ; seules exceptions, `blob:` pour le worker de l'OCR et `'wasm-unsafe-eval'` pour son module WebAssembly. `connect-src 'self'` empêche l'envoi de données vers un autre site. S'y ajoutent HSTS, `X-Content-Type-Options`, `X-Frame-Options: DENY`, `Referrer-Policy: no-referrer`, `Permissions-Policy`, COOP et CORP. Vérifié localement dans Chromium (aucune violation ; script injecté, script externe, envoi externe et `eval` bloqués) ; à confirmer sur le déploiement Vercel.
- **Dépendances** : jspdf 4.2.1, dompurify 3.4.17 et react-router-dom 7.18.5 corrigent les vulnérabilités connues. `npm audit --omit=dev` : 0 vulnérabilité. Restent 13 vulnérabilités dans les outils de développement (Vite, Vitest, ESLint), non livrés aux utilisateurs.

### 2.3 Questions pour l'audit

1. **Paramètres PBKDF2.** 600 000 itérations SHA-256 : adéquat aujourd'hui pour ce contexte navigateur ? Faut-il prévoir une augmentation dans le temps, ou migrer vers Argon2 (via WebAssembly) ?

2. **Usage d'AES-GCM.** Chaque enregistrement est chiffré séparément avec son propre IV aléatoire de 12 octets. **Y a-t-il un risque de réutilisation d'IV** (collision sur de très grands volumes) ? Le découpage par enregistrement (plutôt qu'un chiffrement global) introduit-il une faiblesse ?

3. **Gestion de la clé en mémoire.** La clé `CryptoKey` est conservée dans une instance de session en mémoire. **Existe-t-il des fenêtres où elle pourrait fuiter** (dumps mémoire, extensions de navigateur, devtools) ? Le caractère non extractible suffit-il ?

4. **Fenêtres d'exposition pendant les transitions.** Le changement de mot de passe ne réécrit plus que le trousseau. L'activation copie les données dans une base chiffrée neuve puis supprime la base en clair ; des traces des données saisies avant l'activation peuvent néanmoins subsister sur le disque. La désactivation réécrit volontairement les données en clair dans une base neuve. **Ces fenêtres sont-elles correctement bornées ? La suppression de la base en clair est-elle suffisante ?**

5. **Verrouillage automatique.** L'app se verrouille après 15 minutes d'inactivité (avertissement à 14 min). **Ce délai et ce mécanisme sont-ils appropriés ? La clé est-elle correctement effacée au verrouillage ?**

6. **Métadonnées non chiffrées.** Le trousseau (sel + clé de données enveloppée) et les drapeaux de configuration sont stockés **en clair** (nécessaires avant déverrouillage). **Cette exposition est-elle acceptable ?**

7. **Surface d'attaque navigateur.** IndexedDB, le contexte d'exécution et les éventuelles extensions. Une CSP stricte et les en-têtes de la section 2.2 bis sont en place. **Sont-ils adaptés ? Quelles protections supplémentaires recommander (isolation, app installée, etc.) ?**

8. **Récupération impossible par conception.** L'oubli du mot de passe entraîne la **perte définitive et irrécupérable** des données (aucune porte dérobée, aucune récupération). C'est un choix assumé et clairement signalé à l'utilisateur. **Ce compromis est-il bien implémenté (pas de fuite qui contournerait cette propriété) et bien communiqué ?**

### 2.4 Point essentiel

Cette implémentation **n'a pas été auditée**. Les primitives sont standard et assemblées selon les bonnes pratiques connues de l'équipe, mais c'est précisément la limite d'une auto-évaluation : une faille introduite de bonne foi ne se voit pas en se relisant soi-même. L'audit doit être conduit de façon indépendante, avec une posture adverse et des outils dédiés.

---

## Partie 3 — Récapitulatif des angles morts déjà connus

Ces limites sont **documentées dans le code** et assumées ; elles sont listées ici pour transparence auprès des deux experts.

| Domaine | Limite connue | Traitement actuel |
|---|---|---|
| Fiscal | Acomptes : année antérieure non prise en compte | Estimation prudente sur l'année courante |
| Fiscal | TVQ sur assurance non récupérable | Ajustement manuel par l'utilisateur |
| Fiscal | Pas de revenus mixtes, conjoint, REER, gains en capital | Hors périmètre |
| Sécurité | Chiffrement non audité | Le présent document et le dossier d'audit |
| Sécurité | Traces possibles sur le disque des données saisies avant l'activation | Base en clair supprimée à l'activation ; l'app conseille d'activer le chiffrement dès le début |
| Sécurité | Liste de mots de passe courants limitée (environ 45 mots) | Politique de mot de passe en place (constat 3 corrigé) ; une liste plus complète (ex. zxcvbn) est à évaluer |
| Sécurité | Pas de protection contre appareil compromis en cours d'usage | Hors modèle de menace |
| Sécurité | Code rechargé depuis l'hébergeur à chaque visite : une version piégée servie par Vercel reste possible | Atténué par la CSP ; app installée (service worker) avec mises à jour contrôlées à évaluer |
| Technique | Vulnérabilités restantes dans les outils de développement (Vite, Vitest, ESLint) | Non livrés aux utilisateurs ; mise à jour majeure à planifier |
| Sécurité | Perte du mot de passe = perte définitive | Choix assumé, signalé à l'utilisateur |
| Technique | Délai de verrouillage non configurable (15 min fixe) | Valeur unique |

---

## Partie 4 — État du développement (pour contexte)

- Build, lint et **183 tests automatisés** au vert.
- Couverture à trois niveaux : logique pure (moteur fiscal, taxes, acomptes, rappels, cryptographie), stockage, et composants d'interface.
- Périmètre fonctionnel du cahier des charges (PRD) couvert intégralement, version 2 comprise.
- Pile : application web (React + TypeScript strict), stockage local IndexedDB, OCR local pour les factures (aucune dépendance externe à l'exécution).

**Le développement est abouti. Ce sont les deux validations professionnelles ci-dessus — et non du travail de programmation supplémentaire — qui conditionnent une mise en marché responsable auprès d'utilisateurs réels manipulant leurs vraies données fiscales.**
