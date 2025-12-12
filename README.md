# ExcelToSQLite – Desktop Mapping & Import Tool

### **Importer un fichier Excel, mapper ses colonnes et l’insérer dans une base SQLite en un clic.**

**Technologies : Electron • React • SQLite • Node.js**

---

## 1. **Présentation générale**

**ExcelToSQLite** est une application desktop permettant de transformer un fichier Excel (.xlsx) en données structurées stockées dans une base SQLite locale.

L’utilisateur peut :

* charger un fichier Excel,
* sélectionner une table SQLite existante,
* mapper les colonnes Excel avec les colonnes de la table,
* prévisualiser les données,
* importer les lignes via une transaction sécurisée.

Ce projet met en avant une **architecture Electron moderne** avec **React**, une API sécurisée via **preload** et l'utilisation d'une base **SQLite embarquée**.

---

## 2. **Objectifs de la V1**

### Fonctionnels (métier)

* Charger un fichier Excel (.xlsx)
* Afficher les colonnes et un aperçu des données
* Lister les tables SQLite existantes
* Lister leurs colonnes
* Permettre un **mapping manuel** (Excel → SQLite)
* Prévisualiser les données mappées
* Importer dans la base via une **transaction**
* Afficher un rapport d’import (succès / erreurs)

### Techniques

* Isoler toute la logique sensible dans le **main process**
* Exposer une API minimale via **preload + contextBridge**
* Sécuriser l’application :
  `contextIsolation: true` • `sandbox: true` • `nodeIntegration: false`
* Gérer les accès fichiers / DB uniquement côté main
* Utiliser React pour une UI propre et efficace
* Ajouter des tests unitaires Jest
* Mettre en place un CI/CD via GitHub Actions

---

## 3. **Stack technique**

### Frontend

* **React 18**
* React Hooks
* TailwindCSS (si souhaité)
* Tableaux + mapping UI

### Backend interne (Electron main)

* Electron 30+
* Excel parsing : **exceljs**
* SQLite access : **better-sqlite3** (synchrone, simple, rapide)
* File system sécurisé

### Sécurité

* Isolation totale entre renderer et système
* API contrôlée via preload
* Aucune API Node dans React

---

## 4. **Arborescence du projet**

```
/exceltosqlite
│
├── electron/
│   ├── main.js           → Processus principal
│   ├── preload.js        → API sécurisée exposée au renderer
│   └── db/
│       ├── init.js       → Init SQLite + migrations
│       └── data.db       → Base locale
│
├── src/                  → React (renderer)
│   ├── components/
│   ├── pages/
│   ├── hooks/
│   ├── utils/
│   └── App.jsx
│
├── tests/                → Tests Jest (mapping, validations)
│
├── package.json
├── electron-builder.yml
└── README.md
```

---

## 5. **API IPC – V1**

### Côté preload (`window.api`)

```js
window.api = {
  loadExcel(filePath),
  getTables(),
  getTableColumns(tableName),
  importData({ table, mapping, rows }),
};
```

### IPC côté main

| Channel         | Rôle                               |
| --------------- | ---------------------------------- |
| `excel:load`    | Lecture Excel → colonnes + preview |
| `db:getTables`  | Liste des tables SQLite            |
| `db:getColumns` | Colonnes d’une table               |
| `db:import`     | Transaction d’insertion            |
| `log:error`     | Journalisation erreurs UI          |

---

## 6. **Fonctionnalités détaillées**

### 1) Import Excel

* Sélection via boîte de dialogue native (`dialog.showOpenDialog`)
* Validation extension `.xlsx`
* Parsing côté main uniquement

### 2) Preview

* Colonnes Excel
* Aperçu des 50 premières lignes

### 3) Mapping UI

Interface React :

| Colonne SQLite | Colonne Excel |
| -------------- | ------------- |
| email          | [Dropdown]    |
| firstname      | [Dropdown]    |
| age            | [Dropdown]    |

### 4) Prévisualisation mappée

* Voir les données “reconstruites”
* Détection lignes invalides (ex: valeur vide sur colonne NOT NULL)

### 5) Import transactionnel SQLite

* BEGIN TRANSACTION
* Insertion ligne par ligne
* Rollback si erreur critique
* Logs détaillés

### 6) Rapport d’import

* Nombre lignes insérées
* Nombre erreurs
* Erreurs listées

---

## 7. Sécurité

### Paramètres Electron

```js
contextIsolation: true,
sandbox: true,
nodeIntegration: false,
enableRemoteModule: false
```

### Garanties

* Aucune fonction Node côté React
* Accès DB uniquement dans main
* Chemins fichiers validés
* Types validés avant insertion
* Injection SQL impossible (paramétrage préparé)

---

## 8. Tests & Qualité

### Tests Jest

* mapping Excel → SQLite
* cast de types simples
* formatage des lignes
* validation des colonnes manquantes
* génération des requêtes d’insertion

### CI/CD GitHub Actions

Pipeline :

1. Lint
2. Tests
3. Build pour Windows/Mac/Linux
4. Release automatique via tag `vX.Y.Z`

---

## 9. Installation & développement

### Installation

```bash
git clone https://github.com/julesgauthier/ExcelToSqlite.git
cd exceltosqlite
npm install
```

### Lancer en mode dev (Electron + React)

```bash
npm run dev
```

### Build app

```bash
npm run build
```

### Tests

Suite complète de 90 tests unitaires et d'intégration avec Jest.

```bash
# Lancer tous les tests
npm run test

# Mode watch (développement)
npm run test:watch

# Rapport de couverture
npm run test:coverage

# Tests unitaires uniquement
npm run test:unit

# Tests d'intégration uniquement
npm run test:integration
```

**Couverture actuelle :**

* ✅ **90 tests** (100% de réussite)
* ✅ **96.68% de couverture** pour transformEngine.js
* ✅ **77.17% de couverture** pour initDb.js
* ✅ **94.82% des fonctions** testées

Documentation complète : [tests README](__tests__/README.md)

---

## 10. Fonctionnalités actuelles

### ✅ V1 - Core Features (Implémenté)

* ✅ Import Excel (.xlsx)
* ✅ Mapping colonnes Excel → SQLite
* ✅ Prévisualisation des données
* ✅ Transaction sécurisée avec gestion d'erreurs
* ✅ Logs d'import avec pagination et recherche
* ✅ **Suite de tests complète (90 tests, 89% de couverture)**

### ✅ V2 - Transformations (Implémenté)

* ✅ **Moteur de transformations avancé**
  * 30+ fonctions intégrées (dates, texte, math, conditions)
  * Support format français (DD/MM/YYYY, espaces milliers, virgule décimale)
  * Interface graphique avec prévisualisation en temps réel
  * Validation syntaxique avec aide contextuelle
  * Documentation intégrée par catégorie
* ✅ Exemples : `AGE({dateNaissance})`, `ROUND({prix} * 1.20, 2)`, `UPPER({nom})`
* ✅ Tests complets (67 tests unitaires + 8 tests d'intégration)

Documentation détaillée : [TRANSFORMATIONS.md](TRANSFORMATIONS.md)

---

## 11. Roadmap – Évolutions futures

### V3

* Suggestion automatique de mapping (ML-based)
* Détection automatique du type de colonne
* Import multi-feuilles Excel
* Templates de mapping sauvegardés

### V4 - Edition & Rollback

* Édition des données mappées avant import (table virtuelle)
* Historique des imports avec rollback
* Mode "dry-run" (simulation d'import)

### V5 - Multi-bases

* Connecteurs pour PostgreSQL / MySQL
* Export DB → Excel automatisé
* Mode CLI
* Import Excel → multiples tables (relationnel)
* Dashboard qualité (anomalies, stats)
