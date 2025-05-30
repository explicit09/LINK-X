# LINK-X1 - AI-Powered Learning Management System

## 🚀 Overview

LINK-X1 is a modern, AI-powered learning management system that provides personalized education experiences. Built with Next.js, Flask, and cutting-edge AI technologies, it offers intelligent content generation, adaptive learning paths, and real-time collaboration features.

### Key Features
- 🤖 **AI-Powered Learning**: Personalized content generation and adaptive learning paths
- 📚 **Course Management**: Comprehensive tools for instructors and students
- 🎯 **Smart Recommendations**: AI-driven content suggestions based on learning patterns
- 📊 **Progress Tracking**: Detailed analytics and progress monitoring
- 🔄 **Real-time Collaboration**: Live streaming and interactive learning sessions
- 📱 **Responsive Design**: Seamless experience across all devices

## 🏗️ Architecture Overview

```
LINK-X1/
├── frontend/                 # Next.js 14 application
├── docker-image/            # Flask backend application
├── infrastructure/          # CDN and deployment configs
├── monitoring/             # Prometheus, Grafana, Loki stack
├── scripts/                # Utility and deployment scripts
├── tests/                  # End-to-end tests
└── docs/                   # Project documentation
```

## 🛠️ Tech Stack

### Frontend
- **Framework**: Next.js 14 with App Router
- **UI Library**: React 18 with TypeScript
- **Styling**: Tailwind CSS + shadcn/ui components
- **State Management**: React Context + SWR
- **Authentication**: Firebase Auth

### Backend
- **Framework**: Flask with Python 3.9+
- **API**: RESTful API with v1/v2 versioning
- **Database**: PostgreSQL with pgvector extension
- **Cache**: Redis
- **File Storage**: AWS S3
- **Task Queue**: Celery with Redis broker

### AI/ML
- **LLM Integration**: OpenAI GPT-4
- **Embeddings**: OpenAI text-embedding-3
- **Vector Search**: pgvector
- **Document Processing**: LangChain

### Infrastructure
- **Containerization**: Docker & Docker Compose
- **CDN**: Cloudflare Workers
- **Monitoring**: Prometheus + Grafana
- **Logging**: Loki + Promtail
- **Error Tracking**: Sentry

## 🚦 Getting Started

### Prerequisites
- Node.js 18+ and npm/yarn
- Python 3.9+
- Docker and Docker Compose
- PostgreSQL 14+ with pgvector
- Redis 6+
- AWS S3 bucket (for file storage)

### Quick Start

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/LINK-X1.git
   cd LINK-X1
   ```

2. **Set up environment variables**
   ```bash
   # Copy example env files
   cp .env.example .env
   cp docker-image/.env.example docker-image/.env
   cp frontend/.env.local.example frontend/.env.local
   ```

3. **Start with Docker Compose**
   ```bash
   # Development environment
   docker-compose up -d
   
   # Production environment
   docker-compose -f docker-compose.production.yml up -d
   ```

4. **Access the application**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:8080
   - API Documentation: http://localhost:8080/api/docs

## 📁 Project Structure

### Frontend (`/frontend`)
```
frontend/
├── app/                    # Next.js app directory
│   ├── (auth)/            # Authentication pages
│   ├── (dash)/            # Dashboard pages
│   ├── (learn)/           # Learning interface
│   ├── courses/           # Course management
│   └── onboarding/        # User onboarding
├── components/            # Reusable components
│   ├── ui/               # Base UI components
│   ├── course/           # Course-specific components
│   ├── dashboard/        # Dashboard components
│   └── streaming/        # Real-time features
├── lib/                   # Utilities and services
│   ├── api/              # API client modules
│   └── utils.ts          # Helper functions
└── hooks/                # Custom React hooks
```

### Backend (`/docker-image`)
```
docker-image/
├── src/
│   ├── api/              # API endpoints
│   │   ├── v2_endpoints/ # Version 2 endpoints
│   │   └── metrics/      # Metrics collection
│   ├── services/         # Business logic
│   │   ├── ai/          # AI service modules
│   │   ├── streaming/   # Streaming services
│   │   └── file_service/# File management
│   ├── repositories/     # Data access layer
│   ├── core/            # Core utilities
│   │   └── monitoring/  # Monitoring setup
│   ├── db/              # Database schemas
│   └── tasks/           # Background tasks
├── scripts/             # Utility scripts
└── tests/              # Test suites
```

## 🧪 Development

### Frontend Development
```bash
cd frontend
npm install
npm run dev
```

### Backend Development
```bash
cd docker-image
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r src/requirements.txt
python src/app.py
```

### Running Tests
```bash
# Frontend tests
cd frontend && npm test

# Backend tests
cd docker-image/src && python -m pytest

# E2E tests
npm run test:e2e
```

## 📊 Monitoring

The project includes a comprehensive monitoring stack:

- **Metrics**: Prometheus + Grafana dashboards
- **Logs**: Loki for log aggregation
- **Traces**: Distributed tracing support
- **Alerts**: AlertManager for critical issues

Access monitoring tools:
- Grafana: http://localhost:3001
- Prometheus: http://localhost:9090

## 🔐 Security

- Firebase Authentication for user management
- JWT tokens with refresh token rotation
- Rate limiting on all API endpoints
- CORS protection with whitelisted origins
- Input validation and sanitization
- SQL injection protection via ORM
- XSS protection with React's built-in escaping

## 📈 Performance

- Optimized React bundle with code splitting
- Redis caching for frequently accessed data
- Database query optimization with indexes
- CDN for static assets
- WebSocket connections for real-time features
- Background job processing with Celery

## 🤝 Contributing

Please read [CONTRIBUTING.md](CONTRIBUTING.md) for details on our code of conduct and the process for submitting pull requests.

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Built with [Next.js](https://nextjs.org/)
- UI components from [shadcn/ui](https://ui.shadcn.com/)
- AI powered by [OpenAI](https://openai.com/)
- Icons from [Lucide](https://lucide.dev/)

---

For detailed documentation, see the [docs](./docs) directory.