# LINK-X Cleanup Plan

## CRITICAL SECURITY ISSUE
🚨 **IMMEDIATE**: `docker-image/.env` contains exposed Firebase private key - DELETE NOW

## Files to Delete (Safe to Remove)

### 1. Duplicate Dockerfiles
```bash
rm docker-image/Dockerfile.optimized  # Duplicate
rm docker-image/docker/Dockerfile.multistage  # Unused
rm docker-image/docker/Dockerfile.test  # Can integrate into main
```

### 2. Legacy/Backup Files  
```bash
rm docker-image/src/app_legacy_backup.py
rm docker-image/src/api/legacy.py
rm docker-image/src/utils/legacy_tasks.py
rm docker-image/src/api/legacy_routes.py
```

### 3. Duplicate Documentation
```bash
rm "docs/docker/REFACTORING_COMPLETE 2.md"  # Has space - duplicate
rm docs/docker/DOCKER_REFACTORING_COMPLETE.md  # Similar to above
```

### 4. Old Deployment Script
```bash
rm deploy_production.sh  # Keep deploy_production_v2.sh instead
```

### 5. Environment File Security
```bash
# CRITICAL: Remove exposed keys
rm docker-image/.env  # Contains Firebase private key!
# Then regenerate with: cp .env.example.secure docker-image/.env
```

## Files to Review/Consolidate

### Docker Compose Files
- Consider merging into single docker-compose.yml with profiles
- Current: 4 separate files (main, production, test, monitoring)

### Test Scripts  
- `run_tests.sh` vs `scripts/run-all-tests.sh` - consolidate
- `run_backend_tests.sh` - might be redundant

### Documentation
- Merge similar refactoring docs in docs/docker/
- Update README.md with content from README_v2.md

## Estimated Space Savings
- **Docker files**: ~5-10KB
- **Legacy code**: ~15-20KB  
- **Duplicate docs**: ~30-40KB
- **Environment files**: Critical security fix

## Next Steps
1. 🚨 **URGENT**: Secure Firebase keys
2. Run cleanup script for safe deletions
3. Consolidate test runners
4. Merge docker-compose files
5. Update documentation 