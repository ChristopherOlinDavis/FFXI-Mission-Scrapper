# Git Commit Guide

## What to Commit to Repository

This guide helps you decide what files should be committed to git after the cleanup.

---

## ✅ SHOULD COMMIT (Essential Files)

### Core Application Code
```bash
git add src/                              # All source code
git add scripts/                          # Build and utility scripts
git add package.json                      # Dependencies
git add .gitignore                        # Updated ignore rules
```

### Documentation
```bash
git add README.md                         # Main project readme
git add BACKUP_RESTORE.md                 # Backup/restore instructions (NEW)
git add COMMIT_GUIDE.md                   # This file (NEW)
git add PARSER_IMPROVEMENTS.md            # Parser enhancement docs (if exists)
git add PACKAGING_INSTRUCTIONS.md         # iOS packaging guide (if exists)
```

### iOS Integration Files
```bash
git add ios-app-package/*.md              # Integration guides
git add ios-app-package/*.swift           # Swift model files
git add ios-app-package/WOTG_QUEST_GATES.md
```

### Configuration Files
```bash
git add src/scrapers/mission-sets-config.json
git add rebuild-api-with-wotg.js          # API rebuild script
```

### Backup Archives (IMPORTANT)
```bash
git add backups/*.tar.gz                  # Compressed output data
```

---

## ❌ SHOULD NOT COMMIT (Ignored)

### Raw Output Data
```bash
# These are now in backups/*.tar.gz
output/*.json          # ❌ Ignored by .gitignore
outputHTMLs/           # ❌ Ignored by .gitignore (deleted anyway)
ios-app-package/*.json # ❌ Ignored by .gitignore
```

### Temporary/Generated Files
```bash
node_modules/          # ❌ npm packages
*.log                  # ❌ Log files
.DS_Store              # ❌ Mac OS files
```

### Old Documentation (Already Deleted)
```bash
BUG_FIXES.md           # ❌ Deleted (consolidated elsewhere)
EXAMPLE_OUTPUT.md      # ❌ Deleted
REGRESSION_SUMMARY.md  # ❌ Deleted
docs/expand-button-feature.md  # ❌ Old/outdated
```

### Legacy Extracted HTML
```bash
outputHTMLs/extracted/ # ❌ Deleted (was 355 deleted files)
```

---

## 🤔 REVIEW BEFORE COMMITTING

### New Documentation Files
Check if these are still relevant or should be consolidated:

```bash
BEFORE_AFTER_COMPARISON.md    # Review: merge into PARSER_IMPROVEMENTS.md?
FINAL_SUMMARY.md              # Review: merge into README.md?
RE-SCRAPE_SUMMARY.md          # Review: merge into BACKUP_RESTORE.md?
WOTG_STRUCTURE_DIAGRAM.md     # Review: keep if useful for future reference
WOTG_UNIFIED_STRUCTURE.md     # Review: merge into main docs?
```

### Old Zip Files
```bash
ffxi-missions-ios-package.zip # Review: delete? (superseded by backups/)
outputHTMLs.zip               # Review: delete? (superseded by backups/)
```

**Recommendation**: Delete old zips and keep only the tar.gz backups:
```bash
rm ffxi-missions-ios-package.zip
rm outputHTMLs.zip
```

---

## 📋 Suggested Commit Workflow

### Step 1: Clean up redundant docs
```bash
# Delete old zip files (superseded by backups/)
rm ffxi-missions-ios-package.zip
rm outputHTMLs.zip

# Optionally consolidate documentation
# (Review and merge content, then delete originals)
```

### Step 2: Stage essential files
```bash
# Core code
git add src/
git add scripts/
git add package.json
git add .gitignore

# New documentation
git add BACKUP_RESTORE.md
git add COMMIT_GUIDE.md

# iOS integration
git add ios-app-package/*.md
git add ios-app-package/*.swift

# Configuration
git add src/scrapers/mission-sets-config.json
git add rebuild-api-with-wotg.js

# Backup archives (IMPORTANT!)
git add backups/
```

### Step 3: Review staged changes
```bash
git status
git diff --cached
```

### Step 4: Commit
```bash
git commit -m "Major cleanup: compress outputs, update docs, remove redundant files

- Compressed output/ (3.3MB) → backups/output-json-backup-20251230.tar.gz (477KB)
- Compressed outputHTMLs/ (72MB) → backups/outputHTMLs-backup-20251230.tar.gz (12MB)
- Compressed ios-app-package/ (620KB) → backups/ios-app-package-backup-20251230.tar.gz (62KB)
- Deleted 355 extracted HTML files from outputHTMLs/extracted/
- Deleted obsolete *-rank.json files (incorrect scraper output)
- Deleted empty stub files (bgwiki-bastok.json, ffxiclopedia-assault.json, etc.)
- Updated .gitignore to exclude raw outputs but include backup archives
- Added BACKUP_RESTORE.md with restore instructions
- Total space saved: ~64MB → ~12.5MB (80% reduction)

Generated with Claude Code"
```

---

## 🎯 What Gets Committed?

**Repository contents after commit:**

```
.
├── .gitignore                    # ✅ Updated
├── README.md                     # ✅ Main docs
├── BACKUP_RESTORE.md             # ✅ NEW
├── COMMIT_GUIDE.md               # ✅ NEW
├── package.json                  # ✅ Dependencies
├── backups/                      # ✅ NEW
│   ├── output-json-backup-20251230.tar.gz        (477 KB)
│   ├── outputHTMLs-backup-20251230.tar.gz        (12 MB)
│   └── ios-app-package-backup-20251230.tar.gz    (62 KB)
├── ios-app-package/              # ✅ (*.md, *.swift only)
│   ├── INTEGRATION_GUIDE.md
│   ├── Models.swift
│   ├── README.md
│   └── WOTG_QUEST_GATES.md
├── src/                          # ✅ All source code
│   ├── builders/
│   ├── parsers/
│   ├── schemas/
│   ├── scrapers/
│   └── utils/
└── scripts/                      # ✅ Build scripts
```

**NOT in repository (but backed up in backups/):**
- output/*.json (31 files, restored on demand)
- outputHTMLs/ (2,300 HTML files, restored on demand)
- ios-app-package/*.json (7 files, restored on demand)

---

## 🚀 Benefits of This Strategy

1. **Smaller Repository**: 76 MB → 12.5 MB (83% smaller)
2. **Faster Clones**: Other developers don't need 2,300 HTML files
3. **Better Git Performance**: No large binary JSON files to diff
4. **Version Control Focus**: Git tracks code changes, not data
5. **Data Safety**: Compressed backups are safer than raw files
6. **Easy Restore**: Single command to restore all data when needed

---

## 📌 Summary

**Commit these:**
- ✅ All source code (src/, scripts/)
- ✅ Documentation (*.md)
- ✅ Configuration (package.json, .gitignore)
- ✅ Backup archives (backups/*.tar.gz)
- ✅ iOS integration files (*.md, *.swift)

**Don't commit these:**
- ❌ Raw output JSON (output/*.json)
- ❌ Raw HTML cache (outputHTMLs/)
- ❌ Generated iOS JSON (ios-app-package/*.json)
- ❌ Old zip files
- ❌ Temporary/log files

**Result:**
Clean, efficient repository with all code and data safely preserved!
