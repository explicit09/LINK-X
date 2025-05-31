# 🎯 LTI 1.3 EXECUTION PLAN - NO COMPROMISES

## **BRUTAL REALITY CHECK ✅**
- **ONLY LTI 1.3 + Advantage** - 1.1/2.0 are dead weight
- **Security-first** - OAuth 2 / OpenID Connect mandatory
- **8-week sprint** - Ship or explain to investors why we failed
- **IMS certification** - No shortcuts, no excuses

---

## **MINIMUM VIABLE LTI (4 FEATURES ONLY)**

| Priority | Service | Why Mandatory | Drop-Dead Test |
|----------|---------|---------------|----------------|
| **P0** | Core Launch (OIDC → LTI) | Auth & SSO; nothing works without this | JWT validated, nonce checked, user lands in LEARN-X |
| **P1** | Deep Linking | Instructors place content without URL copy-paste | Canvas "Select Content" picker returns launch URL |
| **P1** | Assignment & Grade Service (AGS) | Grade passback or get thrown out | Two-way grade sync in LMS gradebook |
| **P2** | Names & Roles Provisioning (NRPS) | Roster data for personalization | Course roster via service token |

**RULE: Ship these 4 or ship nothing. No feature creep.**

---

## **ARCHITECTURE (SECURITY-HARDENED)**

```
┌────────────────────────┐
│        LMS            │  Canvas, Blackboard, D2L
│ (Institution Tenant)   │
└────┬───────────▲──────┘
     │OIDC Login │ AGS/NRPS OAuth2 calls
     ▼           │
┌─────────────┐  │
│ LTI Gateway │◄─┘   🔒 STATELESS MICROSERVICE
│  (Python)   │      • JWT validation + platform JWKs
│             │      • Multi-tenant security boundaries
│             │      • LEARN-X auth token generation
└────┬────────┘
     │Internal REST
┌────▼────────┐
│  LEARN-X    │◄──► PostgreSQL
│  Core API   │     (Institution/Course/UserLink scoped)
└────┬────────┘
     │Events/Queue
┌────▼────────┐
│ Background  │     Grade passback, analytics
│  Workers    │
└─────────────┘
```

### **SECURITY CHECKPOINTS (NON-NEGOTIABLE)**
1. **TLS Everywhere** - Self-signed staging, CA-signed prod
2. **JWT Validation** - exp, nbf, iat ≤ 5min skew; nonce burn-once
3. **OAuth2 Client Credentials** - Token lifespan ≤ 30min
4. **Replay Protection** - Store every launch jti for 12h
5. **Multi-tenant Isolation** - iss + client_id + deployment_id scope ALL queries

---

## **TECHNOLOGY STACK (BATTLE-TESTED)**

### **Primary Choice: Python + pylti1p3**
```yaml
Library: pylti1p3
Pros:
  ✅ Actively maintained
  ✅ Flask adapter ready
  ✅ Easy to debug at 3am
  ✅ Good documentation

Implementation:
  - Flask microservice for LTI Gateway
  - Separate from main LEARN-X API
  - Docker containerized
  - Multi-tenant DB schema
```

### **Database Schema (Multi-Tenant)**
```sql
-- LTI Platform Registration
CREATE TABLE lti_platforms (
    id UUID PRIMARY KEY,
    iss VARCHAR(255) UNIQUE NOT NULL,
    client_id VARCHAR(255) NOT NULL,
    deployment_id VARCHAR(255),
    auth_login_url TEXT NOT NULL,
    auth_token_url TEXT NOT NULL,
    key_set_url TEXT NOT NULL,
    public_key_set JSONB,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(iss, client_id, deployment_id)
);

-- LTI Launch Sessions
CREATE TABLE lti_launches (
    id UUID PRIMARY KEY,
    platform_id UUID REFERENCES lti_platforms(id),
    user_sub VARCHAR(255) NOT NULL,
    context_id VARCHAR(255),
    resource_link_id VARCHAR(255),
    learn_x_user_id UUID REFERENCES users(id),
    launch_data JSONB,
    nonce VARCHAR(255) UNIQUE,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Grade Sync
CREATE TABLE lti_grade_sync (
    id UUID PRIMARY KEY,
    platform_id UUID REFERENCES lti_platforms(id),
    line_item_id VARCHAR(255),
    user_sub VARCHAR(255),
    score_given DECIMAL(5,2),
    score_maximum DECIMAL(5,2),
    activity_progress VARCHAR(50),
    grading_progress VARCHAR(50),
    synced_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
);
```

---

## **8-WEEK SPRINT BREAKDOWN**

### **Week 1-2: Foundation**
```yaml
Deliverables:
  ✅ LTI Gateway microservice scaffold
  ✅ pylti1p3 integration
  ✅ Canvas test instance hard-coded
  ✅ Core Launch working end-to-end
  ✅ JWT validation + nonce protection

Tests:
  - Canvas admin can install tool
  - Student clicks link → lands in LEARN-X
  - JWT claims correctly parsed
  - Multi-tenant isolation verified
```

### **Week 3: Security + Multi-tenancy**
```yaml
Deliverables:
  ✅ Database schema deployed
  ✅ Multi-tenant security guards
  ✅ Dynamic platform registration
  ✅ Key rotation mechanism

Tests:
  - Multiple Canvas instances isolated
  - Key rotation doesn't break active sessions
  - No data bleed between tenants
```

### **Week 4: Deep Linking**
```yaml
Deliverables:
  ✅ Content selection interface
  ✅ Live preview thumbnails
  ✅ Return URL generation
  ✅ Custom parameters support

Tests:
  - Instructor uses "Select Content"
  - LEARN-X content appears in Canvas
  - Custom params flow through
```

### **Week 5: Assignment & Grade Service**
```yaml
Deliverables:
  ✅ AGS line-item creation
  ✅ Score passback (queued, not synchronous)
  ✅ Grade sync status tracking
  ✅ Error handling + retry logic

Tests:
  - Grades appear in Canvas gradebook
  - Failed syncs retry automatically
  - No request thread blocking
```

### **Week 6: Names & Roles Provisioning**
```yaml
Deliverables:
  ✅ NRPS roster retrieval
  ✅ Nightly sync jobs
  ✅ Role mapping (instructor/student)
  ✅ Analytics integration

Tests:
  - Course roster automatically synced
  - Role changes reflected
  - Analytics can segment by LMS role
```

### **Week 7: Cross-LMS Testing**
```yaml
Platforms:
  ✅ Canvas validation
  ✅ Blackboard testing
  ✅ Brightspace/D2L testing
  ✅ Platform quirk documentation

Tests:
  - IMS certification test suite passes
  - All platform-specific edge cases handled
  - Performance under load (2k concurrent)
```

### **Week 8: Production Hardening**
```yaml
Deliverables:
  ✅ Penetration testing
  ✅ Load testing (2k concurrent launches)
  ✅ SLA monitoring (99.9% uptime)
  ✅ v1.0 release tagged

Tests:
  - Security audit passes
  - Performance SLA met
  - Operational runbooks complete
```

---

## **INTEGRATION TOUCH-POINTS**

### **User Linking Strategy**
```python
def handle_first_launch(lti_user_sub, lti_claims):
    """First launch: 30-second merge screen"""
    existing_user = find_user_by_email(lti_claims.get('email'))
    
    if existing_user:
        # Show merge confirmation
        return redirect_to_merge_screen(existing_user, lti_user_sub)
    else:
        # Auto-provision with confirmation
        return redirect_to_provision_screen(lti_claims)
```

### **Grade Conversion Logic**
```python
def convert_learn_x_score_to_lms(adaptive_score, max_points=100):
    """Convert adaptive scoring to numeric grade"""
    # LEARN-X adaptive score (0.0-1.0) → LMS points
    # Handle edge-case rounding that instructors complain about
    return round(adaptive_score * max_points, 1)
```

### **Course Context Mapping**
```python
def map_lti_context_to_course(context_id, context_title):
    """Map LMS context to LEARN-X course"""
    course = find_or_create_course(
        external_id=context_id,
        title=context_title,
        source='lti'
    )
    return course
```

---

## **PLATFORM QUIRKS (DOCUMENTED)**

### **Canvas**
- Strips custom params with uppercase letters
- JWT kid header must match registration exactly
- Rate limits: 100 req/min per token

### **Blackboard**
- Requires exact kid header matching
- Caches public keys for 24h
- Custom claim: `https://blackboard.com/lti/claim/one_step_off`

### **Brightspace/D2L**
- Caches JWKs for 30min (rotate keys slowly)
- Requires `target_link_uri` in login request
- Custom claim: `https://www.d2l.com/lti/claim/course_offering_id`

---

## **OPERATIONAL REQUIREMENTS**

### **Secrets Management**
```yaml
❌ Environment variables (amateur hour)
✅ AWS Secrets Manager / HashiCorp Vault
✅ Automated rotation
✅ Audit trail
```

### **Observability**
```python
# Log every launch with these fields
log.info("LTI Launch", extra={
    'iss': platform.iss,
    'deployment_id': deployment_id,
    'user_sub': user_sub,
    'latency_ms': (time.time() - start_time) * 1000,
    'success': True
})

# Alert on latency > 400ms
```

### **SLA Monitoring**
- **Uptime**: 99.9% (5.26 hours downtime/year max)
- **Latency**: P95 < 400ms for launches
- **Error Rate**: < 0.1% failed launches
- **Grade Sync**: < 5min delay

---

## **CERTIFICATION CHECKLIST**

### **IMS LTI 1.3 Advantage Test Suite**
```bash
# Run until ALL green
./run_ims_certification_tests.sh

Required Tests:
✅ Core Launch Flow
✅ Deep Linking
✅ Assignment & Grade Service
✅ Names & Roles Provisioning
✅ Security Compliance
✅ Multi-tenant Isolation
```

### **Security Audit**
```yaml
✅ OWASP Top 10 compliance
✅ JWT validation hardening
✅ Multi-tenant data isolation
✅ FERPA/GDPR compliance review
✅ Penetration testing
```

---

## **COMMON DEATH TRAPS (AVOID)**

1. **Canvas-Only Bias** → Test 3+ platforms from day 1
2. **Synchronous Grade Writes** → Queue everything
3. **Single-Tenant Assumptions** → Multi-tenant from start
4. **Library Abandonment** → Monitor OSS health
5. **FERPA Violations** → Document exact data claims

---

## **SUCCESS METRICS**

### **Technical**
- IMS certification: PASS
- 2k concurrent launches: < 400ms P95
- Multi-tenant isolation: Zero data leaks
- Uptime SLA: 99.9%

### **Business**
- Canvas App Directory approval
- Blackboard Partner certification
- First pilot customer live
- RFP security reviews passed

---

## **MARCHING ORDERS**

1. **Lock the spec** - LTI 1.3 Advantage only, no exceptions
2. **Assign owner** - One engineer owns Gateway end-to-end
3. **Ship skeleton in 2 weeks** - No delays, no excuses
4. **Get IMS certified** - Before any sales demos
5. **Document every quirk** - In the engineering handbook

**EXECUTE OR EXPLAIN TO INVESTORS WHY LEARN-X CAN'T SURVIVE PROCUREMENT**

---

## **IMMEDIATE NEXT STEPS**

1. Create LTI Gateway microservice
2. Implement pylti1p3 + Flask
3. Set up Canvas test instance
4. Build multi-tenant DB schema
5. Core Launch flow working

**DEADLINE: 2 weeks from NOW**