# Hope Connect — Legal Architecture v3 (Minimized PHI Exposure)

**Purpose:** Architectural commitments supporting a conditional non-Business-Associate posture for Hope Connect. This document supersedes `LEGAL_ARCHITECTURE_V2.md`. It incorporates every fix identified in the second round of reviewer feedback. It is meant to be evaluated again by the second-opinion reviewer and, if validated, presented to qualified counsel as the basis for the Master Subscription Agreement and Privacy Policy.

**Predecessor documents superseded:** `HOPE_CONNECT_PROPOSAL.md` (v1), `LEGAL_REVIEW_RESPONSE.md`, `LEGAL_ARCHITECTURE_V2.md`. All prior framing as "strict Safe Harbor" or "out of HIPAA scope" is replaced by the conditional position stated below.

**All claims in this document are stated as architectural intent and design commitments, conditional on:** (a) successful Expert Determination review, (b) attorney confirmation, and (c) tenant compliance with the requirements imposed in the Master Subscription Agreement.

---

## Part 1 — The legal position

Hope Connect is designed to minimize PHI exposure and to receive only information de-identified by the tenant. Covered-entity tenants must document de-identification through Safe Harbor (45 CFR § 164.514(b)(2)), including § 164.514(c), or through Expert Determination (45 CFR § 164.514(b)(1)) before transmitting records to Hope Connect.

Hope Connect's non-Business-Associate position is **conditional on:**

1. The tenant performing de-identification before transmission.
2. Hope Connect receiving no PHI through any service, support, or operational channel.
3. Hope Connect's data plane operating exactly as specified in this document.
4. A formal Expert Determination by a qualified statistician, commissioned by Hope Connect before launch, confirming that the actual data flows, tenant context, and operational telemetry pose a "very small" re-identification risk under § 164.514(b)(1).
5. Ongoing compliance with the operational commitments in Part 9.

This is a defensible posture, not an established one. Hope Connect's status as a Business Associate of any individual tenant depends entirely on whether PHI is in fact transmitted to or maintained by Hope Connect under that tenant's arrangement. If a tenant violates its de-identification obligations under the MSA, Hope Connect may become a Business Associate of that tenant by virtue of the actual data flow, irrespective of contractual intent.

---

## Part 2 — Inventory of data received

This is the exhaustive list of fields Hope Connect's API accepts. Any data outside this inventory is rejected by schema validation at the API boundary.

### 2.1 Per intake submission

| Field | Type | Source | Notes |
|---|---|---|---|
| `case_id` | Opaque string (16 bytes CSPRNG, base64url) | Tenant backend | Under § 164.514(c). Tenant retains the re-identification mapping. |
| `tenant_id` | Hope Connect-assigned UUID | Hope Connect-managed | Does not encode geography. |
| `submission_year` | Integer (year only) | Tenant backend | No month, day, hour, or finer. |
| `intake_template_id` | UUID | Hope Connect-managed | References the published template version. |
| `screening_responses` | Array of `{ question_id, likert_value }` | Tenant backend | Likert values 1–5 only. |
| `categorical_responses` | Object `{ field_id: enum_value }` | Tenant backend | All values from published enum lists. |
| `tag_selections` | Array of strings from published tag library | Tenant backend | No free-form tags. |

Submission signatures are validated and discarded; signature bytes are not persisted or logged.

### 2.2 Categorical enum vocabulary (selected examples)

Critically, **no enum value encodes a calendar reference**. The previous time-window enums (`today`, `this_week`, `this_month`) are replaced with severity-only terms:

| Field | Values |
|---|---|
| `need_category` | `housing`, `food`, `healthcare`, `employment`, `legal`, `utilities`, `other` |
| `urgency_classification` | `immediate`, `urgent`, `standard`, `planning` |
| `language_preference` | ISO 639-1 codes (e.g., `en`, `es`) |
| `housing_status` | `stable`, `at_risk`, `unstable`, `unhoused` |
| `employment_status` | `employed_stable`, `employed_unstable`, `unemployed_seeking`, `unemployed_not_seeking`, `unable_to_work` |

The full enum library is maintained in `intake_template_specification.json`. No enum value contains a calendar reference, a date, or a quantity that could imply a date.

### 2.3 Analyzer output (constrained generation)

The analyzer's LLM call is constrained via JSON schema to produce only structured output:

| Field | Type |
|---|---|
| `severity_level` | Enum: `low`, `medium`, `high`, `crisis` |
| `severity_score` | Integer 0–100 (deterministically computed, not LLM-generated) |
| `risk_flags` | Object of `{ flag_name: boolean }` |
| `primary_need_category` | Enum |
| `secondary_need_categories` | Array of enums |
| `urgency_classification` | Enum (per §2.2) |
| `recommended_program_categories` | Array of enums |
| `recommended_followup_question_ids` | Array of IDs from published library |
| `comment_codes` | Array of strings from published comment library |

The analyzer does not produce free-text fields. All output is from predefined libraries.

### 2.4 Case Data persisted in Hope Connect's database

Same as §2.1 and §2.3, plus:

| Field | Notes |
|---|---|
| `current_status` | Enum: `new`, `in_review`, `approved`, `contacted`, `closed`, etc. |
| `status_history` | Ordered list of `{ status_enum, status_year }` — year only, **no ordinal counter** |
| `analyzer_version` | Reference to prompt/model version |

For case manager workflow ordering within an active queue, the UI sorts by severity, primary need category, and status — not by any time field, and not by any per-tenant ordinal. Within a single case, sub-actions can carry per-case action sequence numbers (e.g., "first override," "second override") since these are per-case internal counters, not identifying codes.

### 2.5 Per case manager workflow action

| Field | Notes |
|---|---|
| `case_id` | Per § 164.514(c). |
| `case_manager_id` | Tenant staff UUID. Case manager email is captured at user creation by Clerk; not transmitted per-action. |
| `action_type` | Enum |
| `action_payload` | Structured per action type. No free text. |
| `action_year` | Year only. |

No timestamps. No precise dates. No per-tenant action ordinals.

---

## Part 3 — Architectural specification

### 3.1 Data flow

```
1. CLIENT INTAKE (entirely on tenant infrastructure)
   ├─ Client visits tenant.example.org/intake
   ├─ Form contains ONLY structured inputs (Likert, enums, predefined tags)
   ├─ No free-text fields of any kind
   ├─ Client submission stays on tenant infrastructure

2. TENANT BACKEND (tenant infrastructure)
   ├─ Receives structured submission
   ├─ Generates Case ID (CSPRNG, 16 bytes, base64url)
   ├─ Stores in tenant's CRM: { case_id, identity_info, intake_date_full, ... }
   │   The tenant performs de-identification and retains the re-id mapping per § 164.514(c).
   ├─ Constructs the de-identified payload per §2.1 (year only, no client metadata)
   ├─ Signs the payload with a tenant-backend-only signing key
   ├─ POSTs to Hope Connect API over server-to-server TLS

3. HOPE CONNECT API (AWS behind Cloudflare)
   ├─ Accepts traffic from authenticated tenant backends only
   ├─ Validates signature; signature is then DISCARDED (not logged, not persisted)
   ├─ Validates schema; any unexpected field rejects the request
   ├─ Persists record per §2.4 (year only)
   ├─ Enqueues analyzer job

4. ANALYZER (Anthropic / equivalent cloud LLM)
   ├─ Reads structured intake record
   ├─ Constructs LLM call payload containing ONLY:
   │     • screening_responses (Likert)
   │     • categorical_responses (enum values)
   │     • tag_selections
   │     • intake_template_id
   │     The payload does NOT contain case_id, tenant_id, or any identifier.
   ├─ LLM produces structured output via JSON schema with enum constraints
   ├─ Output is validated; any non-conforming output triggers retry, then fallback
   ├─ Hope Connect associates the analyzer output with the case_id on its own side
   │   (the association happens only inside Hope Connect's database, not at the LLM provider)
   ├─ Webhook to tenant: { case_id, event_type, analyzer_output }; tenant decides what to do

5. CASE MANAGER WORKSPACE (isolated iframes in tenant-hosted wrapper)
   ├─ Case manager opens tenant.example.org/cases (tenant page, no case_id in URL)
   ├─ Tenant page authenticates case manager against tenant's identity system
   ├─ Tenant page generates a short-lived capability token for Hope Connect
   │   (signed by tenant backend, includes case_id, expires in minutes)
   ├─ Wrapper page renders TWO iframes:
   │
   │   IFRAME A: tenant-identity.example.org/identity
   │     • Tenant origin
   │     • Tenant auth; Case ID passed in URL fragment or POST body (NOT URL path)
   │     • Displays identity, contact history, narrative notes
   │     • Communicates ONLY with tenant CRM
   │
   │   IFRAME B: hopeconnect.app/case
   │     • Hope Connect origin
   │     • Capability token in fragment; Case ID is in token payload, not URL path
   │     • Clerk authentication via per-tenant subdomain for Safari/ITP compatibility
   │     • Displays severity, screening, analyzer output, structured workflow controls
   │     • CSP: frame-ancestors limited to registered tenant origins
   │     • CSP: connect-src limited to api.hopeconnect.app
   │     • No general message listeners; explicit origin verification if any message handling
   │     • No session replay, no DOM-capturing telemetry
   │
   ├─ The wrapper page does not exchange data between iframes
   ├─ Each iframe communicates only with its own backend
   ├─ Status updates and structured workflow actions: IFRAME B → Hope Connect API
   ├─ Narrative notes and identity updates: IFRAME A → tenant CRM
   └─ Both iframes set Referrer-Policy: no-referrer and Cache-Control: no-store

6. NOTIFICATIONS (entirely tenant-operated)
   ├─ Hope Connect publishes webhook events to tenant URLs
   │   Payload: { case_id, event_type, structured_payload }
   ├─ Tenant backend receives, joins to tenant CRM identity
   ├─ Tenant infrastructure (tenant Twilio, tenant SendGrid, etc.) issues notifications
   └─ Twilio, SendGrid, Postmark, and similar are NOT Hope Connect's subprocessors
```

### 3.2 The Case ID under § 164.514(c)

Same architecture as v2, with one critical refinement: **Hope Connect minimizes Case ID propagation outside of essential internal use.**

**Tenant responsibilities:**
- Generates the Case ID using CSPRNG at intake.
- Maintains the re-identification mapping in tenant's own CRM only.
- Discloses the Case ID to Hope Connect alongside the de-identified record.
- Does not disclose the Case ID to third parties.
- Does not disclose the re-identification mechanism to anyone outside the tenant.

**Hope Connect's restricted uses of Case ID (the only permitted uses):**
1. Primary key for internal database retrieval.
2. Workflow lookup in the case manager iframe.
3. Aggregate analytics with cell-size suppression (no Case ID disclosed, just aggregate counts).
4. Webhook event references to the originating tenant.

**Hope Connect's prohibited propagations of Case ID:**
- **Not sent to Anthropic or any LLM provider.** The analyzer call carries only structured inputs; the association of analyzer output to Case ID happens only inside Hope Connect's database after the LLM call returns.
- **Not sent to Sentry, Datadog, or observability vendors.** Error reports use transient, scoped error correlation IDs that do not equal Case IDs. The error-correlation-to-Case-ID mapping exists only in Hope Connect's case audit log.
- **Not included in staff email content.** Emails to case managers say "you have new cases to review" with a link to the dashboard. The dashboard determines what to display from the authenticated user's permissions, not from any URL-embedded Case ID.
- **Not placed in URL paths.** Both case manager iframes use generic routes; Case IDs are transported via short-lived signed capability tokens in URL fragments (which do not transmit over the wire after the initial request) or via authenticated POST bodies.
- **Not present in browser referrer headers.** Both iframes set `Referrer-Policy: no-referrer`. The tenant wrapper sets `referrerpolicy="no-referrer"` on the iframe element.
- **Not present in Cloudflare access logs, AWS ALB access logs, or reverse proxy logs in association with anything that could re-link.** Operational infrastructure logs may contain Case IDs as part of request bodies, but those logs are kept strictly separate from infrastructure trace IDs (see §3.4).

### 3.3 Isolated iframe architecture

This section refines the v2 iframe architecture with the explicit controls the reviewer required.

**Top-level wrapper page:**
- Hosted on tenant origin (e.g., `tenant.example.org/cases`).
- URL contains no Case ID; case selection occurs after authentication.
- Generates a short-lived capability token per case selected, signed by tenant backend, valid for ~5 minutes.

**Hope Connect iframe (`hopeconnect.app/case`):**

```http
Content-Security-Policy: 
  default-src 'self';
  script-src 'self';
  style-src 'self' 'unsafe-inline';
  connect-src 'self' https://api.hopeconnect.app;
  frame-ancestors https://*.tenant1.example.org https://*.tenant2.example.org;
  form-action 'self' https://api.hopeconnect.app;
  base-uri 'self';
  object-src 'none';

Referrer-Policy: no-referrer
Cache-Control: no-store, no-cache, must-revalidate, private
X-Content-Type-Options: nosniff
```

Sandbox attributes on the iframe element (set by the tenant wrapper):
```html
<iframe
  src="https://hopeconnect.app/case#token=..."
  sandbox="allow-scripts allow-same-origin allow-forms"
  referrerpolicy="no-referrer"
  allow="">
</iframe>
```

The wrapper does NOT include: `allow-top-navigation`, `allow-popups-to-escape-sandbox`, `allow-presentation`, or any feature policy permitting access to client device features.

**JavaScript behavior in the Hope Connect iframe:**
- No `window.addEventListener('message', ...)` general listeners.
- If cross-frame coordination is ever required, every received message has its `origin` strictly verified against the registered tenant origin list and its `data` validated against a typed schema; unmatched messages are dropped silently.
- No session replay tools (no FullStory, no LogRocket, no Hotjar).
- No third-party scripts loaded at runtime.
- No analytics tools collecting DOM content.
- Error reporting strips request URLs, query parameters, and any Case-ID-bearing data.

**Authentication in cross-site iframes:**

Safari's Intelligent Tracking Prevention and Chrome's third-party cookie restrictions can break cookie-based authentication in cross-site iframes. Two mitigations, applied in order:

1. **Per-tenant subdomain deployment.** Each tenant gets a deploy under their domain: `hopeconnect.tenant.example.org`. Clerk's cookies are then first-party within the tenant's domain hierarchy.
2. **Token-based authentication fallback.** If subdomain deployment is impractical for a tenant, the wrapper passes a short-lived auth token to the iframe via the URL fragment; the iframe uses bearer auth against Hope Connect's API without relying on cookies.

We will test both paths in Safari, Firefox, and Chrome before launch.

### 3.4 Two-class logging

A critical architectural commitment: Hope Connect operates two strictly separated log classes.

**Class 1 — Infrastructure logs:**
- Contents: precise timestamps, source IPs (which are tenant backend IPs, not client IPs, because clients never connect to Hope Connect), HTTP method and path (without Case-ID-bearing path segments), response codes, request sizes, infrastructure trace IDs.
- Storage: AWS CloudWatch + S3 archive with KMS encryption.
- Retention: 90 days.
- Access: SRE / on-call engineering only.
- **No Case IDs, no tenant-identifying paths, no request body content.**

**Class 2 — Case audit logs:**
- Contents: Case ID, tenant_id, case_manager_id, action_type, structured action payload, year only.
- Storage: Hope Connect's primary Postgres database, separate table with append-only enforcement via Postgres trigger.
- Retention: tenant-configurable (default 3 years).
- Access: tenant org admins and Hope Connect support staff with explicit per-case justification.
- **No infrastructure trace IDs, no precise timestamps, no IPs, no HTTP-layer metadata.**

**No bridge identifier may appear in both classes.** Request IDs, trace IDs, error correlation IDs are scoped to a single class. If application code needs to correlate an infrastructure event to a case for debugging, the SRE must request specific permission and the correlation is performed manually with audit log entries on both sides — never via a stored cross-class identifier.

This is enforced via:
- Application-level structured logging where every log statement specifies which class.
- Lint rules on log statements rejecting commingling.
- Periodic audit of both log stores for cross-class identifier leakage.

The honest framing: precise timestamps and source IPs DO exist in infrastructure logs (the reviewer correctly noted that we cannot pretend they don't). The architectural commitment is that those infrastructure logs cannot be joined to case records, because the bridge identifier is structurally absent.

### 3.5 Intake form: structured-only

Unchanged from v2. The published `intake_template_specification.json` permits only Likert, single-select, multi-select, and predefined-tag input types. No free text. No date input. No file upload. No number input outside Likert bounds.

### 3.6 Date handling

Unchanged from v2: year-only for all individual-related dates. The enum changes in §2.2 eliminate the previously problematic relative-time terms (`today`, `this_week`, `this_month`). All time semantics are expressed as severity (`immediate`, `urgent`) rather than calendar position.

Per-tenant per-year ordinal counters are **removed**. No global or per-tenant intake-order counter is stored. Per-case action sequence numbers (1, 2, 3 within a single case's action history) are retained because they are scoped to a single case and do not provide cross-case ordering information.

### 3.7 Geographic handling

Hope Connect's database stores no geographic subdivision below state.

**Architectural separation of operational knowledge from case data:**

Hope Connect's business systems (billing, contracts, support, tenant onboarding) necessarily know each tenant's legal name, address, and service territory for business reasons. This knowledge is real and cannot be engineered away.

What we commit to:

- This operational knowledge is **stored separately** from Hope Connect's case data plane. The tenant business record and the tenant case data record are in different schemas, accessed by different services, and not joined in any production data path.
- Hope Connect personnel with access to tenant business information are **prohibited by policy** from combining that knowledge with case data for re-identification purposes. This is enforced via access logging, training, and contractual commitments.
- The Expert Determination must explicitly evaluate this operational knowledge as a re-identification vector and confirm that, with the documented controls in place, residual risk remains "very small."

This is the most honest position: we cannot pretend Hope Connect doesn't know its tenants. We can commit that the operational knowledge does not bleed into the case data analytics path, and we submit that commitment to expert review.

---

## Part 4 — Subprocessor inventory (revised)

| Subprocessor | What it actually receives | BAA required? | Mitigations |
|---|---|---|---|
| **Cloudflare** | Server-to-server TLS traffic from tenant backends. Source IPs are tenant infrastructure. Request paths do not contain Case IDs (Case IDs only in POST bodies). Precise timestamps in access logs, but no Case ID bridge. | No, conditional on Expert Determination | Case ID never in URL path; access logs in Class 1 only |
| **AWS (ECS, RDS, S3, ALB, KMS, CloudWatch)** | Server-to-server traffic; encrypted at-rest storage of Case Data per §2.4 (no PII); Class 1 logs with precise time but no Case IDs in URLs | No, conditional | Same as Cloudflare; AWS BAA available and recommended as defense-in-depth |
| **Anthropic (analyzer LLM)** | Structured inputs only per §2.3. No Case ID. No tenant_id. No identifier of any kind. | No | Analyzer call schema enforces this; payloads audited |
| **Clerk (auth)** | Staff user emails and authentication state. No Case IDs. No client data. | No | Auth tokens scoped to per-tenant subdomain |
| **Sentry / Better Stack (observability)** | Class 1 errors only. Scoped error correlation IDs that are not Case IDs. No request bodies. No URL query parameters. No Case IDs. | No | Strict log scrubbing rules; audit |
| **Postmark (staff transactional email)** | Hope Connect staff email addresses and generic content ("you have cases to review"). No Case IDs. No client info. | No | Email templates audited; no template includes a Case ID variable |
| **GitHub (source control, CI)** | Source code only. No production data. | N/A | Standard repo hygiene |
| **AWS Backup (RDS automated)** | Encrypted backups of Hope Connect's database. Contents are de-identified Case Data per §2.4. | No, conditional | KMS encryption; same posture as primary DB |

**NOT Hope Connect subprocessors (operated by tenant):**
- Twilio for client SMS
- SendGrid / Postmark for client-directed email
- The tenant's CRM (Salesforce, Apricot, HubSpot, Airtable, Google Sheets, others)
- The tenant's identity iframe origin and backend
- The tenant's intake portal hosting
- The tenant's webhook receiver and any downstream notification infrastructure

**Currently not used in v1, deferred:**
- Customer support tooling — v1 uses Postmark for support intake; no separate support platform
- Product analytics — none in v1; no third-party analytics
- Session replay / heatmap tools — none in v1; explicitly disallowed by architecture
- Incident response platform — handled via internal ops runbook; no third-party PagerDuty-style integration in v1

---

## Part 5 — Expert Determination

Hope Connect commits to commissioning a formal Expert Determination under 45 CFR § 164.514(b)(1) **before any production data flows.**

Scope of the determination:

1. Real-time processing latency between tenant submission and Hope Connect's storage, and the implications for inferred individual-related timing.
2. Operational telemetry (Class 1 logs) and whether the strict separation from case data is sufficient.
3. Tenant identifiability through Hope Connect's necessary business knowledge (legal name, address, service territory).
4. Structured-data combination re-identification risk given the actual screening question set, enum values, and tag library.
5. Case ID handling and the operational uses enumerated in §3.2.
6. Aggregate reporting risk and the appropriate cell-size suppression threshold.
7. Iframe architecture and any residual leakage vectors.
8. The non-Business-Associate posture as a whole, conditional on the above.

The expert's written determination becomes the documentation that supports Hope Connect's legal position. If the expert identifies additional necessary controls, those are implemented before launch.

Estimated cost: $20,000–$40,000 for the engagement. Estimated duration: 4–8 weeks. This is now a launch prerequisite.

---

## Part 6 — Point-by-point response to second-round critique

### Critique item 1: Real-time processing reveals dates

**Resolution:** Two-class logging architecture (§3.4) decouples precise timestamps from any case-linkable identifier. Plus Expert Determination evaluates the residual risk that processing time approximates intake time.

### Critique item 2: Relative time enums encode dates

**Resolution:** Calendar-referencing enum values (`today`, `this_week`, `this_month`) removed and replaced with severity-only terms (`immediate`, `urgent`, `standard`, `planning`). §2.2.

### Critique item 3: Intake ordinals as unique identifying numbers

**Resolution:** Per-tenant per-year ordinal counter removed entirely. §2.4, §3.6. Per-case action sequence numbers retained because they are intra-case only and do not provide cross-case ordering.

### Critique item 4: Hope Connect knows tenant geography

**Resolution:** Acknowledged honestly in §3.7. Operational tenant knowledge is structurally separated from case data, contractually constrained from being combined with case data, and submitted to Expert Determination for evaluation.

### Critique item 5: Case ID disclosure contradictions

**Resolution:** §3.2 enumerates exhaustively what Hope Connect does and does not do with the Case ID. Specifically: Case IDs are not sent to Anthropic, not included in Sentry, not included in staff email content, not placed in URL paths. The previous categorical "no disclosure to third parties" claim is replaced with a precise enumeration of permitted and prohibited propagations.

### Critique item 6: Case IDs in URLs leak

**Resolution:** Both iframes use generic URL paths. Case IDs transported via short-lived signed capability tokens in URL fragments or via authenticated POST bodies. `Referrer-Policy: no-referrer` and `Cache-Control: no-store` on both iframes. Tenant wrapper sets `referrerpolicy="no-referrer"` on the iframe element. §3.3.

### Critique item 7: postMessage is not structurally prevented

**Resolution:** Replaced with explicit controls in §3.3: strict CSP including `frame-ancestors`, `connect-src`, `form-action`, and other directives; no general message listeners; explicit origin verification on any received messages; sandbox attributes specified explicitly; session replay and DOM-capturing telemetry disabled. Cross-site iframe authentication tested explicitly in Safari/ITP with per-tenant subdomain fallback.

### Critique item 8: Infrastructure logging claims unrealistic

**Resolution:** Honest framing in §3.4. Source IPs and precise timestamps DO exist in Class 1 (infrastructure) logs. The architectural commitment is that no bridge identifier connects Class 1 to Class 2 (case audit) logs, and the source IPs in Class 1 are tenant backend IPs (not client IPs) because clients never connect to Hope Connect directly.

### Critique item 9: Subprocessor inventory incomplete

**Resolution:** Revised inventory in Part 4 adds Postmark for staff email (with no Case IDs in content) and explicitly enumerates which subprocessors are NOT used and which are tenant-operated. Customer support, analytics, session replay, and incident response are explicitly absent from v1.

### Critique item 10: Expert Determination required before launch

**Resolution:** Committed in Part 5. ED is no longer optional or post-launch. It is a launch prerequisite, with explicit scope covering every concern the reviewer identified.

### Recommended position language

**Adopted verbatim** in Part 1. Hope Connect's posture is conditional on tenant compliance with de-identification obligations and on Hope Connect receiving no PHI through any service or support channel. Strict Safe Harbor and "out of HIPAA scope" framings have been removed throughout.

---

## Part 7 — What this architecture costs in product terms

Largely unchanged from v2, with additions reflecting the new commitments:

**Additional engineering work in v3:**

- Two-class logging implementation and lint enforcement (40–80 hours)
- Capability token system for case-iframe authentication (40–60 hours)
- Iframe CSP and sandbox configuration plus cross-browser testing (40–60 hours)
- Per-tenant subdomain deployment (60–100 hours including ops automation)
- Analyzer call refactor to remove Case ID from LLM payload (20–40 hours)
- Error-correlation-ID scoping in Sentry integration (20–30 hours)
- Subprocessor compliance audit + ongoing monitoring (40–60 hours initial, ongoing)
- Expert Determination engagement coordination and remediation if expert identifies new controls (40–80 hours of engineering response + the ED cost itself)

Aggregate additional engineering: 300–500 hours, $22,500–$37,500 in labor at $75/hr.

**Additional hard costs:**

- Expert Determination engagement: $20,000–$40,000
- Additional legal review of v3 architecture: $4,000–$8,000

Total v3 incremental cost over v2: **roughly $46,000–$85,000.** This reflects the genuine cost of the conditional-posture architecture done correctly.

---

## Part 8 — Residual risks (updated)

**R1 — Expert Determination conclusion.** If the ED expert concludes that the architecture as specified still poses greater-than-very-small re-identification risk, additional controls or accepting Business Associate status will be required. We cannot guarantee the expert's conclusion in advance. Mitigation: select the expert carefully, scope the engagement to the specific concerns, plan for remediation budget of $20–40k beyond the ED cost itself.

**R2 — Tenant non-compliance.** If a tenant transmits PHI despite the de-identification requirement, Hope Connect becomes a Business Associate by virtue of actual data flow. Mitigation: MSA-imposed de-identification obligations, technical schema validation at the API boundary, audit rights, contractual indemnification.

**R3 — Bridge identifier creep.** Over time, well-intentioned engineering changes could introduce identifiers that bridge Class 1 and Class 2 logs (e.g., a new tracing system that adds correlation IDs to both stores). Mitigation: lint rules, periodic audit, architectural review of every new observability addition.

**R4 — Cross-site iframe browser-vendor changes.** Browser vendors may further restrict cross-site iframe behavior in future updates, breaking the case manager workspace. Mitigation: per-tenant subdomain deployment as the primary path; ongoing browser-policy monitoring.

**R5 — Operational tenant knowledge bleed.** Despite the structural separation, internal Hope Connect personnel could theoretically combine business knowledge with case data. Mitigation: access logging, training, MSA commitments, periodic audit, and Expert Determination evaluation of the controls.

**R6 — Catch-all Safe Harbor condition.** § 164.514(b)(2)(ii) requires that the covered entity have no actual knowledge that the information could be used to identify an individual. Even with all named identifiers removed, residual combinations of structured data could in principle identify in small populations. Mitigation: Expert Determination, cell-size suppression on aggregates, prohibition on individual record disclosure.

---

## Part 9 — Binding architectural commitments

These are non-negotiable. Any deviation invalidates the legal posture and requires renewed expert review.

1. Hope Connect's API will not accept any field outside the schema in §2.1.
2. Hope Connect's intake template specification will not permit non-structured input types.
3. Hope Connect's database will not store any date directly related to an individual at greater than year precision.
4. Hope Connect's database will not store any per-tenant or global intake-order counter.
5. Hope Connect's database will not store any geographic subdivision smaller than state.
6. Hope Connect's database will not store any free-text field for client narrative or case manager notes.
7. Hope Connect's frontend JavaScript will not handle any tenant CRM OAuth token or any client identity.
8. Hope Connect's case manager workspace will be deployed only as the Hope-Connect-origin iframe within a tenant-hosted wrapper.
9. Hope Connect's analyzer call to the LLM provider will not include any Case ID, tenant_id, or other identifier.
10. Hope Connect will not include Case IDs in observability logs, staff email content, or URL paths.
11. Hope Connect will not establish subprocessor relationships with client-directed notification providers.
12. Hope Connect will commission Expert Determination before production data flows.
13. Hope Connect will maintain two strictly separate log classes with no bridge identifier between them.
14. Hope Connect's MSA will impose tenant de-identification obligations and the corresponding § 164.514(c) requirements.

These commitments are enforced in code (schema validation, lint rules, CSP), in operational policy (access logging, training, audit), and contractually (MSA terms).

---

## Part 10 — Specific questions for the next reviewer round

1. Does the two-class logging architecture (§3.4) adequately address the real-time-processing-reveals-dates concern?
2. Are the renamed urgency enums (§2.2) sufficient to remove calendar inference, or are additional changes needed?
3. Does removing the per-tenant per-year ordinal counter (§2.4, §3.6) adequately address the subsection (R) concern?
4. Is the structural separation of operational tenant knowledge from case data (§3.7) defensible, conditional on Expert Determination?
5. Does the Case ID propagation discipline (§3.2) — not to Anthropic, not in URLs, not in observability logs, not in email — adequately resolve the prior contradiction?
6. Are the iframe controls (§3.3) — CSP, sandbox, no general message listeners, referrer policy, per-tenant subdomain for cross-site auth — sufficient?
7. Is the subprocessor inventory (Part 4) now complete? Are there subprocessors we have not considered?
8. Is the Expert Determination scope (Part 5) appropriately broad?
9. Are the binding commitments in Part 9 adequately enforceable through code, policy, and contract?
10. Is the conditional non-Business-Associate posture (Part 1) the right framing, or does further refinement of the legal language matter?
11. Are there critique items from the second round we have not adequately addressed?
12. Are there new objections this v3 architecture introduces?

---

## Part 11 — Status and next steps

**Status:** This document represents the third round of architectural refinement against the second-opinion reviewer's feedback. It is presented for one more round of review before being treated as the basis for:

1. Attorney engagement for formal counsel review.
2. Expert Determination engagement.
3. Master Subscription Agreement drafting.
4. Privacy Policy drafting.
5. Engineering scope finalization.
6. Final proposal rewrite to the parent company.

If the reviewer validates this v3 architecture, we proceed with parallel attorney and ED engagements (4–8 weeks), and rewrite the proposal during that window.

If the reviewer identifies further objections, we iterate to v4 before proceeding.
