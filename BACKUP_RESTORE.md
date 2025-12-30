# Backup & Restore Guide

## Overview

To keep the repository clean and lightweight, output data is compressed and stored in the `backups/` directory. This guide explains how to restore the data when needed.

---

## Current Backup State

**Last Backup Date**: December 30, 2024

| Archive | Original Size | Compressed Size | Compression |
|---------|---------------|-----------------|-------------|
| `output-json-backup-20251230.tar.gz` | 3.3 MB | 477 KB | 86% |
| `outputHTMLs-backup-20251230.tar.gz` | 72 MB | 12 MB | 83% |
| `ios-app-package-backup-20251230.tar.gz` | 620 KB | 62 KB | 90% |

**Total Space Saved**: ~64 MB → ~12.5 MB (80% reduction)

---

## What's Backed Up

### 1. **output-json-backup-20251230.tar.gz**
Contains 31 parsed mission JSON files including:
- Nation missions (Bastok, San d'Oria, Windurst)
- Expansion missions (Zilart, Promathia, WotG, etc.)
- Quest collections (Abyssea, Adoulin, Aht Urhgan, etc.)
- Aggregated `api-response.json`

### 2. **outputHTMLs-backup-20251230.tar.gz**
Contains 2,300 raw HTML files downloaded from:
- FFXIclopedia wiki pages
- BG Wiki pages
- Used as cache to avoid re-downloading during development

### 3. **ios-app-package-backup-20251230.tar.gz**
Contains 7 curated JSON files for iOS app:
- `api-response.json` (aggregated data)
- `ffxiclopedia-bastok.json`
- `ffxiclopedia-sandoria.json`
- `ffxiclopedia-windurst.json`
- `promathia.json`
- `wotg.json`
- `zilart.json`

---

## How to Restore

### Restore All Output Data

```bash
# From project root
cd /Users/chris/Projects/FFXI-Mission-Scrapper-claude-ffxi-mission-scraper-Kg8i5

# Extract all backups
tar -xzf backups/output-json-backup-20251230.tar.gz
tar -xzf backups/outputHTMLs-backup-20251230.tar.gz
tar -xzf backups/ios-app-package-backup-20251230.tar.gz
```

### Restore Specific Outputs

**Only JSON outputs:**
```bash
tar -xzf backups/output-json-backup-20251230.tar.gz
```

**Only HTML cache:**
```bash
tar -xzf backups/outputHTMLs-backup-20251230.tar.gz
```

**Only iOS app package:**
```bash
tar -xzf backups/ios-app-package-backup-20251230.tar.gz
```

---

## Creating New Backups

When you regenerate the output data, create fresh backups:

```bash
# Create timestamped backups
tar -czf backups/output-json-backup-$(date +%Y%m%d).tar.gz output/*.json
tar -czf backups/outputHTMLs-backup-$(date +%Y%m%d).tar.gz outputHTMLs/
tar -czf backups/ios-app-package-backup-$(date +%Y%m%d).tar.gz ios-app-package/*.json

# Optional: Remove old backups to save space
rm backups/output-json-backup-20251230.tar.gz
rm backups/outputHTMLs-backup-20251230.tar.gz
rm backups/ios-app-package-backup-20251230.tar.gz
```

---

## Backup Retention Policy

- **Keep**: Latest 2 backups of each type
- **Archive**: Monthly snapshots (if significant changes)
- **Delete**: Backups older than 3 months (unless tagged for archival)

---

## Why This Approach?

1. **Repository Size**: Reduces git repo from ~76 MB to ~12.5 MB
2. **Version Control**: Git tracks code, not data (data rarely changes)
3. **Data Safety**: Compressed backups are easier to store/transfer
4. **Clean Workspace**: Easier to navigate project without 2,300 HTML files
5. **Regeneration**: Parser can always regenerate outputs from source

---

## Data Regeneration

Instead of restoring backups, you can regenerate the data:

```bash
# Parse all missions (uses HTML cache if available)
npm run parse:all

# Download fresh HTML (if cache is missing)
npm run download:all
```

**Note**: This data is scraped from public wikis and doesn't change frequently. Backups are primarily for convenience during development.

---

## Emergency Recovery

If backups are lost but you have the HTML cache:

1. Restore `outputHTMLs-backup-20251230.tar.gz`
2. Run `npm run parse:all` to regenerate JSON outputs

If all backups are lost:

1. Run `npm run download:all` to fetch fresh HTML
2. Run `npm run parse:all` to generate fresh JSON outputs

---

## Git Strategy

### What's in Git
- ✅ Source code (src/, scripts/)
- ✅ Documentation (*.md)
- ✅ Package configuration (package.json)
- ✅ Backup archives (backups/*.tar.gz)
- ✅ iOS integration files (ios-app-package/*.md, *.swift)

### What's Ignored
- ❌ Raw output files (output/*.json)
- ❌ Raw HTML cache (outputHTMLs/)
- ❌ Temporary files
- ❌ Node modules

See [.gitignore](.gitignore) for full list.

---

## Summary

**Before cleanup**: 76 MB of uncompressed outputs
**After cleanup**: 12.5 MB of compressed backups
**Space saved**: 63.5 MB (83% reduction)

All data is safely backed up and can be restored in seconds when needed!
