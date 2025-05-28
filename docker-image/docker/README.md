# Docker Configuration

This directory contains all Docker-related configuration files:

- `Dockerfile` - Main development Dockerfile
- `Dockerfile.optimized` - Optimized Dockerfile with better layer caching
- `Dockerfile.production` - Production-ready multi-stage build
- `entrypoint.sh` - Container entrypoint script

## Usage

The Docker files are referenced from the root docker-compose files:
- `docker-compose.yml` - Uses the main Dockerfile for development
- `docker-compose.optimized.yml` - Uses Dockerfile.optimized
- `docker-compose.production.yml` - Uses pre-built production images