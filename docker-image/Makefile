.PHONY: help install install-dev test test-unit test-integration lint format check security clean docker-build docker-build-prod docker-build-opt docker-run docker-logs docker-stop setup

# Default target
help: ## Show this help message
	@echo "Available commands:"
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-20s\033[0m %s\n", $$1, $$2}'

# Environment setup
setup: install-dev ## Setup development environment
	@echo "Setting up development environment..."
	@if [ ! -f src/.env ]; then cp src/.env.example src/.env; echo "Created .env from example - please update with your values"; fi
	@pre-commit install
	@echo "✅ Development environment setup complete!"

install: ## Install production dependencies
	pip install -r src/requirements.txt

install-dev: ## Install development dependencies
	pip install -r src/requirements.txt
	pip install -r src/requirements-dev.txt

# Testing
test: ## Run all tests
	cd src && python -m pytest tests/ -v

test-unit: ## Run unit tests only
	cd src && python -m pytest tests/unit/ -v -m "not integration"

test-integration: ## Run integration tests only
	cd src && python -m pytest tests/integration/ -v -m "integration"

test-coverage: ## Run tests with coverage report
	cd src && python -m pytest tests/ --cov=. --cov-report=html --cov-report=term

# Code quality
lint: ## Run linting (flake8, mypy)
	cd src && flake8 .
	cd src && mypy . --ignore-missing-imports

format: ## Format code with black and isort
	cd src && black .
	cd src && isort .

format-check: ## Check formatting without making changes
	cd src && black --check .
	cd src && isort --check-only .

check: format-check lint ## Run all checks (format, lint)

security: ## Run security checks
	cd src && bandit -r . -f json -o security-report.json || true
	cd src && safety check || true

# Database
db-upgrade: ## Run database migrations
	cd src && python -m alembic upgrade head

db-downgrade: ## Rollback database migration
	cd src && python -m alembic downgrade -1

db-reset: ## Reset database (WARNING: destructive)
	cd src && python -m alembic downgrade base
	cd src && python -m alembic upgrade head

# Docker
docker-build: ## Build Docker image for development
	docker build -f docker/Dockerfile.dev -t linkx:dev .

docker-build-prod: ## Build optimized Docker image for production
	docker build -f ../Dockerfile -t linkx:prod ..

docker-build-opt: ## Build optimized Docker image (same as prod)
	docker build -f ../Dockerfile -t linkx:optimized ..

docker-run: ## Run development environment with Docker Compose
	cd .. && docker-compose --profile dev up -d

docker-logs: ## View Docker logs
	cd .. && docker-compose logs -f backend

docker-stop: ## Stop Docker services
	cd .. && docker-compose down

# Utilities
clean: ## Clean up temporary files
	find . -type f -name "*.pyc" -delete
	find . -type d -name "__pycache__" -delete
	find . -type d -name ".pytest_cache" -exec rm -rf {} + 2>/dev/null || true
	find . -type d -name ".mypy_cache" -exec rm -rf {} + 2>/dev/null || true
	find . -name "*.log" -delete

clean-all: clean ## Clean everything including Docker
	cd .. && docker-compose down -v
	docker system prune -f

# Development
dev: ## Start development server
	cd src && python app.py

celery-worker: ## Start Celery worker
	cd src && celery -A celery_app worker --loglevel=info

celery-beat: ## Start Celery beat scheduler
	cd src && celery -A celery_app beat --loglevel=info

flower: ## Start Flower monitoring
	cd src && celery -A celery_app flower --port=5555

# Documentation
docs: ## Generate documentation
	@echo "Documentation generation not implemented yet"

# Git hooks
pre-commit: format lint test-unit ## Run pre-commit checks 