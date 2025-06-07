# LEARN-X Documentation

This directory contains all documentation for the LEARN-X platform, organized by purpose and audience.

## Directory Structure

### 📚 Development
- **`development/`** - Developer guides and development documentation
  - `claude-guide.md` - AI Assistant development guide for working with this codebase
  - `frontend/icons-migration-strategy.md` - Frontend icons migration strategy

### 🚀 Deployment
- **`deployment/`** - Deployment guides and scripts
  - `production-guide.md` - Complete production deployment guide
  - `docker-optimization.md` - Docker optimization and containerization guide
  - `supabase-checklist.md` - Supabase deployment checklist
  - `environment-cleanup.md` - Environment configuration cleanup summary
  - `scripts/` - Deployment and management scripts
    - `deploy.sh` - Main deployment script
    - `run_frontend.sh` - Frontend startup script

### ⚙️ Operations
- **`operations/`** - Operations, monitoring, and troubleshooting
  - `runbooks.md` - Operational runbooks and troubleshooting guides
  - `monitoring/` - Monitoring and alerting configurations
    - `prometheus.yml` - Prometheus monitoring configuration
    - `alertmanager.yml` - Alert manager configuration
    - `grafana-dashboard.json` - Grafana dashboard configuration
    - `loki.yml` - Loki logging configuration
    - `promtail.yml` - Promtail log collection configuration
    - `blackbox.yml` - Blackbox exporter configuration
    - `grafana/` - Additional Grafana dashboards
    - `alerts/` - Alert rule definitions

### ✨ Features
- **`features/`** - Feature-specific documentation
  - `gamification-setup.md` - Gamification system setup guide
  - `embeddings-migration.md` - Supabase embeddings migration guide

### 🏗️ Infrastructure
- **`infrastructure/`** - Infrastructure as code and configuration
  - `cloudflare-cdn.tf` - Cloudflare CDN Terraform configuration
  - `api-versioning-config.yml` - API versioning configuration
  - `docker-compose.monitoring.yml` - Monitoring stack Docker Compose

### ⚖️ Legal
- **`legal/`** - Legal documents and licenses
  - `LICENSE` - Apache 2.0 License

## Quick Reference

### For Developers
Start with `development/claude-guide.md` for comprehensive development guidelines.

### For DevOps/Operations
- `deployment/production-guide.md` - Production deployment
- `operations/runbooks.md` - Troubleshooting and operations
- `operations/monitoring/` - Monitoring setup and configuration

### For System Administrators
- `infrastructure/` - Infrastructure configuration files
- `deployment/scripts/` - Automation scripts

## Navigation Tips

1. **New to the project?** Start with `development/claude-guide.md`
2. **Setting up production?** Follow `deployment/production-guide.md`
3. **Need to troubleshoot?** Check `operations/runbooks.md`
4. **Configuring monitoring?** See `operations/monitoring/`
5. **Working with features?** Browse `features/` directory

## Contributing to Documentation

When adding new documentation:
1. Place it in the appropriate category directory
2. Use clear, descriptive filenames
3. Update this README if adding new categories
4. Follow the existing documentation style and format

## Documentation Standards

- Use Markdown format (`.md`)
- Include clear headings and structure
- Add code examples where applicable
- Keep documentation up-to-date with code changes
- Use relative links for internal references