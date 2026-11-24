# FFXI Mission Scraper - Enhancement & Cleanup TODO

This document outlines potential improvements, enhancements, and cleanup tasks for the FFXI Mission Scraper project.

---

## 🧹 Code Cleanup & Consolidation

### High Priority

- [ ] **Consolidate Root-Level Test Files**
  - Move `test-*.js` files to dedicated `test/` or `tests/` directory
  - Files to move: `test-batch-extractor.js`, `test-bestiary.js`, `test-extraction-run.js`, `test-new-urls.js`, `test-roe.js`
  - Create proper test structure with organized subdirectories

- [ ] **Consolidate Root-Level Scripts**
  - Move utility scripts to `scripts/` directory
  - Files to move: `batch-extractor.js`, `download-all-urls.js`, `merge-all-urls.js`, `site-crawler.js`, `compare-downloads.js`
  - Update package.json scripts to reference new locations

- [ ] **Archive Old Implementation Files**
  - Move `.OLD` files to `archive/` or delete if no longer needed
  - Files: `firecrawl_batch_extractor.js.OLD`, `firecrawl_site_scraper.js.OLD`, `firecrawl_site_scraper.py.OLD`

- [ ] **Consolidate Documentation**
  - Already have `DOCUMENTATION.md` which is great
  - Consider moving guide files to `docs/` subdirectory
  - Files: `DOWNLOAD_INSTRUCTIONS.md`, `EXTRACTION_GUIDE.md`, `IMPLEMENTATION_SUMMARY.md`, `QUICK_START.md`, `README_EXTRACTION.md`
  - Keep main `README.md` as entry point with links to `docs/`

- [ ] **Organize Data Directories**
  - Create `data/` directory for processed outputs
  - Subdirectories: `data/urls/`, `data/checkpoints/`, `data/extracted/`
  - Move: `New-URL-list.json`, `NewFFXIClopedia.json`, `merged-urls.json`, `download-checkpoint.json`, `download-log.json`
  - Update references in code

- [ ] **Clean Up Test Artifacts**
  - Move `test_extracted_data/` to `tests/fixtures/` or similar
  - Move `test-extraction*.json` files to test directory
  - Move `examples/` to proper location or document better

- [ ] **Organize Domain-Specific Data**
  - Move `BeastiaryLinks/`, `REMAData/`, `ROE/`, `UnityNMData/` to `data/sources/` or similar
  - Clear structure for different game content types

### Medium Priority

- [ ] **Remove Deleted Documentation References**
  - Git shows deleted: `BACKUP_RESTORE.md`, `BEFORE_AFTER_COMPARISON.md`, `COMMIT_GUIDE.md`, etc.
  - Commit these deletions to clean up git status

- [ ] **Standardize Naming Conventions**
  - Some files use kebab-case: `download-all-urls.js`
  - Some use camelCase: `compareDownloads.js`
  - Choose one convention and apply consistently

- [ ] **Create .gitignore Improvements**
  - Add patterns for: `download-checkpoint.json`, `download-log.json`
  - Add: `test_extracted_data/`, `*.OLD` files
  - Add: Large JSON files that are generated

- [ ] **Reduce Output Directory Size**
  - Current output is 686M
  - Implement compression for older/archived mission data
  - Add cleanup script to remove duplicate/old data

---

## 🔁 Code Deduplication & Refactoring

### Critical (High Impact on Maintainability)

- [ ] **Extract ContentDetector Class**
  - Files affected: `item-parser.js`, `job-parser.js`, `spell-parser.js`, `zone-parser.js`
  - Current: Each parser has similar `isXPage()` detection logic
  - Target: Single `ContentDetector` utility with methods for each content type
  - Impact: Changes to detection strategy only need one update instead of 4+

- [ ] **Centralize Text Cleaning Utilities**
  - Current: `cleanText()` implemented in BaseParser, mission-parser.js, and multiple utils
  - Target: Single `TextUtils` module with methods: `cleanText()`, `normalizeWhitespace()`, `stripHtml()`
  - Impact: Consistent text processing across all parsers

- [ ] **Consolidate Infobox Extraction**
  - Current: `infobox-extractor.js` for missions + similar logic in item/job/spell parsers
  - Target: Generic `InfoboxParser` class that works for all content types
  - Impact: Easier to maintain and extend infobox parsing

- [ ] **Centralize ID Generation**
  - Files affected: BaseParser, mission-parser, multiple utilities (5+ locations)
  - Current: `generateId()`, `generateMissionId()`, inconsistent slug generation
  - Target: Single `IdGenerator` utility with configurable strategies
  - Impact: Consistent IDs across all data types

- [ ] **Abstract HTML File Reading**
  - Current: BaseParser uses one method, mission-parser.js different, some use readFile directly
  - Target: `HtmlLoader` service with caching and error handling
  - Impact: Consistent HTML loading with better performance

- [ ] **Consolidate URL Management Tools**
  - Current: `url-list-merger.js` (574 lines), `url-deduplicator.js` (263 lines), `enhanced-url-loader.js` (264 lines)
  - Target: Single `UrlManager` class with methods: merge, deduplicate, load, validate
  - Impact: Reduce overlapping functionality, easier to maintain

### Medium Priority Refactoring

- [ ] **Split mission-parser.js (617 lines)**
  - Extract to mission-parser/ directory with:
    - `walkthrough-parser.js` - Walkthrough text processing
    - `prerequisite-parser.js` - Prerequisite extraction
    - `metadata-parser.js` - Metadata extraction
    - `mission-builder.js` - Mission object construction
    - `index.js` - Main orchestrator

- [ ] **Split metadata-enricher.js (540 lines)**
  - Extract modules:
    - `chain-calculator.js` - Dependency chain calculation
    - `statistics-generator.js` - Mission statistics
    - `enrichment-service.js` - Core enrichment logic

- [ ] **Split url-list-merger.js (574 lines)**
  - Separate concerns:
    - `merge-strategy.js` - URL merging logic
    - `validation.js` - URL validation
    - `source-loader.js` - Load URLs from different sources

- [ ] **Consolidate Error Handling**
  - Create custom error classes: `ParseError`, `ScraperError`, `ValidationError`, `NetworkError`
  - Standardize error patterns across all parsers
  - Add error context (file, line, URL being processed)

- [ ] **Extract URL-to-Filename Logic**
  - Current: BaseParser.urlToFilename() + download-manager.js has similar
  - Issue: Base64 encoding in http.js vs character replacement elsewhere
  - Target: Single source of truth for filename conversion

---

## ⚡ Feature Enhancements

### Scraping Capabilities

- [ ] **Add More Mission Set Scrapers**
  - Windurst Rank Missions
  - Rise of the Zilart missions
  - Chains of Promathia missions
  - Treasures of Aht Urhgan missions
  - Wings of the Goddess missions (partially implemented)
  - Seekers of Adoulin missions
  - Rhapsodies of Vana'diel

- [ ] **Quest Scraping System**
  - Similar structure to mission scraper
  - Support for quest chains and dependencies
  - Fame requirements tracking
  - Reward tracking (items, gil, fame)

- [ ] **Item Database Scraper**
  - Parse item pages from wikis
  - Extract: stats, requirements, acquisition methods
  - Link items to missions/quests that reward them
  - Support for equipment, key items, consumables

- [ ] **Zone/Map Data Scraper**
  - Extract zone information
  - NPC locations
  - Connection between zones
  - POI markers for missions/quests

- [ ] **NPC Database**
  - Extract NPC data from wikis
  - Link NPCs to missions/quests they're involved in
  - Location data
  - Dialogue/interaction info

- [ ] **Achievement/Records of Eminence Expansion**
  - More comprehensive ROE scraping (started in `src/scrapers/roe/`)
  - Full objective tracking
  - Reward data
  - Prerequisite chains

### Data Quality & Validation

- [ ] **Enhanced Schema Validation**
  - Add more strict validation rules
  - Validate cross-references between entities
  - Check for broken internal links
  - Validate coordinate formats

- [ ] **Data Completeness Checker**
  - Report on missing fields
  - Identify partially-scraped content
  - Quality score for each scraped entity
  - Generate reports on data gaps

- [ ] **Duplicate Detection System**
  - Already started with `url-deduplicator.js` and `html-deduplicator.js`
  - Extend to detect duplicate mission entries
  - Merge duplicate bestiary entries
  - Smart conflict resolution

- [ ] **Update Detection System**
  - Compare current scrapes with previous versions
  - Detect when wiki content changes
  - Alert on significant differences
  - Version history for scraped data

### Performance & Efficiency

- [ ] **Incremental Scraping**
  - Only re-scrape changed content
  - Cache validated against update timestamps
  - Smart invalidation strategies
  - Reduce unnecessary network requests

- [ ] **Parallel Processing**
  - Already using `p-limit` but could optimize further
  - Process multiple mission sets simultaneously
  - Concurrent bestiary scraping
  - Batch HTML processing

- [ ] **Database Backend Option**
  - SQLite or PostgreSQL option instead of JSON files
  - Better query performance
  - Relational data modeling
  - Full-text search capabilities

- [ ] **Content Delivery Optimization**
  - Generate minified JSON for production
  - Create API endpoints for filtered queries
  - Implement pagination for large datasets
  - CDN-ready output formats

### Developer Experience

- [ ] **Proper Testing Suite**
  - Unit tests for parsers
  - Integration tests for scrapers
  - Snapshot testing for HTML parsing
  - Test coverage reporting
  - Use Jest, Mocha, or Vitest

- [ ] **Better Error Handling**
  - Structured error types
  - Better error messages with context
  - Retry logic with exponential backoff
  - Error aggregation and reporting

- [ ] **Logging System**
  - Replace console.log with proper logger (winston, pino)
  - Log levels (debug, info, warn, error)
  - Log to file option
  - Structured logging for analysis

- [ ] **Configuration Management**
  - Centralized config file (config.json or .env)
  - Environment-specific configs
  - Validation for configuration values
  - Better use of `.env.example`

- [ ] **CLI Improvements**
  - Add progress bars (using `cli-progress` or `ora`)
  - Better colored output (using `chalk`)
  - Interactive mode for selecting mission sets
  - Better help documentation

### Data Export & Integration

- [ ] **Multiple Export Formats**
  - CSV export for spreadsheet analysis
  - GraphQL schema generation
  - Markdown export for documentation
  - XML/RSS feeds

- [ ] **API Server**
  - Express/Fastify REST API
  - GraphQL API option
  - WebSocket for real-time updates
  - API documentation with Swagger/OpenAPI

- [ ] **iOS App Integration Package**
  - Already started in `ios-app-package/`
  - Generate Swift-compatible JSON structure
  - Type definitions for Swift Codable
  - Optimized payload sizes
  - Sync protocol design

- [ ] **Web Visualization**
  - Mission dependency graph viewer
  - Interactive map with mission locations
  - Progress tracking interface
  - Search and filter UI

---

## 🔧 Technical Improvements

### Code Quality

- [ ] **TypeScript Migration**
  - Convert to TypeScript for better type safety
  - Replace Zod with TypeScript types where appropriate
  - Better IDE support and autocompletion

- [ ] **ESLint & Prettier Setup**
  - Standardize code formatting
  - Enforce coding standards
  - Pre-commit hooks for validation

- [ ] **Refactor Large Functions**
  - Some parser functions are quite long
  - Extract reusable components
  - Better separation of concerns
  - Single Responsibility Principle

- [ ] **Dependency Audit**
  - Review all dependencies for updates
  - Remove unused dependencies
  - Check for security vulnerabilities
  - Consider lighter alternatives

### Architecture

- [ ] **Service Layer Abstraction**
  - Create `ParserService` that abstracts parser selection
  - Create `ScraperRegistry` for managing all scrapers
  - Create `DataValidator` service (centralize validation)
  - Dependency injection for better testability

- [ ] **Plugin System**
  - Allow custom scrapers as plugins
  - Dynamic scraper registration
  - Community-contributed scrapers
  - Plugin marketplace/registry

- [ ] **Event System**
  - Emit events during scraping process
  - Allow hooks/middleware
  - Progress tracking via events
  - Error handling via events

- [ ] **Caching Strategy Improvements**
  - Implement proper cache invalidation
  - Add cache warming scripts
  - Cache statistics and monitoring
  - Multiple cache backends (Redis option)

- [ ] **Modular Parser Architecture**
  - Plugin-based parser system
  - Custom parsers for different wiki engines
  - Parser versioning
  - Fallback parser chains
  - Parser factory pattern (already partially implemented)

- [ ] **Data Mapper Layer**
  - Abstract layer between scrapers and storage
  - Transform scraped data to canonical format
  - Handle versioning and migrations
  - Separate concerns: scraping vs persistence

---

## 📊 Data Enhancement

### Content Enrichment

- [ ] **Auto-Linking System**
  - Automatically link mission text to entities
  - Link item names to item database
  - Link NPC names to NPC database
  - Link zone names to zone data

- [ ] **Metadata Extraction**
  - Extract dates from wiki history
  - Pull edit counts and contributors
  - Identify authoritative sources
  - Confidence scoring

- [ ] **Natural Language Processing**
  - Extract key phrases from descriptions
  - Categorize mission types automatically
  - Identify objectives from walkthrough text
  - Generate summaries

- [ ] **Image Scraping & Optimization**
  - Download mission-related images
  - Map screenshots
  - NPC portraits
  - Item icons
  - Optimize and resize for app use

### Data Relationships

- [ ] **Enhanced Dependency Tracking**
  - Already have basic dependency system
  - Track optional vs required dependencies
  - Alternative path detection
  - Recommended order suggestions

- [ ] **Timeline Construction**
  - Build chronological story timeline
  - Order missions by in-game lore
  - Expansion release ordering
  - Event timeline integration

- [ ] **Difficulty Estimation**
  - Calculate difficulty based on requirements
  - Consider level, gear, party size
  - Community feedback integration
  - Solo-ability scoring

---

## 🚀 Advanced Features

### Machine Learning & AI

- [ ] **Content Classification**
  - Auto-categorize missions
  - Detect mission types (combat, fetch, story)
  - Identify required jobs/roles
  - Tag generation

- [ ] **Recommendation Engine**
  - Suggest next missions based on completion
  - Consider player level and progress
  - Alternative mission suggestions
  - Optimal mission order

- [ ] **Anomaly Detection**
  - Detect scraping errors via ML
  - Identify unusual data patterns
  - Flag potential wiki vandalism
  - Data quality scoring

### Community Features

- [ ] **User Contribution System**
  - Allow community corrections
  - User-submitted walkthroughs
  - Rating and review system
  - Verification workflow

- [ ] **Diff Viewer**
  - Show changes between scrapes
  - Community review of changes
  - Approval workflow
  - Version comparison

- [ ] **Localization Support**
  - Multi-language scraping
  - Japanese wiki support
  - Translation management
  - Language-specific parsers

### Monitoring & Analytics

- [ ] **Scraping Dashboard**
  - Real-time scraping status
  - Success/failure rates
  - Performance metrics
  - Historical trends

- [ ] **Data Quality Metrics**
  - Completeness scores
  - Validation pass rates
  - Coverage statistics
  - Quality trends over time

- [ ] **Usage Analytics**
  - Track which data is accessed
  - Popular missions/content
  - API usage statistics
  - Performance bottlenecks

---

## 🎨 New Scraping Capabilities

### Additional Game Content Types

- [ ] **Notorious Monster (NM) Scraper**
  - Build on bestiary scraper foundation
  - Track spawn conditions (lottery, forced, timed)
  - Loot tables and drop rates
  - Claiming strategies
  - Integration with `UnityNMData/` directory

- [ ] **REMA Weapons Scraper**
  - Relic, Empyrean, Mythic, Aeonic weapons
  - Multi-stage upgrade paths
  - Material requirements per stage
  - Integration with `REMAData/` directory

- [ ] **Crafting Recipe Database**
  - All crafting guilds (8 guilds)
  - Recipe ingredients and yields
  - Guild point requirements
  - Crystal requirements
  - Skillup potential ranges

- [ ] **Unity Content Scraper**
  - Unity NM information
  - Unity quests and accolades
  - Leader abilities
  - Integration with `UnityNMData/` directory

- [ ] **Ambuscade Scraper**
  - Monthly rotation content
  - Difficulty levels (N/D/VD)
  - Reward systems
  - Boss mechanics

- [ ] **Trust Magic Database**
  - All trust NPCs
  - Acquisition methods
  - Combat roles and abilities
  - Recommended uses

- [ ] **Battlefield/BCNM Scraper**
  - All battlefield content
  - Entry requirements (orbs, KIs)
  - Rewards and loot pools
  - Party composition recommendations

- [ ] **Dynamis/High-Tier Battle Content**
  - Dynamis zones and currencies
  - High-tier mission battlefields (Sortie, Odyssey)
  - Segment/RP requirements
  - Boss strategies

### Enhanced Data Types

- [ ] **Shop/Vendor Database**
  - NPC vendors and their inventories
  - Regional availability
  - Conquest point shops
  - Seasonal vendors

- [ ] **Synthesis Recipes**
  - HQ synthesis chances
  - Subcrafts required
  - Guild point items
  - Desynthesis data

- [ ] **Augment System Data**
  - Augment paths for equipment
  - Possible stat ranges
  - Required materials
  - RNG mechanics documentation

- [ ] **Mount/Transport Data**
  - Mount acquisition methods
  - Chocobo breeding/raising
  - Taxi routes and costs

---

## 📝 Documentation Improvements

- [ ] **API Documentation**
  - Document all public functions
  - JSDoc comments throughout
  - Auto-generate API docs
  - Usage examples for each function

- [ ] **Architecture Diagram**
  - Visual representation of system
  - Data flow diagrams
  - Component relationships
  - Deployment architecture

- [ ] **Contributing Guide**
  - How to add new scrapers
  - Code style guide
  - PR process
  - Testing requirements

- [ ] **Deployment Guide**
  - Production deployment instructions
  - Docker containerization
  - CI/CD pipeline setup
  - Monitoring setup

- [ ] **Video Tutorials**
  - Getting started video
  - Adding custom scrapers
  - Using the CLI
  - Integration examples

---

## 🔐 Security & Reliability

- [ ] **Rate Limiting Enhancements**
  - Already have basic rate limiting
  - Adaptive rate limiting
  - Per-domain rate limits
  - Respect robots.txt

- [ ] **Error Recovery**
  - Automatic retry logic
  - Circuit breaker pattern
  - Graceful degradation
  - Failover strategies

- [ ] **Data Validation**
  - Sanitize scraped HTML
  - Prevent XSS in stored data
  - Validate URLs before fetching
  - Schema versioning

- [ ] **Backup & Recovery**
  - Automated backups
  - Point-in-time recovery
  - Disaster recovery plan
  - Data redundancy

---

## 🎯 Quick Wins (Easy Implementations)

These can be done quickly for immediate value:

1. [ ] Move all test files to `tests/` directory
2. [ ] Create `scripts/` directory for utility scripts
3. [ ] Add progress bars to long-running operations
4. [ ] Implement proper logging with log levels
5. [ ] Add `.gitignore` entries for generated files
6. [ ] Create `docs/` directory for documentation
7. [ ] Add ESLint configuration
8. [ ] Commit deleted files to clean git status
9. [ ] Create archive directory for old files
10. [ ] Add compression for large output files

---

## 📈 Metrics & Success Criteria

### Coverage Metrics
- [ ] Track % of FFXI missions scraped
- [ ] Monitor bestiary coverage
- [ ] Quest completion percentage
- [ ] Item database coverage

### Quality Metrics
- [ ] Data validation pass rate >95%
- [ ] Successful scrape rate >90%
- [ ] Average scrape time per mission
- [ ] Cache hit rate

### Performance Metrics
- [ ] Scrape time for full mission set
- [ ] API response time <100ms
- [ ] Memory usage during scraping
- [ ] Storage efficiency

---

## 🏗️ Future Vision

### Long-term Goals
- Comprehensive FFXI game database
- Real-time wiki monitoring
- Community platform integration
- Mobile app backend
- Player progress tracking
- Guild/linkshell coordination tools
- Event calendar integration
- Market price tracking
- Crafting recipe database

### Potential Integrations
- Discord bot for mission lookups
- Slack integration for tracking
- GitHub Actions for automated scraping
- Cloudflare Workers for edge deployment
- Google Sheets export
- Notion database integration

---

## 🛠️ Technical Quality Enhancements

### Parser Improvements

- [ ] **Robust Whitespace Handling**
  - Handle &nbsp;, multiple spaces, tabs consistently
  - Normalize line breaks
  - Preserve intentional formatting in walkthroughs

- [ ] **Better Link Extraction**
  - Extract relative vs absolute URLs correctly
  - Handle wiki-specific link formats
  - Resolve redirects
  - Track dead/broken links

- [ ] **Table Parsing Utilities**
  - Generic table-to-JSON converter
  - Handle rowspan/colspan
  - Extract headers properly
  - Support for nested tables

- [ ] **List Parsing Enhancements**
  - Nested list handling
  - Preserve hierarchy in walkthrough steps
  - Bullet vs numbered list detection

### Output Optimization

- [ ] **JSON Minification Pipeline**
  - Minified production builds
  - Pretty-printed development builds
  - Remove null/undefined fields option
  - Configurable field exclusion

- [ ] **Incremental Output Generation**
  - Stream large datasets instead of buffering
  - Write mission sets incrementally
  - Avoid loading entire dataset in memory

- [ ] **Data Versioning**
  - Schema version in all outputs
  - Migration scripts for schema changes
  - Backward compatibility handling

- [ ] **Output Validation**
  - Validate all outputs against schemas before writing
  - Generate validation reports
  - Auto-fix common issues

### Scraping Resilience

- [ ] **Better Failure Recovery**
  - Checkpoint more granularly (per mission, not per set)
  - Resume from exact failure point
  - Preserve partial results

- [ ] **Wiki Format Change Detection**
  - Detect when wiki HTML structure changes
  - Alert when parsing confidence drops
  - Version parsers per wiki layout

- [ ] **Fallback Parsing Strategies**
  - Try multiple parsing approaches
  - Graceful degradation on partial failures
  - Extract what's possible, flag what's missing

### Performance Enhancements

- [ ] **Parallel Mission Set Processing**
  - Process multiple mission sets simultaneously
  - Configurable concurrency limits
  - Better utilization of multi-core systems

- [ ] **Smart Caching**
  - Cache parsed results, not just HTML
  - Invalidate cache when parser version changes
  - LRU cache for frequently accessed data

- [ ] **Lazy Loading**
  - Don't load all URLs into memory
  - Stream URL processing
  - Generator-based iteration

---

## Priority Matrix

### Critical (Do First)
1. **Code Deduplication** - Extract ContentDetector, TextUtils, InfoboxParser, IdGenerator
2. **File Structure Organization** - Consolidate root files, create proper directory structure
3. **Refactor Monolithic Files** - Split mission-parser.js, metadata-enricher.js, url-list-merger.js
4. **Add Proper Testing Suite** - Unit tests for parsers, integration tests for scrapers

### High Priority
1. **Service Layer Abstraction** - ParserService, ScraperRegistry, DataValidator
2. **Error Handling Standardization** - Custom error classes, consistent patterns
3. **Complete Mission Set Scrapers** - All defined mission sets in config
4. **Enhanced Validation** - Cross-reference validation, completeness checking

### Medium Priority
1. **Database Backend Option** - SQLite/PostgreSQL alternative to JSON
2. **API Server Implementation** - REST/GraphQL API for data access
3. **Performance Optimization** - Parallel processing, streaming, caching
4. **Additional Content Types** - Quests, NMs, REMA, crafting

### Low Priority (Nice to Have)
1. **TypeScript Migration** - Type safety and better IDE support
2. **Web Visualization** - Dependency graphs, interactive maps
3. **ML/AI Features** - Content classification, recommendations
4. **Community Features** - Contributions, reviews, localization

---

## Notes

- Many features are already partially implemented (bestiary, ROE, URL management)
- Focus on consolidation before adding new features
- Prioritize data quality over quantity
- Consider community needs for iOS app integration
- Balance between automation and maintainability

---

## 📊 Current Codebase Metrics (as of 2026-01-02)

### Size & Complexity
- **Total Source Code**: ~12,950 lines
- **JavaScript Files**: 1,946 total (80+ in src/, 1,800+ elsewhere)
- **Exported Functions/Classes**: 119
- **Total Functions/Classes**: 396
- **Output Data**: 1.4GB in output/ directory
- **JSON Files**: 116 configuration/data files

### Key Files Needing Attention
| File | Lines | Issue | Priority |
|------|-------|-------|----------|
| mission-parser.js | 617 | Monolithic, needs splitting | High |
| url-list-merger.js | 574 | Multiple responsibilities | High |
| metadata-enricher.js | 540 | Mixed concerns | Medium |
| mission-sets-reference.js | 527 | Mixed concerns | Medium |
| download-manager.js | 454 | Could be more modular | Low |
| link-parser.js | 410 | Complex, needs docs | Low |

### Duplication Hotspots
1. **Content Detection** - 4+ files with similar `isXPage()` logic
2. **Text Cleaning** - 3+ implementations of `cleanText()`
3. **Infobox Extraction** - 2+ similar approaches
4. **ID Generation** - 5+ locations with slug generation
5. **URL Management** - 3 overlapping tools (merger, deduplicator, loader)

### Directory Organization Issues
- **50+ loose files in project root** (tests, scripts, data files)
- **Backup directories**: backups/ (12MB), .OLD files
- **Unorganized data**: BeastiaryLinks/, REMAData/, ROE/, UnityNMData/
- **Missing structure**: No tests/, scripts/, data/, docs/ directories

### Test Coverage
- **Unit Tests**: None (all test files are integration/manual tests)
- **Integration Tests**: ~12 files but disorganized in root
- **Test Coverage %**: Unknown (no coverage tooling)

### Documentation Status
- ✅ Comprehensive: README.md, DOCUMENTATION.md
- ✅ Good: QUICK_START.md, EXTRACTION_GUIDE.md
- ⚠️ Fragmented: 5+ guide files should consolidate to docs/
- ❌ Missing: Architecture diagram, contributor guide, API docs

---

## 🎯 Recommended Implementation Phases

### Phase 1: Foundation Cleanup (Week 1-2)
**Goal**: Organize codebase, remove clutter, establish clean baseline

1. Create proper directory structure (tests/, scripts/, data/, docs/)
2. Move all loose files to appropriate directories
3. Archive/delete .OLD files and backups/
4. Update package.json scripts for new paths
5. Improve .gitignore for generated files
6. Commit git deletions to clean status

**Impact**: Easier navigation, cleaner git status, professional structure

### Phase 2: Code Deduplication (Week 3-5)
**Goal**: Eliminate duplicated code patterns, create reusable utilities

1. Extract ContentDetector class (item, job, spell, zone detection)
2. Create TextUtils module (cleanText, normalize, stripHtml)
3. Build generic InfoboxParser
4. Centralize IdGenerator
5. Create HtmlLoader service
6. Consolidate URL management tools

**Impact**: Easier maintenance, consistent behavior, reduced bugs

### Phase 3: Refactoring Large Files (Week 6-8)
**Goal**: Break monolithic files into focused modules

1. Split mission-parser.js into 5-6 modules
2. Refactor metadata-enricher.js (extract chain calculator, statistics)
3. Split url-list-merger.js (separate merge, validate, load)
4. Standardize error handling with custom error classes

**Impact**: Better code organization, easier testing, clearer responsibilities

### Phase 4: Quality & Testing (Week 9-11)
**Goal**: Establish testing infrastructure and improve code quality

1. Set up Jest/Vitest testing framework
2. Write unit tests for parsers (target 70%+ coverage)
3. Create integration test suite
4. Add ESLint + Prettier with pre-commit hooks
5. Implement proper logging system (winston/pino)
6. Add JSDoc comments throughout

**Impact**: Code reliability, easier refactoring, better developer experience

### Phase 5: Architecture Improvements (Week 12-16)
**Goal**: Build service layer, improve patterns

1. Create ParserService abstraction
2. Build ScraperRegistry for scraper management
3. Implement DataValidator service
4. Add dependency injection for testability
5. Create data mapper layer
6. Implement event system for progress tracking

**Impact**: Better separation of concerns, easier to extend, more testable

### Phase 6: Feature Enhancement (Week 17+)
**Goal**: Expand capabilities with solid foundation in place

1. Complete all mission set scrapers (from config)
2. Build quest scraping system
3. Add NM/REMA scrapers
4. Implement database backend option
5. Create REST/GraphQL API
6. Build web visualization tools

**Impact**: More comprehensive data, better data access, user value

---

## 💡 Quick Wins for Immediate Value

These can be done in 1-2 hours each for immediate improvement:

1. ✅ **Move test files** → `tests/` directory (30 min)
2. ✅ **Move scripts** → `scripts/` directory (30 min)
3. ✅ **Create docs/** → Move all .md guides (20 min)
4. ✅ **Update .gitignore** → Add generated file patterns (10 min)
5. ✅ **Archive .OLD files** → Move to archive/ or delete (15 min)
6. ✅ **Add progress bars** → Use ora/cli-progress in long operations (1 hour)
7. ✅ **Improve logging** → Add log levels to console output (1 hour)
8. ✅ **Commit deletions** → Clean git status (5 min)
9. ✅ **Add compression** → Gzip large JSON outputs (1 hour)
10. ✅ **Create CONTRIBUTING.md** → Basic guide for contributors (1 hour)

---

## 🔍 Specific Improvement Ideas by Category

### Data Quality
- Cross-reference validator (ensure mission prerequisites exist)
- Completeness scoring (% of fields populated)
- Duplicate mission detector (same mission from different sources)
- Confidence scores (based on parsing success)
- Data freshness tracking (last scraped timestamp)

### Developer Experience
- Interactive CLI mode (pick missions to scrape)
- Better error messages (context about what failed)
- Dry-run mode (preview what will be scraped)
- Verbose/quiet/debug log levels
- Color-coded console output

### Performance
- Worker threads for parallel processing
- Streaming JSON parser for large files
- Database indexing for fast queries
- CDN-ready output formats (minified, compressed)
- Incremental builds (only re-scrape changed content)

### Scraping Intelligence
- Auto-detect when wiki structure changes
- Parser confidence scoring
- Fallback to alternate parsers on failure
- Smart retry with exponential backoff
- Rate limit auto-adjustment

### Data Enrichment
- Auto-link items/NPCs/zones in text
- Extract coordinates from walkthrough text
- Build relationship graphs (mission → items → NPCs)
- Generate mission difficulty scores
- Create optimal progression paths

### Integration & Export
- Export to CSV for Excel analysis
- GraphQL schema generation
- Generate TypeScript types from schemas
- Create Postman/Insomnia collections
- Build Discord bot for lookups

---

## 🚨 Anti-Patterns to Avoid

While implementing improvements, watch out for these:

1. **Over-Engineering**: Don't build abstractions until you need them
2. **Premature Optimization**: Profile before optimizing
3. **Feature Creep**: Complete cleanup before adding features
4. **Breaking Changes**: Maintain backward compatibility in outputs
5. **Tight Coupling**: Keep scrapers independent
6. **Magic Numbers**: Use named constants
7. **Silent Failures**: Always log errors
8. **Callback Hell**: Use async/await consistently
9. **God Objects**: Keep classes focused
10. **Hardcoded Paths**: Use configuration

---

## 📈 Success Metrics

Track these to measure improvement:

### Code Quality Metrics
- Lines of code: Should stabilize or decrease with refactoring
- Cyclomatic complexity: Target <10 per function
- Code duplication: Target <5%
- Test coverage: Target >70%

### Performance Metrics
- Scrape time per mission: Target <2s average
- Memory usage: Target <500MB for full scrape
- Output size: Optimize for <50% of current
- Cache hit rate: Target >80%

### Data Quality Metrics
- Successful parse rate: Target >95%
- Field completeness: Target >90%
- Validation pass rate: Target >98%
- Broken link rate: Target <2%

### Developer Metrics
- Time to add new scraper: Target <2 hours
- Build time: Target <30s
- Test suite run time: Target <2 minutes
- Onboarding time: Target <1 hour

---

Last Updated: 2026-01-02
