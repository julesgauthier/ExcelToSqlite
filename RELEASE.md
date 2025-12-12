# 🚀 Guide de Release - Excel2SQLite

## Comment créer une nouvelle release

### 1. Préparer la release

```powershell
# 1. S'assurer que tout est committé
git status

# 2. Mettre à jour le numéro de version dans package.json
# Éditer manuellement package.json : "version": "1.0.0"

# 3. Commiter le changement de version
git add package.json
git commit -m "chore: bump version to 1.0.0"
```

### 2. Créer et pousser le tag

```powershell
# Créer un tag annoté (recommandé)
git tag -a v1.0.0 -m "Release version 1.0.0"

# Pousser le commit et le tag
git push origin develop  # ou main
git push origin v1.0.0
```

### 3. Le workflow se déclenche automatiquement

Une fois le tag poussé :
- ✅ Le workflow `release.yml` démarre automatiquement
- ✅ Il build l'executable Windows
- ✅ Il crée une GitHub Release avec :
  - Le fichier `.exe` en téléchargement
  - Les notes de version auto-générées (basées sur les commits)
  - Un lien de téléchargement direct

### 4. Vérifier la release

Aller sur : `https://github.com/julesgauthier/ExcelToSqlite/releases`

Tu verras ta nouvelle release avec l'exe téléchargeable ! 🎉

---

## 📌 Convention de versioning (Semantic Versioning)

Format : `MAJOR.MINOR.PATCH` (ex: `1.2.3`)

- **MAJOR** (1.x.x) : Changements incompatibles (breaking changes)
- **MINOR** (x.1.x) : Nouvelles fonctionnalités compatibles
- **PATCH** (x.x.1) : Corrections de bugs

### Exemples

```powershell
# Première release
git tag -a v1.0.0 -m "Release initiale"

# Correction de bug
git tag -a v1.0.1 -m "Fix: correction import Excel"

# Nouvelle fonctionnalité
git tag -a v1.1.0 -m "Feature: ajout export JSON"

# Breaking change
git tag -a v2.0.0 -m "Breaking: nouvelle architecture DB"
```

---

## 🔧 Commandes utiles

```powershell
# Lister tous les tags
git tag

# Voir les détails d'un tag
git show v1.0.0

# Supprimer un tag local
git tag -d v1.0.0

# Supprimer un tag distant (⚠️ attention)
git push origin :refs/tags/v1.0.0

# Créer une pre-release (beta, rc, etc.)
git tag -a v1.0.0-beta.1 -m "Beta release"
```

---

## 📝 Workflow automatique

Le fichier `.github/workflows/release.yml` :
- Se déclenche sur les tags `v*.*.*`
- Build l'exe Windows
- Crée la release GitHub
- Attache l'exe automatiquement
- Génère les notes de version depuis les commits

**Pas besoin d'intervention manuelle !** 🚀
