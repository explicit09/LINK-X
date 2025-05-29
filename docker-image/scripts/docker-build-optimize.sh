#!/bin/bash
# Docker build optimization script

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
DOCKER_BUILDKIT=1
COMPOSE_DOCKER_CLI_BUILD=1

echo -e "${GREEN}Docker Build Optimization Script${NC}"
echo "=================================="

# Function to build with cache
build_with_cache() {
    local dockerfile=$1
    local tag=$2
    local target=$3
    
    echo -e "${YELLOW}Building $tag...${NC}"
    
    if [ -n "$target" ]; then
        docker build \
            --cache-from $tag:cache \
            --target $target \
            -t $tag:cache \
            -f docker/$dockerfile \
            .
    fi
    
    docker build \
        --cache-from $tag:cache \
        --cache-from $tag:latest \
        -t $tag:latest \
        -f docker/$dockerfile \
        .
}

# Function to analyze image size
analyze_image() {
    local image=$1
    echo -e "${YELLOW}Analyzing $image...${NC}"
    docker images $image:latest --format "table {{.Repository}}\t{{.Tag}}\t{{.Size}}"
    
    # Show layer details
    echo -e "${YELLOW}Layer breakdown:${NC}"
    docker history $image:latest --human --format "table {{.CreatedBy}}\t{{.Size}}"
}

# Function to run security scan
security_scan() {
    local image=$1
    echo -e "${YELLOW}Security scanning $image...${NC}"
    
    # Use trivy if available
    if command -v trivy &> /dev/null; then
        trivy image --security-checks vuln $image:latest
    else
        echo "Trivy not found. Install with: brew install aquasecurity/trivy/trivy"
    fi
}

# Parse command line arguments
ACTION=${1:-build}
ENVIRONMENT=${2:-dev}

cd /Users/explicit/Documents/GitHub/LEARN-X/docker-image

case $ACTION in
    build)
        echo -e "${GREEN}Building images for $ENVIRONMENT environment${NC}"
        
        if [ "$ENVIRONMENT" = "dev" ]; then
            # Development build
            build_with_cache "Dockerfile.dev" "learnx-backend-dev" ""
            
        elif [ "$ENVIRONMENT" = "prod" ]; then
            # Production multi-stage build
            echo -e "${YELLOW}Building dependencies stage...${NC}"
            docker build \
                --target python-deps \
                -t learnx-backend-prod:deps \
                -f docker/Dockerfile.multistage \
                .
            
            echo -e "${YELLOW}Building builder stage...${NC}"
            docker build \
                --cache-from learnx-backend-prod:deps \
                --target app-builder \
                -t learnx-backend-prod:builder \
                -f docker/Dockerfile.multistage \
                .
            
            echo -e "${YELLOW}Building final image...${NC}"
            docker build \
                --cache-from learnx-backend-prod:deps \
                --cache-from learnx-backend-prod:builder \
                -t learnx-backend-prod:latest \
                -f docker/Dockerfile.multistage \
                .
        fi
        
        echo -e "${GREEN}Build complete!${NC}"
        ;;
        
    analyze)
        echo -e "${GREEN}Analyzing images${NC}"
        
        if [ "$ENVIRONMENT" = "dev" ]; then
            analyze_image "learnx-backend-dev"
        else
            analyze_image "learnx-backend-prod"
        fi
        ;;
        
    optimize)
        echo -e "${GREEN}Optimizing images${NC}"
        
        # Remove dangling images
        echo -e "${YELLOW}Removing dangling images...${NC}"
        docker image prune -f
        
        # Remove unused build cache
        echo -e "${YELLOW}Cleaning build cache...${NC}"
        docker builder prune -f
        
        # Show space saved
        echo -e "${GREEN}Optimization complete!${NC}"
        docker system df
        ;;
        
    security)
        echo -e "${GREEN}Running security scans${NC}"
        
        if [ "$ENVIRONMENT" = "dev" ]; then
            security_scan "learnx-backend-dev"
        else
            security_scan "learnx-backend-prod"
        fi
        ;;
        
    benchmark)
        echo -e "${GREEN}Benchmarking build times${NC}"
        
        # Clean everything first
        docker builder prune -af
        
        # Time the build
        START_TIME=$(date +%s)
        
        if [ "$ENVIRONMENT" = "dev" ]; then
            time docker build -f docker/Dockerfile.dev -t learnx-backend-dev:bench .
        else
            time docker build -f docker/Dockerfile.multistage -t learnx-backend-prod:bench .
        fi
        
        END_TIME=$(date +%s)
        DURATION=$((END_TIME - START_TIME))
        
        echo -e "${GREEN}Build completed in $DURATION seconds${NC}"
        ;;
        
    compare)
        echo -e "${GREEN}Comparing image sizes${NC}"
        
        # Build both old and new versions
        echo -e "${YELLOW}Building old Dockerfile...${NC}"
        docker build -f docker/Dockerfile -t learnx-backend:old .
        
        echo -e "${YELLOW}Building optimized Dockerfile...${NC}"
        docker build -f docker/Dockerfile.multistage -t learnx-backend:new .
        
        # Compare sizes
        echo -e "${GREEN}Size comparison:${NC}"
        docker images --format "table {{.Repository}}\t{{.Tag}}\t{{.Size}}" | grep learnx-backend
        
        # Calculate savings
        OLD_SIZE=$(docker images learnx-backend:old --format "{{.Size}}")
        NEW_SIZE=$(docker images learnx-backend:new --format "{{.Size}}")
        echo -e "${GREEN}Old size: $OLD_SIZE${NC}"
        echo -e "${GREEN}New size: $NEW_SIZE${NC}"
        ;;
        
    *)
        echo "Usage: $0 {build|analyze|optimize|security|benchmark|compare} {dev|prod}"
        echo ""
        echo "Commands:"
        echo "  build     - Build Docker images"
        echo "  analyze   - Analyze image layers and size"
        echo "  optimize  - Clean up and optimize Docker resources"
        echo "  security  - Run security scans on images"
        echo "  benchmark - Benchmark build times"
        echo "  compare   - Compare old vs new image sizes"
        exit 1
        ;;
esac