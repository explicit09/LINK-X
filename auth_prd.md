# Product Requirements Document (PRD)

## Project Title

Unified Authentication System with Supabase

## Purpose

Provide a secure, scalable, and developer-friendly authentication layer for all LEARN-X apps and services, built entirely on Supabase Auth + Postgres to reduce maintenance overhead and eliminate custom auth logic.

## Scope
- **In-Scope**: User sign-up, sign-in, session refresh, password reset, social log-ins, role-based access, client SDK integration, logging & analytics.
- **Out-of-Scope**: Fine-grained classroom permissions, billing/Stripe integration, non-web form factors (mobile native) — to be handled in later PRDs.

## Objectives & Success Metrics

| Objective | KPI | Target |
|-----------|-----|--------|
| Reduce custom auth code | Lines of auth code in repo | −80% vs current |
| Decrease auth-related incidents | Auth bug tickets / month | 0 P1 bugs post-launch |
| Improve sign-up completion | Sign-up success rate | ≥ 95% |
| Fast login | P95 login latency | < 300 ms |

## Stakeholders
- **Product**: 
- **Engineering**: Backend, Frontend, DevOps leads
- **Design**: UX team (onboarding flow)
- **Security**: SecOps

## User Stories
1. **New learner**: "I can create an account with email or Google in <30 s so I can start using LEARN-X."
2. **Returning learner**: "I stay logged in across tabs and refreshes."
3. **Admin**: "I can assign the admin role and immediately see admin dashboards."
4. **Security officer**: "I view audit logs of every auth event in one dashboard."

## Functional Requirements

| ID | Requirement |
|----|-------------|
| F-1 | Email+password sign-up with double-opt-in magic-link verification |
| F-2 | OAuth (Google, Microsoft) one-click sign-up/sign-in |
| F-3 | Passwordless magic-link login |
| F-4 | Refresh tokens & auto-refresh with Supabase JS client |
| F-5 | Role-based access (student, instructor, admin) stored in auth.users.app_metadata.role |
| F-6 | Profile data mirrored in public.profiles table via Supabase function |
| F-7 | Webhook to audit table security.auth_events for every login/logout |
| F-8 | MFA (TOTP) optional, enforced for admin |

## Non-Functional Requirements
- **Security**: OWASP Top-10 compliance, RLS enabled on all tables, secrets via Supabase Vault.
- **Performance**: P95 latency <300 ms for auth endpoints.
- **Reliability**: 99.9% monthly availability.
- **Scalability**: 50k MAU without modification.
- **Compliance**: FERPA & GDPR ready (data residency EU & US regions).

## Architecture Overview

```
[Client (Next.js, React Native)]
        ↓ supabase-js SDK (single source of truth)
[Supabase Auth]  ↔  [Postgres: auth schema]
        ↘ triggers/webhooks ↘
    [profiles table]     [security.auth_events]
```

- All apps import @supabase/auth-helpers wrapper.
- Shared authService.ts exposes typed helpers (signIn, signUp, signOut, getSession).

## Implementation Phases

| Phase | Goal | Key Tasks | Owner | Est. Time |
|-------|------|-----------|-------|-----------|
| 0. Planning & Design | Finalize PRD, ERD, roles | Align on roles, data flows | Product | 1 wk |
| 1. Supabase Project Setup | Foundation | Create project, enable RLS, add profiles, seed roles | Backend | 0.5 wk |
| 2. Core Email Auth | Email+password + magic link | Implement F-1, F-3, client wrappers, UX screens | Frontend | 1 wk |
| 3. Social OAuth | Google, Microsoft | Configure providers, UI buttons, redirect handling | Frontend | 0.5 wk |
| 4. Session Management | Persistent login | Add refresh token handling, silent refresh hooks | Front/Backend | 0.5 wk |
| 5. RBAC & Hooks | Roles + events | Assign roles post-sign-up, trigger audit logging | Backend | 0.5 wk |
| 6. Security Hardening | MFA, rate limits | Enable TOTP for admins, add WAF/rate limiting | SecOps | 1 wk |
| 7. QA & Roll-out | Test & deploy | Cypress e2e, load tests, staged rollout | QA/DevOps | 1 wk |

## Deliverables by Phase
- ERD & User-flow diagrams
- Supabase SQL migration scripts (/migrations)
- Shared authService.ts
- React/Next.js pages: /signup, /login, /dashboard
- Cypress test suite (auth.spec.ts)
- Monitoring dashboards (Supabase Metrics + Grafana)

## Success Criteria (Exit Checklist)
- All functional requirements met
- 100% pass rate on auth test suite
- P95 login latency <300 ms in staging load test
- Security review signed off
- Audit logs visible in Grafana

## Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| Provider lock-in | Abstract auth helpers behind authService |
| OAuth quota limits | Automatic provider fallback to email magic link |
| Data breach | Enforce email alerts on RLS policy changes |

---

**Version**: v1.0 — June 7 2025
