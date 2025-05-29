#!/bin/bash
# Simple management script for LEARN-X

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

function help() {
    echo "LEARN-X Management Script"
    echo ""
    echo "Usage: ./manage.sh [command]"
    echo ""
    echo "Commands:"
    echo "  dev       - Start development environment"
    echo "  prod      - Start production environment" 
    echo "  stop      - Stop all services"
    echo "  logs      - View logs"
    echo "  shell     - Access backend shell"
    echo "  migrate   - Run database migrations"
    echo "  monitor   - View performance dashboard"
    echo "  clean     - Clean up containers and volumes"
    echo ""
}

case "$1" in
    dev)
        echo -e "${GREEN}Starting development environment...${NC}"
        docker-compose --profile dev up
        ;;
    prod)
        echo -e "${GREEN}Starting production environment...${NC}"
        ./deploy_production.sh
        ;;
    stop)
        echo -e "${YELLOW}Stopping all services...${NC}"
        docker-compose down
        ;;
    logs)
        service=${2:-""}
        if [ -z "$service" ]; then
            docker-compose logs -f
        else
            docker-compose logs -f $service
        fi
        ;;
    shell)
        echo -e "${GREEN}Accessing backend shell...${NC}"
        docker-compose exec backend bash
        ;;
    migrate)
        echo -e "${GREEN}Running database migrations...${NC}"
        docker-compose run --rm backend bash -c "cd /app/src/db && alembic upgrade head"
        ;;
    monitor)
        echo -e "${GREEN}Starting performance monitor...${NC}"
        docker-compose exec backend python scripts/monitor_performance.py
        ;;
    clean)
        echo -e "${RED}Cleaning up containers and volumes...${NC}"
        docker-compose down -v
        ;;
    *)
        help
        ;;
esac