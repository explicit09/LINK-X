<p align="center"><strong>Learn-X</strong>: An AI-Powered Personalized Learning Platform</p>

Learn-X is a project developed to solve a common issue in higher education: learning materials like slides, PDFs, and lectures are not one-size-fits-all. Every student learns differently, and Learn-X bridges that gap by using AI to personalize content based on each student’s unique learning persona.


## Key Features
- 🔐 **Persona-Based Personalization**: Students receive customized content tailored to their learning style, experience, and preferences.
- 🧑‍🏫 **Instructor Dashboard**: Professors can upload files, organize modules, and monitor anonymized engagement analytics.
- 🤖 **AI Chatbot Assistance**: GPT-4o-powered chatbot allows students to ask follow-up questions relevant to course material.
- 📂 **RAG System**: Content is chunked and embedded using FAISS, then retrieved for AI responses with high relevance.
- 📊 **Analytics & Engagement**: Anonymous tracking gives professors insight into student usage and behavior patterns.

## Tech Stack
| Component        | Technology                        |
|------------------|-----------------------------------|
| Frontend         | Next.js                           |
| Backend          | Python, Flask                     |
| AI Integration   | OpenAI (GPT-4o). Retrieval-Augmented Generation (RAG) |
| Embedding Store  | FAISS, Pgvector                   |
| Primary DB       | PostgreSQL  (hosted on NeonDB)    |
| Authentication   | Firebase                          |
| Containerization | Docker                            |

## Running locally

You will need to use the environment variables to use the database & AI integrations.
Create these two files:
- `coralx-frontend/.env.local`
- `docker-image/src/.env`

both should include the following:
 ```env
 OPENAI_API_KEY=your_api_key_here

 AUTH_SECRET=your_auth_secret_here

 POSTGRES_URL=your_postgres_url_here
 ```

> Note: You should not commit your `.env` file or it will expose secrets that will allow others to control access to your various OpenAI and authentication provider accounts.

### Before running frontend:
```bash
cd coralx-frontend

pnpm install
```

### To run frontend: 
```bash
cd <project root directory>

bash run_frontend.sh
```

The frontend should now be running on [localhost:3000](http://localhost:3000/).

### To run backend:
```bash
cd <project root directory>

docker-compose up --build
```
This starts the Flask API server and installs all dependencies inside a Docker container.

### To open a new interactive shell in the backend container (for testing FAISS):
```bash
docker exec -it backend /bin/bash
```

# Backend AI Pipeline (Document Processing + Question Answering)

A sophisticated document processing and retrieval system that leverages FAISS (Facebook AI Similarity Search) and OpenAI embeddings to generate personalized course content provide an interactive question-answering interface for course documents.

## Overview

The backend implements a Retrieval-Augmented Generation (RAG) pipeline powered by FAISS and OpenAI's GPT-4o-mini. This enables semantic search over course materials and personalized responses to student questions.

## System Architecture

### 1. Generate FAISS Vector Database (`FAISS_db_generation.py`)
- **Data Collection & Processing** (`FAISS_db_generation.py`: `create_db(<path_to_working_dir>)`)
  - Loads all documents in the provided path
  - Splits documents into smaller chunks
  - Creates embeddings using OpenAI's model: Ada-002
  - Stores vectors in FAISS database: FlatL2-index

- **Citation Management** (`docker-image/src/FAISS_db_generation.py`: `generate_citations(<path_to_working_dir>)` & `replace_sources(<path_to_working_dir>)`)
  - Generates APA citations using LLM: GPT-4o-mini
  - Updates vector storage with proper citations

### 2. Query the Knowledge Base
- **Query Processing** (`docker-image/src/FAISS_retriever.py`)
  - Processes user queries
  - Creates query embeddings: Ada-002
  - Checks similarity with stored vectors: Euclidean-distance
  - Selects top k most similar chunks
  - Generates context-aware prompts: GPT-4o-mini
  - Uses LLM to generate answers: GPT-4o-mini

## Testing the FAISS & RAG Pipeline

You will need to run the docker container and open a new interactive shell (shown above)

From the shell in the container, enter the src folder:

```bash
cd src
```

### 1. Generate FAISS database from desired PDFs
```bash
python -i FAISS_db_generation.py
create_database("<path_to_working_dir>")
generate_citations("<path_to_working_dir>") 
file_cleanup("<path_to_working_dir>")
```
- `create_database()`
  - Loads documents from `<path_to_working_dir>`
  - Splits text into chunks and creates FAISS vector embeddings using OpenA
  - Saves files `index.faiss` and `index.pkl` in `<path_to_working_dir>` within the container
- `generate_citations()`
  - Generates APA citations using LLM: GPT-4o-mini
  - Saves `citations.csv` in `<path_to_working_dir>` within the container
- `file_cleanup()`
  - Recursively removes all files except for `index.faiss` & `index.pkl` from `<path_to_working_dir>`

### 2. FAISS index retrieval and RAG
> Note: Step 1. should be complete for the desired pdf before Step 2.
```bash
python -i FAISS_retriever.py

# To generate an answer based on the top 5 most relevant chunks
answer_to_qa("<query>", <path_to_working_dir>)

# To generate an answer based on **ALL** chunks
answer_to_QA_all_chunks("<query>", <path_to_working_dir>)
```
- Outputs an answer based on the supplied Vector DB
### 3. Launch the Web Interface for testing RAG (Optional)
> Note: Step 1. should be complete for the desired pdf before Step 3.
```bash
bash run_streamlit_ui.sh <path_to_working_dir>
```
- The streamlit web interface should now be running on [localhost:8501](http://localhost:8501/).
- From here, you can:
  - Ask questions about the supplied content
  - Receive AI-generated answers

## Development Tools
| Area             | Tool / Platform                   |
|------------------|-----------------------------------|
| Version Control  | Git, GitHub, GitLab               |
| Package Manager  | pnpm (frontend), pip (backend)    |
| Environment Mgmt | dotenv                            |
| Container Dev    | Docker, Docker Compose            |
| DB Hosting       | [NeonDB](https://neon.tech), [Firebase Console](https://firebase.google.com) |
| UI Prototyping   | [v0](https://v0.dev), [Loveable](https://lovable.dev) |
