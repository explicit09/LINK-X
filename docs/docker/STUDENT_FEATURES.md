# Student Course Creation and Management

This document outlines the new features that allow students to create and manage their own courses, including modules and files.

## New Features

1. **Course Creation**
   - Students can now create their own courses
   - Courses can be created without an instructor
   - Each course tracks its creator

2. **Module Management**
   - Create, read, update, and delete modules within courses
   - Modules can be reordered using the `ordering` field

3. **File Management**
   - Upload and manage files within modules
   - Support for various file types including PDFs and audio files
   - Automatic transcription of audio files
   - Search indexing for all uploaded content

## API Endpoints

### Student Course Management
- `POST /student/courses` - Create a new course
- `GET /student/courses` - List all courses created by the student
- `GET|PATCH|DELETE /student/courses/<course_id>` - View, update, or delete a course

### Student Module Management
- `POST|GET /student/courses/<course_id>/modules` - Create a module or list all modules in a course
- `GET|PATCH|DELETE /student/modules/<module_id>` - View, update, or delete a module

### Student File Management
- `POST|GET /student/modules/<module_id>/files` - Upload a file or list all files in a module
- `GET|DELETE /student/files/<file_id>` - View or delete a file
  - Add `?download=true` to download the file content

## Database Changes

1. **Course Table**
   - Made `instructor_id` nullable to support student-created courses
   - Added `creator_id` column to track who created the course

## Setup and Migration

1. **Run database migrations**:
   ```bash
   docker-compose run --rm app python /app/src/run_migrations.py
   ```

2. **Rebuild and restart the application**:
   ```bash
   ./rebuild_and_restart.sh
   ```

## Authentication

All student endpoints require a valid Firebase authentication token in the `Authorization` header:

```
Authorization: Bearer <firebase_token>
```

## Example Usage

### Create a Course
```http
POST /student/courses
Content-Type: application/json
Authorization: Bearer <firebase_token>

{
  "title": "My New Course",
  "description": "A course created by a student",
  "code": "STU-101",
  "term": "Spring 2023"
}
```

### Upload a File to a Module
```http
POST /student/modules/<module_id>/files
Authorization: Bearer <firebase_token>
Content-Type: multipart/form-data

# In the form data:
file: <file_data>
title: "Lecture Notes"
```
