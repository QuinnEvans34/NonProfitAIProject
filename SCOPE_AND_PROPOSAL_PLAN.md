# Hope Connect — Three-Phase Scope and Proposal Plan

**Purpose:** Engineering scope and proposal-document structure for the partner conversation. Pricing is intentionally not included — it is being worked out separately between Ted and the parent company's financial advisor. This document defines exactly what gets built and when.

**Scope authority:** This document defines the engineering deliverables. The SOW (Ted's responsibility) will translate these deliverables into contractual terms including acceptance criteria, pricing, IP allocation, and payment milestones.

---

## Part 1 — Three-phase delivery overview

| Phase | Duration | Goal | What ships |
|---|---|---|---|
| **Phase 1 — MVP for Freebird** | 6 months | A working Hope Connect deployment that Freebird can pilot internally | Federated identity system with one configured tenant (Freebird), Google Sheets connector, structured intake, analyzer, case manager workspace, full architecture in place but only one tenant active |
| **Phase 2 — Multi-tenant SaaS framework** | 4–5 months | Convert the MVP into a multi-tenant platform with polish, ready for connector library and launch | THC master admin, org admin panel, tenant onboarding, theming, Spanish, accessibility, mobile, structured support form, documentation framework |
| **Phase 3 — Connector library + production launch** | 2–3 months | Complete the CRM integration library, finalize launch hardening, and go live in production | Airtable, HubSpot, bridge template, Salesforce connector, self-service onboarding UI, external security review, load testing, Charlotte production launch with Freebird |

Calendar total: **12–14 months** from contract signing to full v1.0 launch with comprehensive connector support.

---

## Part 2 — Phase 1 scope: MVP for Freebird (6 months)

### 2.1 Phase 1 goals

By the end of Phase 1, Freebird Foundation can use Hope Connect as a working internal tool. The full v4 architecture is implemented under the hood, but only Freebird is configured as a tenant. Multi-tenant administration and additional connectors are out of scope for Phase 1 but the data model and infrastructure support them on day one — no retrofit required in Phase 2.

### 2.2 Phase 1 architectural deliverables

**Infrastructure:**

- AWS account setup with isolated production and staging environments
- Terraform infrastructure-as-code for full reproducibility
- VPC, ECS Fargate cluster, ALB, ElastiCache Redis, RDS Postgres (multi-AZ), S3, KMS, Secrets Manager, CloudWatch
- Cloudflare configuration: DNS, WAF, DDoS protection, edge caching
- GitHub Actions CI/CD pipeline with blue/green deployment to ECS
- Health check and readiness probe endpoints

**Database and data model:**

- Postgres schema designed multi-tenant from day one (`org_id` foreign keys, row-level security policies)
- Migration system (Drizzle or Knex)
- Migration from current SQLite prototype data to Postgres
- All tables per `LEGAL_ARCHITECTURE_V4.md` Part 2 inventory: organizations, users, intakes, screening_responses, analyses, case_manager_actions, programs, question_templates, audit_log, subscriptions
- Year-only date discipline enforced at the schema and application layers
- Append-only enforcement on the audit log table via Postgres trigger

**Authentication and access control:**

- Clerk integration for staff authentication (case managers, org admins, THC admins)
- Per-tenant subdomain support (in preparation for Phase 2, but Freebird gets its subdomain in Phase 1)
- RBAC middleware with three roles: `case_manager`, `org_admin`, `thc_admin`
- MFA enforced for THC admins
- Audit logging of every authentication event and PHI-equivalent access

**Federated identity architecture:**

- Capability token issuance and validation (per § 2.6 of the legal architecture)
- Capability token replay-marker store in ElastiCache (per § 2.6.1)
- Case session issuance after capability token exchange (per § 2.6.2)
- Tenant identity service specification — documented REST API contract that tenant CRMs must satisfy
- Google Sheets connector (browser-direct OAuth, field mapping configuration, case manager UI integration)
- Reference deployment guide for tenants wiring up Google Sheets as their identity store

**Two-class logging:**

- Class 1 (infrastructure) and Class 2 (case audit) logging classes with strict separation
- Lint rules rejecting log statements that mix class identifiers
- Structured logging library that enforces class labels
- Configuration of Cloudflare, ALB, application logs, Sentry, and CloudWatch to exclude request bodies, authorization headers, capability tokens, and Case IDs from Class 1

**Hope Connect API:**

- Express 4 backend in a Docker container deployed to ECS Fargate
- Schema validation rejecting any field outside the published API specification
- Server-to-server authentication for tenant backends (signed payloads, signature validated and discarded)
- Rate limiting and request size limits
- Last-line PII detection (defensive — primary defense is the structured-only intake)
- Error handling with non-case-specific correlation IDs (no Case IDs in error reports)

**Analyzer pipeline:**

- Port the existing prototype analyzer to the v4 architecture
- Constrained-generation output via JSON schema with enum constraints — no free-text output from the LLM
- Anthropic Claude (or equivalent) as the analyzer LLM, calling with structured inputs only (no Case ID, no tenant_id transmitted to the LLM provider)
- Eval harness expanded from 10 to 20+ golden fixtures
- Deterministic help score function (already exists in prototype)
- Rule-based crisis floor (already exists in prototype)
- Severity floor enforcement (LLM may escalate, never de-escalate)
- Analysis result versioning and model metadata stamping

**Intake template specification:**

- Published JSON schema for intake templates (structured-only: Likert, single-select, multi-select, predefined-tag)
- Initial template for Freebird including the 17-question Likert screener plus structured contact-preference and category fields
- Schema validator that rejects any template with non-structured input types
- No free-text fields permitted at any layer

**Case manager workspace:**

- Hope Connect-origin iframe (case data only, no identity)
- Workspace UI: intake queue, case detail view, structured workflow controls
- Capability token exchange flow on iframe load
- Case session authentication for subsequent requests
- Status workflow (new, in_review, approved, contacted, closed) with audit logging
- Severity override capability with reason captured as structured enum
- Reanalyze button with version tracking
- Reference wrapper page implementation for Freebird (tenant-hosted at Freebird's subdomain)

**Crisis escalation:**

- Crisis flag detection in analyzer pipeline
- Webhook to Freebird's designated crisis endpoint with Case ID and event type only (no client information)
- Immediate hard-coded resource display at intake completion (suicide hotline, abuse hotline, 911 guidance, local Charlotte equivalents per Freebird's configuration)
- Crisis event logged in Class 2 audit log

**Basic reporting (Freebird-only):**

- KPI dashboard for Freebird case managers: total intakes, severity distribution, status distribution, help score distribution
- CSV export of structured case data (no identifying information)
- Date-range filtering (limited to year granularity per § 164.514(b)(2)(i)(C))

**Observability:**

- Sentry integration for error reporting (PII-scrubbed, no Case IDs)
- Better Stack or Datadog for logs and metrics
- PII scrubbing rules validated and tested

**Documentation (Phase 1):**

- Internal engineering documentation
- Brief tenant onboarding documentation for Freebird's staff
- API reference for the tenant identity service contract

### 2.3 Phase 1 user-facing capabilities

By end of Phase 1, the following workflows work end-to-end:

- A Freebird client visits Freebird's intake portal (tenant-hosted on Freebird's domain) and completes the structured intake.
- Freebird's tenant backend de-identifies the submission, generates a Case ID, and posts to Hope Connect.
- Hope Connect's analyzer runs and produces structured analysis output (severity, help score, recommended categories, follow-up question IDs).
- A Freebird case manager logs in to the case manager workspace, sees the intake in their queue, opens the case detail view, sees the analyzer output and screening responses.
- The case manager's browser separately fetches client identity from Freebird's Google Sheets (via the federated identity bridge) and displays it alongside the case data.
- The case manager can update the case status, override severity, request reanalysis, and view audit history.
- A crisis-flagged intake triggers a webhook to Freebird's crisis endpoint within 60 seconds of submission.

### 2.4 What is NOT in Phase 1

Explicit exclusions to prevent scope confusion:

- THC master admin UI (no tenant onboarding flow yet)
- Org admin panel (no tenant-side configuration UI yet)
- Multiple tenants (Freebird is the only configured tenant)
- Per-tenant theming (Freebird uses default Hope Connect branding in Phase 1)
- Connectors beyond Google Sheets (Airtable, HubSpot, Salesforce, etc.)
- Self-service connector onboarding UI
- Spanish translation and i18n
- WCAG accessibility audit and fixes
- Mobile-specific responsive QA
- Structured support form (Phase 1 support is via direct email to engineering team)
- Stripe billing scaffolding
- External security review (deferred to Phase 2)
- Production launch (Phase 1 ends with internal pilot, not public launch)

### 2.5 Phase 1 acceptance criteria

Phase 1 is complete when all of the following are demonstrably true:

- A Freebird test intake completes end-to-end through the production environment
- The analyzer eval harness passes 100% on all golden fixtures
- Two-class logging discipline is in place with lint rules enforcing it
- Audit log captures every case-related action
- The Federated identity flow works with Google Sheets as the tenant identity store
- A Freebird case manager can perform every workflow above through the production case manager workspace
- Cookie isolation testing passes on Chrome, Safari, and Firefox
- Crisis escalation webhook fires within 60 seconds of a crisis-flagged submission
- All Phase 1 architectural commitments from `LEGAL_ARCHITECTURE_V4.md` Part 7 are met

---

## Part 3 — Phase 2 scope: Multi-tenant SaaS framework (4–5 months)

### 3.1 Phase 2 goals

Convert the working Freebird MVP into a multi-tenant SaaS platform that the parent company can credibly sell to additional nonprofits. Phase 2 ends with a public production launch.

### 3.2 Phase 2 architectural deliverables

**THC master admin:**

- Tenant lifecycle management UI (create, activate, suspend, deactivate tenants)
- Tenant subscription tier assignment
- Question template library management (versioning, publication, deprecation)
- Cross-tenant anonymized analytics with cell-size suppression (minimum k threshold pending Expert Determination)
- Support ticket dashboard for THC support staff
- Read-only "view as tenant" mode (case data only, never identity)

**Org admin panel (per-tenant):**

- Tenant branding configuration (logo upload, primary and secondary colors, custom welcome copy, custom support email)
- Case manager user management (invite, role assignment, deactivation, last-login visibility)
- Identity service configuration (which connector, OAuth setup, field mapping interface)
- Tenant program directory management (per-tenant list of programs case managers can refer clients to)
- Crisis response configuration (designated crisis contact, hard-coded resources to surface at intake completion)
- Per-tenant reporting view
- Cookie discipline pre-launch test runner (validates that the tenant's wrapper and identity service cookies meet the host-only / __Host- prefix requirements per § 3.3)

**Per-tenant theming:**

- CSS variable-based theme system
- Tenant-config bootstrap on page load (logo, colors, copy from tenant configuration)
- No per-tenant code or build deployments

**Tenant onboarding flow:**

- THC master admin invites a new tenant via email
- Tenant org admin completes initial setup wizard (branding, identity service connection, crisis configuration, initial case manager invites)
- Per-tenant subdomain provisioning automation (`hopeconnect.<tenant>.example.org`)
- Per-tenant CSP `frame-ancestors` configuration automation (exact origin enumeration, no wildcards)
- Onboarding documentation tailored to each supported connector

**Stripe billing scaffolding:**

- Subscription table with tenant tier, seats, intake quota, features enabled
- Stripe webhook integration for subscription lifecycle events
- Subscription enforcement middleware on key endpoints
- Basic invoice generation
- Quarterly billing periods (per § 2.10 of the legal architecture, with minimum-count suppression on small-tenant usage metrics)

**Internationalization and accessibility:**

- i18next or equivalent i18n framework
- Spanish translation pass (professional translator engaged as hard cost)
- WCAG 2.1 AA audit by external accessibility consultant (engaged as hard cost)
- Engineering remediation of critical and high WCAG findings (aim for "AA-aligned" rather than full certification)
- Text-to-speech support
- Font scaling controls
- Keyboard navigation audit and fixes
- Screen reader compatibility testing

**Mobile and cross-browser:**

- Responsive QA across iOS Safari, Android Chrome, and common tablet viewports
- Browser compatibility matrix testing (Chrome, Safari, Firefox, Edge — current and one prior major version)
- Cookie isolation behavior verified across browsers (Safari ITP especially)

**Support infrastructure:**

- Structured support form on Hope Connect's platform per § 3.8 of the legal architecture
- No free-text fields in any support category
- Synthetic record submission for technical investigation
- Counsel-designed security incident response procedure with pre-approved BAA templates
- Outbound staff email via Postmark (no Case IDs in email content)

**Pre-launch hardening preparation (full review and launch happen in Phase 3):**

- Disaster recovery procedure documentation
- Backup verification and restore drill
- Vulnerability scanning automation set up
- Monitoring and observability dashboards in place

**Documentation (initial drafts; connector-specific docs completed in Phase 3):**

- Case manager training materials
- Org admin reference manual
- THC master admin runbook
- Security incident response playbook (counsel-approved)
- API reference for tenant integrations

### 3.3 Phase 2 user-facing capabilities

By end of Phase 2, the following capabilities exist in the staging environment (not yet in production):

- THC master admin can provision a new tenant via the master admin UI
- A new tenant org admin can complete the onboarding wizard, configure branding, and invite case managers
- The platform supports the multi-tenant data model with full org isolation
- A new tenant connects their Google Sheets identity store (the only available connector in Phase 2)
- Clients can complete intake in English or Spanish via a fully accessible UI
- Mobile users can complete intakes responsively
- The structured support form is available
- Aggregate cross-tenant analytics are visible to THC master admins (with suppression)

Phase 2 is a development milestone, not a public launch. No tenants — including Freebird — go live in production at end of Phase 2.

### 3.4 What is NOT in Phase 2

- Any CRM connector beyond Google Sheets (all additional connectors are in Phase 3)
- Self-service connector onboarding UI (in Phase 3)
- External security review (in Phase 3, after the connector library is complete)
- Load testing (in Phase 3, against the full system)
- Production launch (in Phase 3)
- Native mobile applications (always out of scope for v1)
- Closed-loop referral tracking (post-v1.0)
- Federal grant report templates (post-v1.0)
- Two-way SMS conversation logging (post-v1.0)
- Multi-language support beyond English and Spanish (post-v1.0)

### 3.5 Phase 2 acceptance criteria

Phase 2 is complete when all of the following are true:

- THC master admin can onboard a new tenant from invitation to first staging-environment intake within 30 minutes (using Google Sheets as the identity connector)
- A test tenant (separate from Freebird) is provisioned and operational in the staging environment
- Spanish-language intake works end-to-end with professional translation
- WCAG 2.1 AA audit findings at critical and high severity are remediated
- Mobile responsive QA passes on iOS Safari and Android Chrome at common viewport sizes
- Structured support form is operational
- Cookie isolation pre-launch testing passes on Chrome, Safari, and Firefox
- All Phase 2 architectural deliverables are demonstrably working in the staging environment

---

## Part 4 — Phase 3 scope: Connector library (2–3 months)

### 4.1 Phase 3 goals

Build out the connector library so the platform can serve tenants of any size and any CRM background, complete the final pre-launch hardening (security review, load testing), and execute the production launch. Phase 3 ends with the platform live in production at Freebird and ready to onboard additional tenants on any supported connector.

### 4.2 Phase 3 architectural deliverables

**Airtable connector (browser-direct):**

- Personal Access Token-based authentication
- Field mapping UI in tenant admin
- Reference Airtable base schema documentation
- Same tenant identity service contract as Google Sheets

**HubSpot connector (browser-direct):**

- OAuth flow against tenant's HubSpot account
- Field mapping interface
- Custom property mapping support (HubSpot has free-tier limitations on standard fields)
- Reference HubSpot custom property schema documentation

**Bridge template (Cloudflare Worker reference implementation):**

- Deployable template the tenant hosts on their own infrastructure
- OAuth credential storage inside the tenant's environment
- REST API exposing the tenant identity service contract to the case manager browser
- Field mapping configuration UI within the bridge
- Documentation for deploying to tenant's Cloudflare account
- Alternative deployment instructions for AWS Lambda or Docker container hosting
- Health check endpoint
- Bridge upgrade strategy

**Salesforce connector via bridge:**

- Salesforce Connected App setup documentation for tenants
- Salesforce REST API integration within the bridge service
- SOQL query patterns for common nonprofit data models (NPSP, custom Contact and Account structures)
- Field mapping defaults for Salesforce NPSP (Nonprofit Success Pack)
- Cross-org Salesforce variation handling

**Self-service connector onboarding UI:**

- Per-tenant admin UI for "Connect a new CRM" with step-by-step flow
- Connector picker (Google Sheets, Airtable, HubSpot, Salesforce-via-bridge)
- OAuth initiation and credential storage for browser-direct connectors
- Bridge URL configuration for bridge-required connectors
- Field mapping interface for each connector type
- Test connection button with diagnostic output
- Connector status monitoring (last successful test, recent errors)

**Connector framework refinements:**

- Common error handling and retry behavior across connectors
- Connector-specific feature flags (some tenants may want different field mapping behavior)
- Connector audit log entries when identity is fetched
- Connector deprecation handling (graceful migration if a tenant changes connectors)

**Per-tenant CSP automation:**

- One-click tenant origin registration in Hope Connect's CSP `frame-ancestors` directive
- Automatic deployment pipeline integration
- Verification that the registered origin actually works (live test against the tenant's wrapper page)

**Connector documentation:**

- Tenant-facing setup guide per connector
- Field mapping reference per connector
- Bridge deployment guide
- Troubleshooting documentation
- Migration guide for changing connectors

**Connector eval and testing:**

- Integration test suite per connector against test instances
- Synthetic test data generation for each connector type
- Cross-connector consistency tests (the same intake should produce the same case data regardless of which connector the tenant uses)

**Final pre-launch hardening:**

- External security review (third-party engagement, hard cost) — runs against the complete platform including all connectors
- Load testing (target: 1000 concurrent users, 100 intakes per hour peak)
- Penetration test coordination (if budget permits)
- Final vulnerability remediation

**Documentation completion:**

- Tenant onboarding guide finalized per supported connector (Sheets, Airtable, HubSpot, Salesforce-via-bridge)
- Connector troubleshooting documentation
- Bridge deployment guide
- Customer support knowledge base populated

**Production launch:**

- Production environment promotion of all infrastructure from staging
- Charlotte launch with Freebird Foundation as production tenant #1
- Post-launch monitoring runbook
- On-call rotation setup and documentation
- Launch communication to Freebird's staff and clients
- Day-one through day-thirty operations playbook

### 4.3 Phase 3 user-facing capabilities

By end of Phase 3 (production launch), the following is true:

- Hope Connect is live in production at Freebird Foundation
- A new tenant can self-onboard onto any supported connector through a tenant admin UI in under one hour (assuming they have IT capability appropriate to their chosen CRM)
- Tenants running Salesforce NPSP can connect via the bridge template with a documented one-time deployment
- The parent company can credibly approach Salesforce-using nonprofits as prospects
- HubSpot-using tenants have a free-tier path to integration
- All major nonprofit CRM options are covered: Sheets, Airtable, HubSpot, Salesforce
- External security review has been completed and findings remediated
- Load testing validates target throughput

### 4.4 What is NOT in Phase 3

- Bonterra Apricot connector (separate engagement post-v1.0)
- ETO Social Solutions connector (separate engagement post-v1.0)
- Microsoft Excel via OneDrive connector (separate engagement)
- Notion connector (separate engagement)
- Custom CRM connectors for specific tenants (priced per-tenant)
- Federal grant report templates (post-v1.0)
- Closed-loop referral tracking (post-v1.0)
- Two-way SMS conversation logging (post-v1.0)

### 4.5 Phase 3 acceptance criteria

Phase 3 is complete when all of the following are true:

- Airtable, HubSpot, Salesforce (via bridge), and Google Sheets connectors are all operational
- The bridge template is deployable in under 30 minutes by a technically-capable tenant
- The self-service onboarding UI allows a tenant org admin to connect a new CRM end-to-end without engineering involvement
- A second test tenant is onboarded using Salesforce via the bridge as a real-world validation
- Connector documentation covers all four primary CRMs
- Integration tests pass for all four connectors
- External security review delivered with no critical findings open
- Load test sustains target throughput without errors
- Hope Connect is live in production at Freebird Foundation

---

## Part 5 — Cross-phase considerations

### 5.1 Expert Determination engagement

Runs in parallel with Phase 1 (months 1–2 of the calendar). The Expert Determination expert evaluates the architecture as defined in `LEGAL_ARCHITECTURE_V4.md` and documents the re-identification risk per § 164.514(b)(1).

Required to complete before any production data flows. Engineering work in Phase 1 that doesn't depend on the ED outcome proceeds in parallel.

### 5.2 Attorney engagement

Runs in parallel with Phase 1 (months 1–3 of the calendar). Attorney drafts:

- Master Subscription Agreement template
- Privacy Policy
- Tenant-specific addenda templates
- Security incident response procedure with pre-approved BAA templates
- Business Associate analysis per tenant arrangement contemplated

Required to complete before MSA signing with any tenant.

### 5.3 Maintenance retainer

Begins at Phase 1 completion (month 6) and runs through end of Phase 3 and beyond. $2,000/month for 12 months minimum, 20 hours included per month, $115/hour overage rate. Covers:

- Security patching of dependencies
- Bug fixes and critical issue response (4-hour business-day acknowledgment, 24-hour P1 resolution target)
- Minor feature additions (≤ 8 hours per feature)
- Compliance maintenance (annual review of privacy policy, terms, vendor list)
- Tier-2 tenant support escalation
- Monthly status report and quarterly business review

Hard costs (AWS, Clerk, Anthropic, etc.) billed to the parent company directly.

### 5.4 Documentation discipline across all phases

Every phase produces documentation as a deliverable:

- Phase 1: internal engineering docs, basic Freebird onboarding docs, API reference for the tenant identity service contract
- Phase 2: tenant onboarding guides, case manager training, org admin reference, THC master admin runbook, security incident playbook
- Phase 3: connector setup guides per CRM, bridge deployment guide, troubleshooting docs, field mapping references

### 5.5 Testing and quality

Testing is integrated into each phase, not a separate phase:

- Unit tests for all new business logic
- Integration tests for connector interactions
- End-to-end tests for critical user flows
- Eval harness expansion (analyzer fixtures grow from 10 to 30+ across all three phases)
- Browser compatibility testing in Phase 2
- Load testing in Phase 2
- Security review in Phase 2

### 5.6 Items explicitly out of scope across all phases

Listed here for SOW reference:

- HIPAA Business Associate tier (a future product if any tenant requires it)
- Native mobile applications (always out of scope for v1)
- Closed-loop referral tracking
- Federal grant report templates (TANF, SNAP, CDBG)
- Multi-language support beyond English and Spanish
- Two-way SMS conversation logging
- Bonterra Apricot, ETO, Microsoft Excel/OneDrive, Notion connectors (post-v1.0 engagements)
- Custom CRM connectors for specific tenants (priced separately per-tenant)
- AI-generated free-text content for case managers or clients (architectural commitment, not a budget question)
- Free-text staff notes in Hope Connect (architectural commitment)
- Client portal in Hope Connect (architectural commitment)
- White-label sub-branding of the Hope Connect platform itself by tenants
- Integration with state MMIS, child welfare systems, or law enforcement databases
- Custom analytics dashboards beyond the published reporting surface

---

## Part 6 — Proposal document structure

The partner-facing proposal is intentionally lean — no pricing, no payment schedules, no IP discussion, no team financial information. Those live in the SOW (Ted's responsibility) and in separate financial documents.

The proposal is the engineering and architecture pitch. Approximately 12–18 pages when typeset.

### Proposal structure

**Cover page**

- Title: "Hope Connect — Engineering Scope and Delivery Plan"
- Prepared for: parent company name
- Prepared by: Quinn Evans and Ted [last name]
- Date
- Document version

**Section 1 — Executive summary** (1 page)

What Hope Connect is, who it's for, the three-phase delivery model, the federated identity architecture in plain language, the 12–14 month calendar, what's accomplished at each phase.

**Section 2 — Background and context** (1–2 pages)

- The corporate structure (for-profit parent funding Freebird Foundation)
- The pilot prototype and what it demonstrated
- The market position relative to existing case management tools
- The Charlotte launch context and identified partner organizations
- The decision to architect for a multi-tenant SaaS rather than a single-customer build
- The decision to use the federated identity architecture
- Brief reference to the legal review package as the source of architectural detail

**Section 3 — The product** (2–3 pages)

What Hope Connect does at a business level:

- AI-assisted intake (analyzer pipeline, severity scoring, deterministic help score)
- Structured screening (the 17-question Likert plus categorical fields, all enum-validated)
- Case manager workspace (the isolated iframe model and what it means for tenants)
- Federated identity (tenants keep their existing CRMs, Hope Connect doesn't hold PHI)
- Multi-tenant SaaS framework (sell to other nonprofits)
- Configurable per-tenant theming
- Standardized question library
- Aggregate cross-tenant reporting (with cell suppression)

Reference to the legal architecture for the technical depth. The proposal stays at the "what it does" level; the legal document goes to "how it satisfies which regulation."

**Section 4 — The architecture at a glance** (1 page)

Include the system architecture diagram we already rendered (`hope_connect_architecture.png`). Two paragraphs explaining the diagram in business terms:

- Tenants own their identity data
- Hope Connect holds structured case data only
- The browser is where the two halves meet visually
- All notifications and client outreach happen on the tenant's side

**Section 5 — Phase 1 deliverables and timeline** (2–3 pages)

Working from Part 2 above. Lead with what's accomplished at end of Phase 1 in business terms, then list the engineering deliverables. End with the Phase 1 acceptance criteria.

**Section 6 — Phase 2 deliverables and timeline** (2–3 pages)

Working from Part 3 above. Same structure: business outcomes first, then engineering deliverables, then acceptance criteria.

**Section 7 — Phase 3 deliverables and timeline** (2 pages)

Working from Part 4 above. Same structure.

**Section 8 — Cross-phase considerations** (1 page)

- Expert Determination engagement runs in parallel with Phase 1
- Attorney engagement runs in parallel with Phase 1
- Maintenance retainer begins at Phase 1 completion
- Testing and quality integrated throughout

Brief mention of hard costs the parent pays directly (AWS, Cloudflare, Clerk, Anthropic, Postmark, translator, security review, ED, attorney).

**Section 9 — Out of scope** (1 page)

Working from § 5.6 above. Explicit list of what's not included to prevent scope drift.

**Section 10 — Timeline visualization** (1 page)

A simple month-by-month calendar visualization. Phase 1 spans months 1–6 (with ED and attorney work in parallel during months 1–3). Phase 2 spans months 7–11. Phase 3 spans months 12–14. Launch milestone at end of Phase 2. Connector library complete at end of Phase 3.

**Section 11 — Team** (1 page)

Brief. Quinn Evans and Ted [last name] as the engineering team. The prototype as evidence of capability. The three rounds of legal review as evidence of rigor. The maintenance retainer relationship after launch.

**Section 12 — Next steps** (1 page)

- Contract signing (SOW + MSA framework signed)
- Expert Determination engagement begins (parallel)
- Attorney engagement begins (parallel)
- Engineering kickoff
- Phase 1 monthly status reporting begins

**Appendix A — Reference documents**

Pointer to:

- `LEGAL_ARCHITECTURE_V4.md` — provided to the parent's attorney
- SOW — provided separately (Ted's deliverable)
- `PROJECT_STATE.md` — current prototype documentation if needed
- System architecture diagram

---

## Part 7 — Next steps in producing the proposal

1. **You confirm the scope above** — particularly the Phase 1 / Phase 2 / Phase 3 splits and the out-of-scope list. If anything needs adjustment, flag it before I draft the proposal.
2. **Ted confirms the SOW will mirror this scope** — same phase boundaries, same deliverables, same acceptance criteria. The SOW adds pricing, payment terms, IP allocation, change-order process.
3. **I draft the proposal** — approximately 12–18 pages following the structure in Part 6. No pricing language anywhere.
4. **I draft the legal review package** — anchored by `LEGAL_ARCHITECTURE_V4.md` plus the attorney review checklist, MSA framework clauses, subprocessor list, Expert Determination engagement scope.
5. **All three documents go to the parent together** — proposal as the engineering pitch, SOW as the contract, legal review package for the attorney.

If any element of the scope above needs to change before drafting, this is the moment. Once the proposal goes out, scope changes become change orders.
