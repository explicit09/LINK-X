# LINK-X Database Implementation Plan

## Executive Summary

This document outlines a comprehensive plan for implementing a robust, compliant, and scalable database architecture for LINK-X. The system supports dual roles (students as course creators), educational compliance requirements (FERPA/COPPA), and advanced AI/RAG capabilities.

## Current State Analysis

### Existing Architecture
1. **Authentication**: Supabase Auth with local user profiles
2. **Storage**: Transitioned from database → S3 → Supabase Storage
3. **Database**: PostgreSQL with pgvector extension
4. **AI/RAG**: Supabase native embeddings with hierarchical RAG
5. **Compliance**: Basic audit logging and RLS policies

### Key Findings
- Students can create and manage courses (dual role support)
- File storage uses Supabase Storage with path-based organization
- Authentication is well-structured with Supabase integration
- RAG implementation is sophisticated with vector search optimization
- Compliance features exist but need enhancement for school deployment

## Proposed Database Schema Enhancements

### 1. Multi-Tenant Architecture

```sql
-- Add organization/school support
CREATE TABLE organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    domain VARCHAR(255) UNIQUE,
    settings JSONB DEFAULT '{}',
    compliance_config JSONB DEFAULT '{}', -- FERPA, COPPA settings
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Update user table to support organizations
ALTER TABLE auth.users ADD COLUMN organization_id UUID REFERENCES organizations(id);
CREATE INDEX idx_users_organization ON auth.users(organization_id);

-- Add organization context to courses
ALTER TABLE courses ADD COLUMN organization_id UUID REFERENCES organizations(id);
CREATE INDEX idx_courses_organization ON courses(organization_id);
```

### 2. Enhanced Role-Based Access Control

```sql
-- More granular permissions
CREATE TABLE permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) UNIQUE NOT NULL,
    resource VARCHAR(100) NOT NULL,
    action VARCHAR(50) NOT NULL,
    description TEXT
);

CREATE TABLE role_permissions (
    role_id UUID REFERENCES roles(id),
    permission_id UUID REFERENCES permissions(id),
    organization_id UUID REFERENCES organizations(id),
    PRIMARY KEY (role_id, permission_id, organization_id)
);

-- Dynamic role creation per organization
CREATE TABLE organization_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES organizations(id),
    name VARCHAR(100) NOT NULL,
    base_role user_role NOT NULL, -- student, instructor, admin
    custom_permissions JSONB DEFAULT '[]',
    UNIQUE(organization_id, name)
);
```

### 3. Enhanced Course Management

```sql
-- Course templates for schools
CREATE TABLE course_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES organizations(id),
    name VARCHAR(255) NOT NULL,
    structure JSONB NOT NULL, -- predefined modules/sections
    metadata JSONB DEFAULT '{}',
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Course approval workflow
CREATE TABLE course_approvals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    course_id UUID REFERENCES courses(id),
    status VARCHAR(50) DEFAULT 'pending', -- pending, approved, rejected
    reviewer_id UUID REFERENCES auth.users(id),
    review_notes TEXT,
    reviewed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Student course creation tracking
CREATE TABLE student_created_courses (
    course_id UUID PRIMARY KEY REFERENCES courses(id),
    student_id UUID REFERENCES auth.users(id),
    approval_status VARCHAR(50) DEFAULT 'pending',
    visibility VARCHAR(50) DEFAULT 'private', -- private, class, school, public
    peer_review_enabled BOOLEAN DEFAULT false
);
```

### 4. Enhanced File Storage Structure

```sql
-- File versioning
CREATE TABLE file_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    file_id UUID REFERENCES files(id),
    version_number INTEGER NOT NULL,
    storage_path VARCHAR(512) NOT NULL,
    storage_metadata JSONB,
    checksum VARCHAR(64),
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(file_id, version_number)
);

-- File access logs for compliance
CREATE TABLE file_access_logs (
    id BIGSERIAL PRIMARY KEY,
    file_id UUID REFERENCES files(id),
    user_id UUID REFERENCES auth.users(id),
    access_type VARCHAR(50), -- view, download, edit
    ip_address INET,
    user_agent TEXT,
    accessed_at TIMESTAMPTZ DEFAULT NOW(),
    -- Partitioned by month for performance
    PRIMARY KEY (id, accessed_at)
) PARTITION BY RANGE (accessed_at);
```

### 5. Enhanced Compliance Infrastructure

```sql
-- FERPA consent tracking
CREATE TABLE ferpa_consents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID REFERENCES auth.users(id),
    organization_id UUID REFERENCES organizations(id),
    consent_type VARCHAR(100), -- directory_info, grades, etc.
    granted BOOLEAN DEFAULT false,
    parent_consent_required BOOLEAN DEFAULT false,
    parent_id UUID REFERENCES auth.users(id),
    consent_date TIMESTAMPTZ,
    expiry_date TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- COPPA compliance for users under 13
CREATE TABLE coppa_verifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id),
    birth_date DATE,
    parent_email VARCHAR(255),
    parent_consent_token VARCHAR(255) UNIQUE,
    consent_granted BOOLEAN DEFAULT false,
    consent_date TIMESTAMPTZ,
    verification_method VARCHAR(50), -- email, credit_card, etc.
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Data retention policies
CREATE TABLE data_retention_policies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES organizations(id),
    data_type VARCHAR(100), -- files, messages, logs, etc.
    retention_days INTEGER NOT NULL,
    delete_after_unenrollment BOOLEAN DEFAULT false,
    compliance_standard VARCHAR(50), -- FERPA, GDPR, COPPA
    active BOOLEAN DEFAULT true
);
```

### 6. Enhanced Embedding and AI Infrastructure

```sql
-- Embedding quality tracking
CREATE TABLE embedding_quality_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    file_chunk_id UUID REFERENCES file_chunks(id),
    quality_score FLOAT,
    coherence_score FLOAT,
    relevance_score FLOAT,
    last_accessed TIMESTAMPTZ,
    access_count INTEGER DEFAULT 0,
    feedback_positive INTEGER DEFAULT 0,
    feedback_negative INTEGER DEFAULT 0
);

-- Custom embeddings per organization
CREATE TABLE organization_embeddings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES organizations(id),
    model_name VARCHAR(100),
    model_version VARCHAR(50),
    dimensions INTEGER,
    settings JSONB DEFAULT '{}',
    active BOOLEAN DEFAULT true
);

-- Query result caching with TTL
CREATE TABLE rag_query_cache (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    query_embedding vector(1536),
    query_hash VARCHAR(64) UNIQUE,
    results JSONB NOT NULL,
    organization_id UUID REFERENCES organizations(id),
    course_id UUID REFERENCES courses(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL,
    hit_count INTEGER DEFAULT 0
);
```

## Implementation Roadmap

### Phase 1: Foundation (Weeks 1-2)
1. Implement organization/multi-tenant support
2. Migrate existing data to new structure
3. Update authentication to include organization context
4. Implement basic compliance tables

### Phase 2: Enhanced Access Control (Weeks 3-4)
1. Implement granular permission system
2. Create organization-specific roles
3. Update RLS policies for multi-tenancy
4. Implement course approval workflow

### Phase 3: Compliance & Security (Weeks 5-6)
1. Implement FERPA consent management
2. Add COPPA verification flow
3. Create comprehensive audit logging
4. Implement data retention policies

### Phase 4: Advanced Features (Weeks 7-8)
1. Implement file versioning
2. Enhance embedding quality tracking
3. Add organization-specific AI models
4. Implement query caching

### Phase 5: Testing & Migration (Weeks 9-10)
1. Comprehensive testing of all features
2. Performance optimization
3. Data migration from current system
4. Documentation and training

## Key Implementation Considerations

### 1. Backward Compatibility
- Maintain existing API contracts
- Gradual migration path for current users
- Feature flags for new functionality

### 2. Performance Optimization
- Partition large tables (audit logs, file access)
- Strategic indexing for common queries
- Connection pooling for multi-tenant access

### 3. Security Enhancements
- Encrypt sensitive data at rest
- Implement field-level encryption for PII
- Regular security audit scheduling

### 4. Compliance Automation
- Automated FERPA report generation
- Consent expiry notifications
- Data retention job scheduling

### 5. Monitoring & Observability
- Query performance tracking
- Compliance violation alerts
- Storage usage monitoring

## Migration Strategy

### Step 1: Create New Schema
```sql
-- Run migrations in order
-- 001_organizations.sql
-- 002_enhanced_roles.sql
-- 003_compliance_tables.sql
-- 004_file_enhancements.sql
-- 005_ai_improvements.sql
```

### Step 2: Data Migration
```sql
-- Migrate existing users to default organization
INSERT INTO organizations (id, name, domain) 
VALUES ('default-org-id', 'Default Organization', 'default.linkx.edu');

UPDATE auth.users SET organization_id = 'default-org-id' WHERE organization_id IS NULL;
```

### Step 3: Update Application Code
- Update repositories to include organization context
- Modify API endpoints for multi-tenancy
- Update frontend to handle organization switching

### Step 4: Testing & Validation
- Unit tests for new functionality
- Integration tests for compliance features
- Performance testing with multiple organizations

## Success Metrics

1. **Performance**: Query response time < 100ms for 95% of requests
2. **Compliance**: 100% audit trail coverage for data access
3. **Scalability**: Support for 1000+ organizations
4. **Security**: Zero data breaches, passed security audits
5. **User Experience**: Seamless multi-role support

## Conclusion

This implementation plan provides a robust foundation for LINK-X to scale to educational institutions while maintaining compliance, security, and performance. The phased approach ensures minimal disruption to existing users while adding powerful new capabilities for schools and organizations.