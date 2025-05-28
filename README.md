<p align="center"><strong>Learn-X</strong>: An AI-Powered Personalized Learning Platform</p>

Learn-X is a project developed to solve a common issue in higher education: learning materials like slides, PDFs, and lectures are not one-size-fits-all. Every student learns differently, and Learn-X bridges that gap by using AI to personalize content based on each student’s unique learning persona.


## Key Features
- 🔐 **Persona-Based Personalization**: Students receive customized content tailored to their learning style, experience, and preferences.
- 🧑‍🏫 **Instructor Dashboard**: Professors can upload files, organize modules, and monitor anonymized engagement analytics.
- 🤖 **AI Chatbot Assistance**: GPT-4o-powered chatbot allows students to ask follow-up questions relevant to course material.
- 📂 **RAG System**: Content is chunked and embedded using pgvector, then retrieved for AI responses with high relevance.
- 📊 **Analytics & Engagement**: Anonymous tracking gives professors insight into student usage and behavior patterns.

## Tech Stack
| Component        | Technology                        |
|------------------|-----------------------------------|
| Frontend         | Next.js                           |
| Backend          | Python, Flask                     |
| AI Integration   | OpenAI (GPT-4o). Retrieval-Augmented Generation (RAG) |
| Embedding Store  | PostgreSQL with pgvector          |
| Primary DB       | PostgreSQL  (hosted on NeonDB)    |
| Authentication   | Firebase                          |
| Containerization | Docker                            |

## Quick Start

All operations are managed through the unified `manage.sh` script:

```bash
# Make the script executable (first time only)
chmod +x manage.sh

# Show all available commands
./manage.sh help

# Run backend in development mode
./manage.sh backend

# Run frontend
./manage.sh frontend

# Run tests
./manage.sh test
```

For detailed instructions, see [SCRIPTS_GUIDE.md](./SCRIPTS_GUIDE.md).

## Environment Setup

Create these two files with your environment variables:
- `coralx-frontend/.env.local`
- `docker-image/src/.env`

Both should include:
```env
OPENAI_API_KEY=your_api_key_here
AUTH_SECRET=your_auth_secret_here
POSTGRES_URL=your_postgres_url_here
DATABASE_URL=your_postgres_url_here
REDIS_URL=redis://localhost:6379
AWS_ACCESS_KEY_ID=your_aws_key_id
AWS_SECRET_ACCESS_KEY=your_aws_secret_key
AWS_REGION=us-east-1
S3_BUCKET_NAME=your_s3_bucket_name
```

> Note: Never commit `.env` files to version control.

## Running the Application

### Development Mode
```bash
# Run backend with auto-reload
./manage.sh backend

# In another terminal, run frontend
./manage.sh frontend
```

The frontend will be available at [localhost:3000](http://localhost:3000/).
The backend API will be available at [localhost:8000](http://localhost:8000).

### Production Mode
```bash
# Run with production configuration
./manage.sh backend production
```

### Database Operations
```bash
# Run migrations
./manage.sh db-migrate

# Reset database (interactive)
./manage.sh db-reset

# Backup database
./manage.sh db-backup
```

### Testing
```bash
# Run all tests
./manage.sh test

# Run specific test suite
./manage.sh test-backend
./manage.sh test-frontend
```

### Container Access
```bash
# View logs
./manage.sh logs backend

# Open shell in container
./manage.sh shell backend
```

# Backend AI Pipeline (Document Processing + Question Answering)

A sophisticated document processing and retrieval system that leverages PostgreSQL with pgvector extension and OpenAI embeddings to generate personalized course content and provide an interactive question-answering interface for course documents.

## Overview

The backend implements a Retrieval-Augmented Generation (RAG) pipeline powered by pgvector and OpenAI's GPT-4o. This enables semantic search over course materials and personalized responses to student questions.

## System Architecture

### 1. Document Processing & Vector Storage
- **Data Collection & Processing** (`indexer.py`)
  - Loads documents from S3 or local storage
  - Splits documents into smaller chunks
  - Creates embeddings using OpenAI's text-embedding-ada-002
  - Stores vectors in PostgreSQL using pgvector extension

- **Citation Management**
  - Maintains document metadata and sources
  - Tracks chunk origins for accurate citations

### 2. Query the Knowledge Base
- **Query Processing**
  - Processes user queries
  - Creates query embeddings using OpenAI
  - Performs vector similarity search using pgvector
  - Selects top k most similar chunks
  - Generates context-aware responses using GPT-4o

## Testing the RAG Pipeline

From the backend container:

```bash
# Run backend
./manage.sh backend

# Access container shell
./manage.sh shell backend
```

### 1. Process documents for vector storage
```bash
# Documents are automatically processed when uploaded through the API
# Vectors are stored in PostgreSQL with pgvector
```

### 2. Query the knowledge base
```bash
# Use the API endpoints or frontend interface
# Vector search is performed using pgvector's similarity functions
```

### 3. Monitor vector storage
```bash
# Check vector storage statistics
python -m src.monitor_pgvector
```

## Development Tools
| Area             | Tool / Platform                   |
|------------------|-----------------------------------|
| Version Control  | Git, GitHub, GitLab               |
| Package Manager  | pnpm (frontend), pip (backend)    |
| Environment Mgmt | dotenv                            |
| Container Dev    | Docker, Docker Compose            |
| DB Hosting       | [NeonDB](https://neon.tech), [Firebase Console](https://firebase.google.com) |
| UI Prototyping   | [v0](https://v0.dev), [Loveable](https://lovable.dev) |
