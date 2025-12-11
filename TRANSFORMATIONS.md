# Système de Transformations - Guide d'utilisation

## 🚀 Vue d'ensemble

Le système de transformations permet d'appliquer des calculs et manipulations sur les données Excel **avant** leur insertion dans SQLite.

## ✨ Fonctionnalités

### Syntaxe de base

- **Colonnes** : `{nom_colonne}` - référence une colonne Excel
- **Opérations mathématiques** : `+`, `-`, `*`, `/`, `%`, `^`
- **Fonctions** : 30+ fonctions disponibles dans 5 catégories

### 📅 Fonctions de dates

```javascript
AGE({date_naissance})                      // Calcule l'âge en années
YEAR({date_commande})                      // Extrait l'année
MONTH({date_commande})                     // Extrait le mois (1-12)
DAY({date_commande})                       // Extrait le jour
DATEDIFF({date_fin}, {date_debut})         // Différence en jours
FORMAT_DATE({date}, "dd/MM/yyyy")          // Formate une date
NOW()                                      // Date/heure actuelle
TODAY()                                    // Date du jour (sans heure)
```

### 🔤 Fonctions de texte

```javascript
UPPER({nom})                               // MAJUSCULES
LOWER({email})                             // minuscules
TRIM({prenom})                             // Supprime espaces début/fin
CAPITALIZE({ville})                        // Première Lettre Majuscule
CONCAT({prenom}, " ", {nom})               // Concatène des textes
SUBSTRING({code}, 0, 3)                    // Extrait sous-chaîne
REPLACE({texte}, "ancien", "nouveau")      // Remplace du texte
LEN({description})                         // Longueur du texte
```

### 🔢 Fonctions mathématiques

```javascript
ROUND({prix_ht} * 1.20, 2)                 // Arrondi à 2 décimales
FLOOR({montant})                           // Arrondi inférieur
CEIL({montant})                            // Arrondi supérieur
ABS({difference})                          // Valeur absolue
MIN({prix1}, {prix2})                      // Minimum
MAX({note1}, {note2})                      // Maximum
```

### 🔄 Fonctions de conversion

```javascript
NUMBER({code_postal})                      // Convertit en nombre
STRING({age})                              // Convertit en texte
BOOLEAN({actif})                           // Convertit en booléen
```

### ❓ Fonctions conditionnelles

```javascript
IF({age} >= 18, "Majeur", "Mineur")        // Condition simple
ISEMPTY({email})                           // Teste si vide
IFNULL({telephone}, "Non renseigné")       // Valeur par défaut
```

## 📝 Exemples pratiques

### Calculs commerciaux

```javascript
// Prix TTC avec TVA 20%
{prix_ht} * 1.20

// Remise de 10% si montant > 100
IF({montant} > 100, {montant} * 0.9, {montant})

// Commission de 5%
ROUND({vente} * 0.05, 2)
```

### Manipulation de dates

```javascript
// Âge du client
AGE({date_naissance})

// Année de commande
YEAR({date_commande})

// Délai de livraison en jours
DATEDIFF({date_livraison}, {date_commande})
```

### Nettoyage de données

```javascript
// Nom formaté
UPPER(TRIM({nom}))

// Email en minuscules
LOWER(TRIM({email}))

// Nom complet
CONCAT(CAPITALIZE({prenom}), " ", UPPER({nom}))

// Code postal formaté
STRING(NUMBER({code_postal}))
```

### Logique conditionnelle

```javascript
// Statut selon l'âge
IF({age} >= 18, "Adulte", IF({age} >= 13, "Adolescent", "Enfant"))

// Email avec valeur par défaut
IFNULL({email}, "non.renseigne@example.com")

// Catégorie de prix
IF({prix} >= 100, "Premium", IF({prix} >= 50, "Standard", "Économique"))
```

### Calculs complexes

```javascript
// Note finale (coefficient 2 pour l'examen)
({note_cc} + {note_exam} * 2) / 3

// Prix net avec remise variable
{prix} * (1 - {taux_remise} / 100)

// Salaire annuel brut
{salaire_mensuel} * 12 + IFNULL({prime}, 0)
```

## 🎯 Utilisation dans l'application

1. **Mapper les colonnes** Excel → SQLite
2. **Cliquer sur ⚡** à côté de la colonne cible
3. **Écrire l'expression** de transformation
4. **Prévisualiser** les résultats sur des données exemples
5. **Valider** : la transformation sera appliquée lors de l'import

## ⚠️ Gestion des erreurs

### Mode "Stop" (transaction)
- Si une transformation échoue → **ROLLBACK** complet
- Aucune ligne n'est insérée
- Idéal pour garantir la cohérence des données

### Mode "Continue"
- Si une transformation échoue → ligne ignorée, log d'erreur
- Les autres lignes continuent d'être insérées
- Idéal pour imports de gros volumes avec tolér ance aux erreurs

## 💡 Bonnes pratiques

### Validation
- ✅ Toujours tester avec le bouton "Prévisualiser"
- ✅ Vérifier les types de données résultantes
- ✅ Gérer les valeurs nulles avec `IFNULL()`

### Performance
- ✅ Les transformations simples sont très rapides
- ⚠️ Les fonctions imbriquées complexes peuvent ralentir l'import
- ✅ Préférer des expressions simples et lisibles

### Sécurité
- ✅ Aucune injection SQL possible (expressions sandboxées)
- ✅ Pas d'accès au système de fichiers
- ✅ Validation automatique de la syntaxe

## 🔍 Résolution de problèmes

### "Column not found"
➡️ Vérifiez que le nom de colonne entre `{}` correspond exactement à celui d'Excel

### "Invalid expression"
➡️ Syntaxe incorrecte, vérifiez les parenthèses et noms de fonctions

### "Type mismatch"
➡️ Utilisez les fonctions de conversion (`NUMBER()`, `STRING()`)

### Valeurs nulles inattendues
➡️ Utilisez `IFNULL({colonne}, valeur_defaut)` pour gérer les vides

## 📚 Références

- **mathjs** : moteur d'évaluation des expressions
- **date-fns** : bibliothèque de manipulation de dates
- Toutes les expressions sont évaluées dans un environnement sécurisé

---

🎓 **Astuce** : Commencez par des transformations simples, testez-les, puis combinez-les pour créer des règles plus complexes !
