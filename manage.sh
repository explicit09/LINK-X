#!/bin/bash
# Unified management script for LINK-X1

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Default environment
ENV=${ENV:-development}

show_help() {
    echo "LINK-X1 Management Script"
    echo ""
    echo "Usage: ./manage.sh [command] [options]"
    echo ""
    echo "Commands:"
    echo "  backend [env]       Run backend server (development/staging/production)"
    echo "  frontend           Run frontend development server"
    echo "  build             Build Docker images with cache"
    echo "  build-clean       Build Docker images without cache"
    echo "  db-reset          Reset database content (interactive)"
    echo "  db-reset-force    Reset database content (no confirmation)"
    echo "  db-migrate        Run database migrations"
    echo "  db-backup         Backup database (production only)"
    echo "  reprocess         Reprocess all files in S3"
    echo "  test              Run all tests"
    echo "  test-backend      Run backend tests"
    echo "  test-frontend     Run frontend tests"
    echo "  deploy [env]      Deploy to environment (staging/production)"
    echo "  logs [service]    View logs for a service"
    echo "  shell [service]   Open shell in service container"
    echo "  clean             Clean up containers and volumes"
    echo "  help              Show this help message"
    echo ""
    echo "Examples:"
    echo "  ./manage.sh backend              # Run backend in development mode"
    echo "  ./manage.sh backend production   # Run backend in production mode"
    echo "  ./manage.sh deploy staging       # Deploy to staging"
    echo "  ./manage.sh db-reset            # Reset database (with confirmation)"
    echo "  ./manage.sh logs backend        # View backend logs"
}

# Backend management
run_backend() {
    local env=${1:-development}
    echo -e "${GREEN}Starting backend in $env mode...${NC}"
    
    case $env in
        development)
            docker-compose -f docker-compose.dev.yml up --build
            ;;
        staging)
            docker-compose -f docker-compose.staging.yml up -d
            ;;
        production)
            docker-compose -f docker-compose.production.yml up -d
            ;;
        streaming)
            # Special streaming-optimized configuration
            docker-compose -f docker-compose.optimized.yml up --build
            ;;
        *)
            echo -e "${RED}Invalid environment: $env${NC}"
            exit 1
            ;;
    esac
}

# Frontend management
run_frontend() {
    echo -e "${GREEN}Starting frontend development server...${NC}"
    cd coralx-frontend
    npm install --legacy-peer-deps
    npm run dev
}

# Build management
build_images() {
    local no_cache=$1
    echo -e "${GREEN}Building Docker images...${NC}"
    
    if [ "$no_cache" = "clean" ]; then
        docker-compose build --no-cache
    else
        docker-compose build
    fi
}

# Database management
db_reset() {
    local force=$1
    echo -e "${YELLOW}Resetting database content...${NC}"
    
    if [ "$force" = "force" ]; then
        docker-compose run --rm backend python -m src.reset_db_content_force
    else
        docker-compose run --rm backend python -m src.reset_db_content
    fi
}

db_migrate() {
    echo -e "${GREEN}Running database migrations...${NC}"
    docker-compose run --rm backend python -m src.run_migrations || \
    docker-compose run --rm backend python src/run_migrations.py
}

db_backup() {
    echo -e "${GREEN}Backing up database...${NC}"
    ./scripts/backup-database.sh
}

# File processing
reprocess_files() {
    echo -e "${GREEN}Reprocessing all files in S3...${NC}"
    docker-compose run --rm backend python -m src.reprocess_all_files_s3
}

# Testing
run_tests() {
    local target=$1
    
    case $target in
        backend)
            echo -e "${GREEN}Running backend tests...${NC}"
            docker-compose -f docker-compose.dev.yml run --rm backend bash -c "cd /app && python -m pytest src/tests/ -v"
            ;;
        frontend)
            echo -e "${GREEN}Running frontend tests...${NC}"
            cd coralx-frontend && npm test
            ;;
        *)
            echo -e "${GREEN}Running all tests...${NC}"
            run_tests backend
            run_tests frontend
            ;;
    esac
}

# Deployment
deploy() {
    local env=$1
    
    if [ -z "$env" ]; then
        echo -e "${RED}Please specify environment: staging or production${NC}"
        exit 1
    fi
    
    echo -e "${GREEN}Deploying to $env...${NC}"
    ./scripts/deploy-$env.sh
}

# Utility functions
view_logs() {
    local service=$1
    
    if [ -z "$service" ]; then
        docker-compose logs -f
    else
        docker-compose logs -f $service
    fi
}

open_shell() {
    local service=${1:-backend}
    docker-compose exec $service /bin/bash
}

clean_up() {
    echo -e "${YELLOW}Cleaning up Docker resources...${NC}"
    docker-compose down -v
    docker system prune -f
}

# Main command handler
case $1 in
    backend)
        run_backend $2
        ;;
    frontend)
        run_frontend
        ;;
    build)
        build_images
        ;;
    build-clean)
        build_images clean
        ;;
    db-reset)
        db_reset
        ;;
    db-reset-force)
        db_reset force
        ;;
    db-migrate)
        db_migrate
        ;;
    db-backup)
        db_backup
        ;;
    reprocess)
        reprocess_files
        ;;
    test)
        run_tests $2
        ;;
    test-backend)
        run_tests backend
        ;;
    test-frontend)
        run_tests frontend
        ;;
    deploy)
        deploy $2
        ;;
    logs)
        view_logs $2
        ;;
    shell)
        open_shell $2
        ;;
    clean)
        clean_up
        ;;
    help|"")
        show_help
        ;;
    *)
        echo -e "${RED}Unknown command: $1${NC}"
        show_help
        exit 1
        ;;
esac