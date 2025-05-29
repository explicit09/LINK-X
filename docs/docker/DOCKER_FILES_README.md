# Docker Configuration

## Files

- **Dockerfile.dev** - Development image with hot reload and debugging tools
- **Dockerfile.prod** - Production image optimized for size and performance
- **entrypoint.sh** - Container entrypoint script

## Usage

### Development
```bash
docker build -f docker/Dockerfile.dev -t learnx:dev .
```

### Production
```bash
docker build -f docker/Dockerfile.prod -t learnx:prod .
```

## Notes

- Development image includes debugging tools and allows code mounting
- Production image is minimal and optimized for deployment
- Both images use the same entrypoint script