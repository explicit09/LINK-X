# Frontend Refactoring Plan: coralx-frontend → frontend

## Executive Summary

This plan outlines the systematic refactoring of the `coralx-frontend` directory to `frontend`, including updating all references, improving the structure, and ensuring no functionality is broken.

## Current State Analysis

### Directory Structure
```
coralx-frontend/
├── app/                    # Next.js app directory
├── components/             # React components
├── hooks/                  # Custom React hooks
├── lib/                    # Utility libraries
├── public/                 # Static assets
├── types/                  # TypeScript type definitions
├── scripts/                # Build and utility scripts
├── package.json            # Dependencies
├── next.config.ts          # Next.js configuration
├── tailwind.config.ts      # Tailwind CSS configuration
└── tsconfig.json           # TypeScript configuration
```

## Refactoring Steps

### Phase 1: Pre-refactoring Preparation (30 minutes)

#### 1.1 Create Backup
```bash
# Create a backup of the current state
cp -r coralx-frontend coralx-frontend.backup
```

#### 1.2 Document Current References
- Search for all hardcoded references to "coralx-frontend"
- Document all configuration files that reference the directory
- List all scripts and commands that use the directory name

### Phase 2: Directory Rename (15 minutes)

#### 2.1 Rename Directory
```bash
# Stop all running processes first
# Then rename the directory
mv coralx-frontend frontend
```

#### 2.2 Update Git Tracking
```bash
# Stage the rename in git
git add -A
git commit -m "refactor: rename coralx-frontend to frontend"
```

### Phase 3: Update Internal References (1 hour)

#### 3.1 Update Package.json
- Change package name from "coralx-frontend" to "frontend"
- Update any scripts that reference the directory

#### 3.2 Update Import Paths
Search and replace in all files:
- `from 'coralx-frontend/` → `from 'frontend/`
- `import .* from ['"]coralx-frontend` → `import .* from ['"]frontend`

#### 3.3 Update Configuration Files
Files to check and update:
- `next.config.ts`
- `tsconfig.json`
- `tailwind.config.ts`
- `.eslintrc.json`
- `jest.config.js`

### Phase 4: Update External References (1 hour)

#### 4.1 Docker References
Update in Docker files:
- Dockerfile paths
- docker-compose.yml volume mounts
- Build context paths

#### 4.2 CI/CD Scripts
Update in:
- GitHub Actions workflows
- Deployment scripts
- Build scripts

#### 4.3 Backend References
Search backend code for:
- API endpoint configurations
- CORS settings referencing frontend URL
- Static file serving paths

#### 4.4 Documentation
Update all documentation:
- README files
- API documentation
- Development guides
- Deployment guides

### Phase 5: Update Scripts and Commands (30 minutes)

#### 5.1 Root Level Scripts
Update in project root:
- `run_frontend.sh`
- `package.json` scripts (if any)
- Makefile (if exists)

#### 5.2 Development Commands
Document and update:
- Local development commands
- Build commands
- Test commands

### Phase 6: Testing and Validation (1 hour)

#### 6.1 Build Test
```bash
cd frontend
npm install
npm run build
```

#### 6.2 Development Server Test
```bash
npm run dev
# Verify all pages load correctly
```

#### 6.3 Production Build Test
```bash
npm run build
npm start
```

#### 6.4 Docker Build Test
```bash
docker-compose build frontend
docker-compose up frontend
```

#### 6.5 Integration Test
- Test frontend-backend communication
- Verify all API calls work
- Check authentication flow
- Test file uploads

### Phase 7: Clean Up (30 minutes)

#### 7.1 Remove Old References
- Delete any cached files with old paths
- Clear browser caches
- Remove old Docker images

#### 7.2 Update Development Environment
- Update IDE workspace settings
- Update bookmarks and shortcuts
- Update team documentation

## File-by-File Checklist

### Critical Files to Update

1. **Docker Files**
   - [ ] `docker-compose.yml`
   - [ ] `docker-compose.dev.yml`
   - [ ] `docker-compose.prod.yml`
   - [ ] `Dockerfile` (if frontend has one)

2. **Scripts**
   - [ ] `run_frontend.sh`
   - [ ] `manage.sh`
   - [ ] Any deployment scripts

3. **Configuration**
   - [ ] `frontend/package.json`
   - [ ] `frontend/next.config.ts`
   - [ ] `frontend/tsconfig.json`
   - [ ] Environment variable files

4. **Documentation**
   - [ ] Main README.md
   - [ ] Frontend README.md
   - [ ] API documentation
   - [ ] Setup guides

5. **Backend Integration**
   - [ ] CORS configuration
   - [ ] API base URL configuration
   - [ ] WebSocket configuration

## Potential Issues and Solutions

### Issue 1: Hardcoded Paths
**Problem**: Hardcoded paths in source code
**Solution**: Use environment variables for paths

### Issue 2: Cached References
**Problem**: Build caches with old paths
**Solution**: Clear all caches before testing

### Issue 3: Git History
**Problem**: Git might lose track of file history
**Solution**: Use `git mv` command properly

### Issue 4: Running Processes
**Problem**: Processes running with old paths
**Solution**: Stop all processes before refactoring

### Issue 5: IDE References
**Problem**: IDE might have cached paths
**Solution**: Restart IDE after refactoring

## Commands Reference

### Search for References
```bash
# Find all references to coralx-frontend
grep -r "coralx-frontend" . --exclude-dir=node_modules --exclude-dir=.git

# Find in specific file types
find . -name "*.json" -o -name "*.ts" -o -name "*.tsx" | xargs grep -l "coralx-frontend"
```

### Update References
```bash
# Batch replace in files (macOS)
find . -type f -name "*.ts" -o -name "*.tsx" -o -name "*.json" | xargs sed -i '' 's/coralx-frontend/frontend/g'

# Batch replace in files (Linux)
find . -type f -name "*.ts" -o -name "*.tsx" -o -name "*.json" | xargs sed -i 's/coralx-frontend/frontend/g'
```

## Rollback Plan

If issues arise:

1. **Immediate Rollback**
   ```bash
   mv frontend coralx-frontend
   git reset --hard HEAD~1
   ```

2. **From Backup**
   ```bash
   rm -rf frontend
   mv coralx-frontend.backup coralx-frontend
   ```

## Success Criteria

- [ ] All builds complete successfully
- [ ] Development server runs without errors
- [ ] Production build works correctly
- [ ] All tests pass
- [ ] Frontend-backend integration works
- [ ] No broken imports or references
- [ ] Documentation is updated
- [ ] Team is notified of changes

## Timeline

- **Total Estimated Time**: 4-5 hours
- **Recommended**: Perform during low-traffic period
- **Team Communication**: Notify team before starting

## Post-Refactoring Tasks

1. Update deployment documentation
2. Update onboarding documentation
3. Create redirect from old paths (if needed)
4. Monitor for any issues for 24 hours
5. Remove backup after 1 week of stable operation

## Notes

- This is a breaking change for any external references
- All team members need to update their local environments
- CI/CD pipelines will need to be updated
- Consider creating an alias or symlink temporarily for backwards compatibility