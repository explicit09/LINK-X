# LEARN-X 🎓

> **AI-Powered Personalized Learning Platform**

LEARN-X is an intelligent educational platform that transforms how students learn by providing personalized, adaptive learning experiences. It integrates seamlessly with Learning Management Systems (LMS) like Canvas and Blackboard to deliver AI-driven content personalization based on individual learning styles and course materials.

[![License](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)
[![Docker](https://img.shields.io/badge/Docker-Supported-blue.svg)](https://www.docker.com/)
[![Next.js](https://img.shields.io/badge/Next.js-14-black.svg)](https://nextjs.org/)
[![Flask](https://img.shields.io/badge/Flask-2.3+-green.svg)](https://flask.palletsprojects.com/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15+-blue.svg)](https://www.postgresql.org/)

## 🌟 Features

### 🎯 **Personalized Learning**
- **Adaptive Content Delivery**: AI analyzes learning patterns and adapts content presentation in real-time
- **Learning Style Recognition**: Automatically detects and accommodates visual, auditory, and kinesthetic learning preferences
- **Smart Recommendations**: Suggests relevant materials and learning paths based on progress and goals

### 🤖 **AI-Powered Intelligence**
- **Natural Language Processing**: Processes course materials (PDFs, videos, audio) for intelligent content extraction
- **Conversational AI**: Interactive chat assistance for questions, explanations, and study guidance
- **Automated Summarization**: Generates concise summaries of complex materials
- **Real-time Feedback**: Instant assessment and guidance on learning progress

### 📚 **Content Management**
- **Multi-format Support**: PDFs, videos, audio files, presentations, and documents
- **Automatic Processing**: AI-powered content analysis and chunking for optimal learning
- **Version Control**: Track content updates and maintain learning continuity
- **Collaborative Features**: Share insights and study together with peers

### 🎮 **Gamification & Engagement**
- **XP System**: Earn experience points for learning activities and achievements
- **Progress Tracking**: Visual progress indicators and milestone celebrations
- **Study Streaks**: Maintain daily learning habits with streak counters
- **Achievement Badges**: Unlock rewards for completing challenges and goals

### 🏫 **LMS Integration**
- **Canvas Integration**: Seamless sync with Canvas courses, assignments, and grades
- **Blackboard Support**: Native integration with Blackboard Learn
- **SSO Authentication**: Single sign-on with institutional accounts
- **Grade Passback**: Automatic grade synchronization with LMS systems

### 📊 **Analytics & Insights**
- **Learning Analytics**: Detailed insights into learning patterns and performance
- **Progress Dashboards**: Visual representation of achievements and areas for improvement
- **Instructor Analytics**: Tools for educators to track student engagement and success
- **Predictive Insights**: AI-powered predictions for learning outcomes and interventions

## 🚀 Quick Start

### Prerequisites

- **Docker & Docker Compose** (recommended)
- **Node.js 18+** and **Python 3.9+** (for development)
- **PostgreSQL 15+** database
- **Redis** (optional, for caching)

### 🐳 Docker Setup (Recommended)

```bash
# Clone the repository
git clone https://github.com/explicit09/LINK-X.git
cd LINK-X

# Copy environment configuration
cp docker-image/.env.example docker-image/.env
cp frontend/.env.example frontend/.env.local

# Configure your environment variables
# Edit docker-image/.env and frontend/.env.local with your settings

# Start the full stack
docker-compose up -d

# Access the application
# Frontend: http://localhost:3000
# Backend API: http://localhost:8000
# Admin Panel: http://localhost:8000/admin
```

### 🛠️ Development Setup

```bash
# Backend setup
cd docker-image
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
python src/app.py

# Frontend setup (new terminal)
cd frontend
npm install
npm run dev
```

## 📖 Documentation

Comprehensive documentation is available in the [`docs/`](./docs/) directory:

- **[Development Guide](./docs/development/claude-guide.md)** - Complete development setup and guidelines
- **[Deployment Guide](./docs/deployment/production-guide.md)** - Production deployment instructions
- **[API Documentation](./docs/api/)** - API endpoints and usage examples
- **[Feature Guides](./docs/features/)** - Detailed feature documentation
- **[Operations Guide](./docs/operations/runbooks.md)** - Monitoring, troubleshooting, and maintenance

## 🏗️ Architecture

LEARN-X follows a modern, scalable architecture:

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │   Backend API   │    │   Database      │
│   (Next.js 14)  │◄──►│   (Flask)       │◄──►│   (PostgreSQL)  │
│   - React UI    │    │   - REST API    │    │   - User Data   │
│   - Auth        │    │   - AI Services │    │   - Content     │
│   - Dashboard   │    │   - LMS Sync    │    │   - Analytics   │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         │              ┌─────────────────┐             │
         │              │   AI Services   │             │
         └──────────────►│   - OpenAI      │◄────────────┘
                        │   - Embeddings  │
                        │   - Processing  │
                        └─────────────────┘
```

### Technology Stack

**Frontend**
- **Next.js 14** - React framework with App Router
- **TypeScript** - Type-safe development
- **Tailwind CSS** - Utility-first styling
- **shadcn/ui** - Modern UI components
- **Zustand** - State management

**Backend**
- **Flask** - Python web framework
- **SQLAlchemy** - Database ORM
- **Celery** - Background task processing
- **Redis** - Caching and session storage
- **Supabase** - Database and authentication

**AI & ML**
- **OpenAI GPT** - Natural language processing
- **pgvector** - Vector embeddings storage
- **Embedding Models** - Content similarity and search

**Infrastructure**
- **Docker** - Containerization
- **PostgreSQL** - Primary database
- **Railway** - Cloud deployment
- **Vercel** - Frontend hosting

## 🔧 Configuration

### Environment Variables

**Backend Configuration (`docker-image/.env`)**
```env
# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/learnx
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-key

# AI Services
OPENAI_API_KEY=your-openai-api-key

# Authentication
JWT_SECRET_KEY=your-jwt-secret
SUPABASE_JWT_SECRET=your-supabase-jwt-secret

# Optional Services
REDIS_URL=redis://localhost:6379/0
```

**Frontend Configuration (`frontend/.env.local`)**
```env
# API Configuration
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_FRONTEND_URL=http://localhost:3000

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

## 🧪 Testing

```bash
# Backend tests
cd docker-image
pytest src/tests/

# Frontend tests
cd frontend
npm test

# Integration tests
npm run test:e2e

# Load testing
./scripts/run-load-tests.sh
```

## 📦 Deployment

### Production Deployment

**Railway (Backend)**
```bash
# Deploy to Railway
railway login
railway link
railway up
```

**Vercel (Frontend)**
```bash
# Deploy to Vercel
vercel login
vercel --prod
```

### Docker Production
```bash
# Production build
docker-compose -f docker-compose.production.yml up -d

# With monitoring
docker-compose --profile monitoring up -d
```

See the [Production Deployment Guide](./docs/deployment/production-guide.md) for detailed instructions.

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guidelines](./docs/CONTRIBUTING.md) for details.

### Development Workflow

1. **Fork the repository**
2. **Create a feature branch**
   ```bash
   git checkout -b feature/amazing-feature
   ```
3. **Make your changes**
4. **Run tests and linting**
   ```bash
   npm run lint
   npm test
   ```
5. **Commit your changes**
   ```bash
   git commit -m 'feat: add amazing feature'
   ```
6. **Push to your fork**
   ```bash
   git push origin feature/amazing-feature
   ```
7. **Open a Pull Request**

### Code Standards

- **TypeScript** for frontend development
- **Python type hints** for backend code
- **ESLint** and **Prettier** for JavaScript/TypeScript
- **Black** and **isort** for Python formatting
- **Conventional Commits** for commit messages

## 📊 Performance

LEARN-X is optimized for performance and scalability:

- **Sub-second API responses** with intelligent caching
- **Real-time content streaming** for immediate feedback
- **Horizontal scaling** support with Docker and Kubernetes
- **CDN integration** for global content delivery
- **Database optimization** with connection pooling and indexing

## 🔒 Security

Security is a top priority:

- **JWT-based authentication** with refresh tokens
- **Role-based access control** (RBAC)
- **Data encryption** at rest and in transit
- **API rate limiting** and DDoS protection
- **Regular security audits** and dependency updates
- **GDPR compliance** for data privacy

## 📈 Roadmap

### Upcoming Features

- **🔮 Advanced AI Tutoring** - Personalized AI tutors for each subject
- **🌐 Multi-language Support** - Internationalization and localization
- **📱 Mobile Applications** - Native iOS and Android apps
- **🎥 Video Conferencing** - Integrated virtual classroom capabilities
- **🔬 Learning Analytics 2.0** - Advanced predictive analytics
- **🌍 Offline Learning** - Progressive Web App with offline capabilities

### Long-term Vision

- **Institutional Networks** - Multi-institution collaboration platform
- **AI Content Generation** - Automated course material creation
- **VR/AR Learning** - Immersive educational experiences
- **Blockchain Credentials** - Verifiable achievement certificates

## 🆘 Support

### Getting Help

- **📚 Documentation** - Check the [docs/](./docs/) directory
- **💬 GitHub Issues** - Report bugs or request features
- **📧 Email Support** - [support@learn-x.ai](mailto:support@learn-x.ai)
- **💬 Community Discord** - Join our developer community

### Troubleshooting

Common issues and solutions:

- **Connection errors**: Check database and Redis connectivity
- **Authentication issues**: Verify JWT and Supabase configuration
- **Performance problems**: Review database indexes and caching
- **Docker issues**: Ensure sufficient system resources

See the [Operations Guide](./docs/operations/runbooks.md) for detailed troubleshooting.

## 📄 License

This project is licensed under the **Apache License 2.0** - see the [LICENSE](./docs/legal/LICENSE) file for details.

## 🙏 Acknowledgments

- **OpenAI** - For providing powerful AI capabilities
- **Supabase** - For the excellent backend-as-a-service platform
- **Vercel** - For seamless frontend deployment
- **Railway** - For reliable backend hosting
- **The Open Source Community** - For the amazing tools and libraries

## 📞 Contact

**LEARN-X Team**
- **Website**: [learn-x.ai](https://learn-x.ai)
- **GitHub**: [@explicit09](https://github.com/explicit09)
- **Email**: [hello@learn-x.ai](mailto:hello@learn-x.ai)
- **Twitter**: [@LearnXAI](https://twitter.com/LearnXAI)

---

<div align="center">
  <p><strong>Made with ❤️ for educators and learners worldwide</strong></p>
  <p>© 2024 LEARN-X. All rights reserved.</p>
</div>