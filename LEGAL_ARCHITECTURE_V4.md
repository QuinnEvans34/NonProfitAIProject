# Hope Connect — Legal Architecture (pre-counsel baseline)

**Purpose:** Architectural commitments supporting a conditional non-Business-Associate posture for Hope Connect. This document is the baseline for: (a) attorney engagement, (b) Expert Determination engagement, (c) Master Subscription Agreement drafting, (d) Privacy Policy drafting, and (e) the product proposal.

**Predecessor documents superseded** (retained in repo for audit trail only): `HOPE_CONNECT_PROPOSAL.md` (v1), `LEGAL_REVIEW_RESPONSE.md`, `LEGAL_ARCHITECTURE_V2.md`, `LEGAL_ARCHITECTURE_V3.md`.

**All architectural claims in this document are stated as design commitments, conditional on:**

1. Completed Expert Determination under 45 CFR § 164.514(b)(1).
2. Counsel confirmation of the Business Associate analysis and any subprocessor BAA requirements.
3. Tenant compliance with the de-identification obligations imposed in the Master Subscription Agreement.
4. Hope Connect's continued adherence to the binding architectural commitments in Part 7.

The Expert Determination determines re-identification risk. Counsel determines Business Associate status and subprocessor BAA requirements. These are distinct legal determinations made by different qualified parties; this document does not substitute for either.

---

## Part 1 — The legal position

Hope Connect is designed to minimize PHI exposure and to receive only information de-identified by the tenant. Covered-entity tenants must document de-identification through Safe Harbor (45 CFR § 164.514(b)(2)), including § 164.514(c), or through Expert Determination (45 CFR § 164.514(b)(1)) before transmitting records to Hope Connect.

Hope Connect's non-Business-Associate position is **conditional** on the controls in this document and on Hope Connect receiving no PHI through any service, operational, or support channel. The position requires:

1. The tenant performing de-identification before transmission.
2. Hope Connect receiving no PHI through any service, support, or operational channel.
3. Hope Connect's data plane operating exactly as specified in this document.
4. A completed Expert Determination by a qualified expert evaluating the actual data flows, tenant context, operational telemetry, capability tokens, and controls under § 164.514(b)(1).
5. Counsel review confirming the architectural conclusions and any subprocessor BAA requirements.
6. Ongoing compliance with the operational commitments in Part 7.

If a tenant transmits PHI in violation of its MSA obligations, Hope Connect **may become or be treated as a Business Associate** depending on the resulting data flow, irrespective of contractual intent. Hope Connect's posture is therefore not absolute and must be re-evaluated whenever the architecture, support channels, integrations, or subprocessor relationships change.

The operational uses Hope Connect makes of the tenant-generated Case Identifier (per § 3.2) are stated as the intended design and remain expressly **subject to counsel confirmation**.

### 1.1 Scope limitation

This architecture addresses HIPAA de-identification and Business Associate analysis only. It does not determine compliance with the FTC Act, the FTC Health Breach Notification Rule, 42 CFR Part 2, state consumer-health and privacy laws, state breach-notification laws, laws governing automated decisions or discrimination, crisis-response obligations, minors' privacy, accessibility requirements, or contractual restrictions on data use and sale. Each of these regimes requires its own separate analysis. The non-HIPAA legal posture of Hope Connect across these regimes is not a subject of this document and must be evaluated by counsel and applicable subject-matter experts on its own terms.

### 1.2 Incident-response exception

The conditional non-Business-Associate posture stated above is conditioned on Hope Connect receiving no PHI through any service, support, or operational channel. Security-incident response is the only contemplated exception, and it is gated.

**No PHI may be disclosed to Hope Connect, to any incident-response provider, or to any other professional service provider, until counsel has activated the appropriate Business Associate Agreement, subcontractor arrangement, or other authorized process.** A Business Associate Agreement must be in place **before** intended PHI disclosure, not added afterward. Any disclosure of PHI during incident response — whether to Hope Connect personnel, to counsel, to a forensic firm, to a security assessor, or to any other provider — triggers reassessment of Hope Connect's status for the affected tenant and may convert Hope Connect or the receiving provider into a Business Associate or subcontractor for that incident and any follow-on activities.

The incident-response exception is therefore not a residual leakage point in the architecture; it is a counsel-controlled process that suspends and reassesses the non-BA posture rather than violating it.

---

## Part 2 — Inventory of case-related data and authentication artifacts received by the Hope Connect data plane

This Part inventories every category of information Hope Connect's systems receive. Sections §2.1 through §2.6 enumerate **case data and the artifacts that authorize access to it.** Sections §2.7 through §2.11 enumerate the **authentication, administrative, infrastructure, business, and support artifacts** that Hope Connect also receives. The Expert Determination evaluates risk across the full surface; the prior framing of an "exhaustive list of received data" was incomplete because it omitted the latter categories.

Any field, header, body, or artifact not listed in this Part is rejected at the API boundary by schema validation, or — where it cannot be rejected (e.g., Cloudflare and ALB necessarily receiving source IP and request timing) — is explicitly enumerated in §2.9.

### 2.1 Per intake submission (request body)

| Field | Type | Source | Notes |
|---|---|---|---|
| `case_id` | Opaque string (16 bytes CSPRNG, base64url) | Tenant backend | Under § 164.514(c). Tenant retains the re-identification mapping. |
| `tenant_id` | Hope Connect-assigned UUID | Hope Connect-managed | Does not encode geography. |
| `submission_year` | Integer (year only) | Tenant backend | No month, day, hour, or finer. |
| `intake_template_id` | UUID | Hope Connect-managed | References the published template version. |
| `screening_responses` | Array of `{ question_id, likert_value }` | Tenant backend | Likert values 1–5 only. |
| `categorical_responses` | Object `{ field_id: enum_value }` | Tenant backend | All values from published enum lists. |
| `tag_selections` | Array of strings from published tag library | Tenant backend | No free-form tags. |
| `submission_signature` | Cryptographic signature bytes | Tenant backend | **Received, validated, and immediately discarded.** Not logged. Not persisted. Not echoed in error responses. |

### 2.2 Categorical enum vocabulary (selected examples)

No enum value encodes a calendar reference. All time-window enums are severity-only:

| Field | Values |
|---|---|
| `need_category` | `housing`, `food`, `healthcare`, `employment`, `legal`, `utilities`, `other` |
| `urgency_classification` | `immediate`, `urgent`, `standard`, `planning` |
| `language_preference` | ISO 639-1 codes (e.g., `en`, `es`) |
| `housing_status` | `stable`, `at_risk`, `unstable`, `unhoused` |
| `employment_status` | `employed_stable`, `employed_unstable`, `unemployed_seeking`, `unemployed_not_seeking`, `unable_to_work` |

The full enum library is maintained in `intake_template_specification.json`. No enum value contains a calendar reference, a date, or a quantity that could imply a date.

### 2.3 Analyzer output (constrained generation)

| Field | Type |
|---|---|
| `severity_level` | Enum: `low`, `medium`, `high`, `crisis` |
| `severity_score` | Integer 0–100 (deterministically computed) |
| `risk_flags` | Object of `{ flag_name: boolean }` |
| `primary_need_category` | Enum |
| `secondary_need_categories` | Array of enums |
| `urgency_classification` | Enum (per §2.2) |
| `recommended_program_categories` | Array of enums |
| `recommended_followup_question_ids` | Array of IDs from published library |
| `comment_codes` | Array of strings from published comment library |

No free-text output is permitted. JSON schema with enum constraints is enforced at the LLM provider call.

### 2.4 Case Data persisted in Hope Connect's database

| Field | Notes |
|---|---|
| `case_id` | Per § 164.514(c). Operational uses subject to counsel confirmation. |
| `tenant_id` | Opaque UUID. |
| `submission_year` | Integer year only. |
| `screening_responses` | Structured. |
| `categorical_responses` | Structured. |
| `tag_selections` | From predefined library. |
| `analyzer_output` | Structured per §2.3. |
| `current_status` | Enum value. |
| `status_history` | Ordered list of `{ status_enum, status_year }`. **No ordinal counter.** |
| `analyzer_version` | Prompt/model version reference. |

### 2.5 Per case manager workflow action

| Field | Notes |
|---|---|
| `case_id` | Per § 164.514(c). |
| `case_manager_id` | Tenant staff UUID. Case manager email is held by Clerk; not transmitted per-action. |
| `action_type` | Enum. |
| `action_payload` | Structured per action type. No free text. |
| `action_year` | Year only. |

### 2.6 Capability tokens and case sessions

Capability tokens are short-lived signed JWTs (or equivalent) issued by tenant wrappers to authorize **the initial exchange** that establishes a short-lived case-scoped Hope Connect session. They are not used directly to authorize ongoing iframe requests, because single-use tokens cannot cover the multiple requests needed to load a case, change status, and request reanalysis within one work session.

**Exchange flow:**

1. The tenant wrapper page generates a single-use capability token per case selection and passes it to the Hope Connect iframe (URL fragment or POST body).
2. The Hope Connect iframe presents the capability token to the Hope Connect API in a single exchange request.
3. Hope Connect validates the token (signature, audience, expiration), enforces single-use via the `jti`-hash replay marker per §2.6.1, and — on success — issues a short-lived **case session** identifier scoped to the case manager, the Case ID, and the tenant.
4. All subsequent iframe requests during that work session authenticate with the case session identifier, not the original capability token.
5. The capability token body is discarded after the exchange; only its `jti_hash` replay marker survives until the token's `exp`.

This separates the **one-time authorization to access a case** from the **ongoing authentication to perform work on that case** — the first being the capability token (single-use, cryptographic, exposed to the wrapper), the second being the case session (multi-use within its lifetime, server-side, never exposed to the wrapper).

Capability tokens and case sessions are both part of Hope Connect's received and generated data surface and are inventoried in this Part. Both are within the Expert Determination scope.

**Token contents:**
- `case_id` (the Case ID being authorized)
- `tenant_id` (issuing tenant)
- `aud` (audience: Hope Connect API)
- `exp` (expiration timestamp; required for validation)
- `jti` (random unique token identifier, used for replay detection — see §2.6.1 below)
- Signature bytes

The `iat` (issued-at) claim is omitted unless cryptographically required by the chosen token format; if required, it is treated equivalently to `exp` for non-retention and non-logging purposes.

**Hope Connect's handling of capability tokens (binding):**

| Constraint | Specification |
|---|---|
| Maximum life | 5 minutes |
| Single-use | Enforced via `jti` replay marker per §2.6.1 |
| Logging | Token bodies and `jti` values never appear in access logs, error logs, or traces |
| Persistence | Token bodies validated and immediately discarded. The `jti` hash is the only artifact retained, scoped per §2.6.1. |
| Claims | Minimal — only fields required for validation |
| Precise timestamps | `exp` is required and used for validation only; never persisted after the token expires |
| ED scope | Capability token handling and the replay-marker store are included in the Expert Determination scope (Part 5) |

The capability token is itself a unique code derived in part from the Case ID. Its handling is part of the de-identification architecture and is evaluated under § 164.514(c) and the Expert Determination, not assumed to be incidental.

### 2.6.1 Capability token replay-marker store (ephemeral)

Single-use enforcement requires Hope Connect to remember that a token has been used. The token body itself is never persisted; only the non-case-linked replay marker described below is stored ephemerally.

**Replay-marker storage:**

| Field | Notes |
|---|---|
| `jti_hash` | SHA-256 of the token's `jti` claim. Not the token body. Not the Case ID. |
| `used` | Boolean flag set on first validation. |
| `expires_at` | Time after which the marker is purged (≤ token expiration plus a small grace window). |

The replay-marker store has the following properties:

- **No Case ID is stored alongside the marker.** The marker stores only `jti_hash`, `used`, and `expires_at`. There is no path from the marker back to a case.
- **Ephemeral.** Markers are purged at or shortly after `exp`. They never persist longer than the token's lifetime.
- **Storage location:** AWS ElastiCache Redis (added to the AWS subprocessor inventory in Part 4) or equivalent ephemeral key-value store.
- **No logging.** Marker reads and writes are not captured in Class 1 or Class 2 logs.
- **ED scope.** The Expert Determination evaluates whether this ephemeral marker constitutes a re-identification risk; we believe it does not (it is unhashed-to-Case-ID and ephemeral), but expert confirmation is required.

If the Expert Determination identifies any risk in this store, the alternative is to remove the single-use claim entirely and rely on the five-minute expiry alone. Single-use is preferred as a defense-in-depth measure against token theft, but the architecture supports the fallback without redesign.

### 2.6.2 Case session (issued by Hope Connect after exchange)

The case session is the artifact issued by Hope Connect's API after a successful capability-token exchange. It is what every subsequent iframe request authenticates against.

**Case session contents and storage:**

| Field | Notes |
|---|---|
| `session_id` | Opaque, randomly generated server-side identifier. Not derived from the Case ID; not equal to any token's `jti`. |
| `case_id` | The Case ID this session authorizes access to. |
| `tenant_id` | The issuing tenant. |
| `case_manager_id` | The Clerk staff user the session is bound to. |
| `expires_at` | Maximum session lifetime, conventionally 30 minutes from issuance with rolling extension on activity up to a hard cap of 2 hours. |

**Hope Connect's handling of case sessions:**

- Stored server-side in the Hope Connect API's session store (AWS ElastiCache Redis, alongside but logically distinct from the capability-token replay markers in §2.6.1).
- Bound to the specific case manager who completed the exchange; cannot be replayed by another user.
- Bound to the specific Case ID; cannot be used to access any other case.
- The session_id is presented by the iframe via the standard authenticated request mechanism for the rest of the work session. The session_id is not logged in Class 1 infrastructure logs and is not present in observability traces.
- On case manager logout, tab close, or expiration, the session is invalidated server-side.
- Sessions are not persistent across case manager work sessions; opening the same case the next day requires a fresh capability-token exchange from the tenant wrapper.

The case session is the only artifact within Hope Connect that holds a live mapping from a server-side identifier to a Case ID. It is included in the Expert Determination scope as a re-identification vector and as part of the §164.514(c) analysis of Case ID operational uses.

### 2.7 Authentication and authorization artifacts

Beyond capability tokens, Hope Connect receives the following authentication-related data:

| Artifact | Source | Storage / handling |
|---|---|---|
| Staff user email addresses | Clerk during user registration | Held by Clerk; referenced by Hope Connect via Clerk user ID |
| Staff authentication tokens / session cookies | Clerk via standard OIDC flow | Validated by Hope Connect API; not persisted as session content |
| HTTP authentication credentials on the tenant→Hope Connect server-to-server channel | Tenant backend signing key + per-tenant API credentials | Per-tenant API credentials stored by Hope Connect (encrypted at rest via KMS); used to authenticate tenant backends only |
| Tenant signing-key public key (for verifying tenant-backend submission signatures) | Provided during tenant onboarding | Stored in tenant configuration; rotated per policy |
| Webhook authentication secrets | Generated jointly during tenant onboarding | Encrypted at rest; used to authenticate Hope Connect webhook deliveries to tenant URLs |

These artifacts are not PHI. They are operational credentials. They are inventoried here for completeness and are within the Expert Determination scope to confirm they cannot bridge Class 1 and Class 2 logs.

### 2.8 Tenant administration data

Hope Connect's tenant administration plane receives the following:

| Artifact | Notes |
|---|---|
| Tenant legal name | Stored in tenant business records; structurally separated from case data per §3.7 |
| Tenant primary contact information (name, email, phone of admin) | Same as above |
| Tenant configuration (theme, branding, identity service URL, webhook URL, intake template selection, enabled features) | Stored in tenant configuration table |
| Tenant signing-key public keys and credential identifiers | Per §2.7 |
| Tenant subdomain assignment and CSP origin enumeration | Stored in tenant deployment records |

This category is referenced in §3.7 as Hope Connect's "necessary operational knowledge" of tenants. It is separated from case data and subject to ED review.

### 2.9 Infrastructure metadata

This category honestly enumerates what Hope Connect's infrastructure components necessarily receive even though they are not application-layer fields:

| Component | What it receives |
|---|---|
| Cloudflare (DNS, WAF, DDoS, CDN) | TLS handshake metadata, source IP (tenant backend IPs), request timing, request method and path (without Case IDs in paths), response codes, byte counts |
| AWS ALB | Same as above, plus its own request/response metadata |
| AWS WAF | Same as ALB, plus sampled requests configured to exclude request bodies and authorization headers |
| Application infrastructure logs (CloudWatch) | Class 1 log entries per §3.4 |

Per §3.4, this infrastructure metadata is stored in Class 1 logs only and contains no Case IDs, no request bodies, no authorization headers, no capability tokens. The two-class logging discipline applies. Residual probabilistic linkage between this infrastructure metadata and case data via tenant identity, traffic volume, and timing is evaluated by the Expert Determination.

### 2.10 Business and billing data

Hope Connect receives:

| Artifact | Notes |
|---|---|
| Tenant subscription tier, billing contact, payment information (via Stripe at parent-company level) | Tenant-level business data; not associated with cases |
| Contract documents, MSA, signed addenda | Stored in document management; not in case data plane |
| Usage metrics for billing purposes | See note below on granularity. |

**Usage metric granularity.** Monthly intake counts per tenant carry a re-identification risk for small tenants: a tenant with a monthly count of one effectively discloses that a specific intake occurred in that month. To mitigate, Hope Connect applies the following defaults:

- **Quarterly billing periods, not monthly**, for tenants where monthly volume would fall below a defined threshold.
- **Minimum-count suppression** in any billing-derived report: counts below the threshold are reported as "<threshold" rather than as exact small numbers.
- **Larger tenants** may use monthly counts where volume is sustained well above the suppression threshold.

The exact threshold and the suppression policy are subjects of the Expert Determination scope (Part 5). Until the ED determines the appropriate threshold, the default operating posture is quarterly billing with a placeholder threshold of 11.

Business data is structurally separated from the case data plane per §3.7. No business record references a Case ID.

### 2.11 Support and incident response data

Per §3.8 (revised in this v4 update), inbound support intake is structured-only with no narrative or attachment fields. Hope Connect receives:

| Artifact | Notes |
|---|---|
| Support ticket category (from enum: login, billing, feature request, etc.) | Structured field |
| Tenant staff user identifier raising the ticket | Clerk user ID |
| Callback request indicator (boolean) | If tenant staff wants a callback to discuss; no narrative captured |
| Synthetic record ID (when a technical issue requires reproduction) | Tenant generates a synthetic case-shaped record for debugging; never a real Case ID |
| Security incident report (separate channel, counsel-reviewed) | Counsel-designed process per §3.8; may involve PHI exposure to legal/forensic professional service providers per Part 4 |

No free-text narrative is captured through routine support channels. Security incident handling is intentionally separate and may necessarily expose PHI to professional service providers under appropriate confidentiality and BAA terms.

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
   ├─ Constructs de-identified payload per §2.1
   ├─ Signs the payload with a tenant-backend-only signing key
   ├─ POSTs to Hope Connect API over server-to-server TLS

3. HOPE CONNECT API (AWS behind Cloudflare)
   ├─ Accepts traffic from authenticated tenant backends only
   ├─ Validates signature; signature bytes are DISCARDED (not logged, not persisted)
   ├─ Validates schema; rejects any unexpected field
   ├─ Persists record per §2.4 (year only, no Case ID in URL paths)
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
   ├─ Hope Connect associates the analyzer output with the case_id on its own side
   ├─ Webhook to tenant: { case_id, event_type, analyzer_output }; tenant decides downstream

5. CASE MANAGER WORKSPACE (isolated iframes in tenant-hosted wrapper)
   ├─ Case manager opens tenant.example.org/cases (tenant page, no case_id in URL)
   ├─ Tenant page authenticates case manager against tenant's identity system
   ├─ Tenant page generates a capability token per selected case (see §2.6)
   ├─ Wrapper page renders TWO iframes:
   │
   │   IFRAME A: tenant-identity.example.org/identity
   │     • Tenant origin
   │     • Tenant auth
   │     • Displays identity, contact history, narrative notes
   │     • Communicates ONLY with tenant CRM
   │
   │   IFRAME B: hopeconnect.app/case (generic route, no case_id in path)
   │     • Hope Connect origin
   │     • Receives capability token via URL fragment or POST body
   │     • Clerk authentication via per-tenant subdomain
   │     • Displays severity, screening, analyzer output, structured workflow controls
   │     • CSP: frame-ancestors limited to EXACT registered wrapper origins (not wildcards)
   │     • CSP: connect-src limited to api.hopeconnect.app
   │     • No general message listeners; postMessage support requires architecture review
   │     • Referrer-Policy: no-referrer, Cache-Control: no-store
   │     • No session replay, no DOM-capturing telemetry
   │
   ├─ The wrapper page does not exchange data between iframes
   ├─ Each iframe communicates only with its own backend
   └─ Status updates: IFRAME B → Hope Connect API; Narrative: IFRAME A → tenant CRM

6. NOTIFICATIONS (entirely tenant-operated)
   ├─ Hope Connect publishes webhook events to tenant URLs
   │   Payload: { case_id, event_type, structured_payload }
   ├─ Tenant backend receives, joins to tenant CRM identity
   ├─ Tenant infrastructure issues all client-directed notifications
   └─ Twilio, SendGrid, and similar are NOT Hope Connect subprocessors
```

### 3.2 The Case Identifier under § 164.514(c)

**Tenant responsibilities:**
- Generates Case ID via CSPRNG.
- Maintains the re-identification mapping in tenant's CRM only.
- Discloses Case ID to Hope Connect alongside the de-identified record.
- Does not disclose Case ID to third parties.
- Does not disclose the re-identification mechanism to anyone outside the tenant.

**Hope Connect's permitted uses of Case ID (the only permitted uses, subject to counsel confirmation):**

1. Primary key for internal database retrieval.
2. Workflow lookup in the case manager iframe.
3. Aggregate analytics with cell-size suppression (Case IDs not disclosed in aggregates).
4. Webhook event references back to the originating tenant.

**Hope Connect's prohibited propagations of Case ID:**

- **Not sent to Anthropic or any LLM provider.** Analyzer payloads carry only structured inputs. The Case ID is associated with analyzer output only in Hope Connect's database after the LLM call returns.
- **Not sent to Sentry, Datadog, Better Stack, or any observability vendor.** Error reports use scoped, non-case-specific error correlation strings; **no mapping from those correlation strings to Case IDs is persisted anywhere.** If a case-specific error requires investigation, the response is non-case-specific error reporting and (where unavoidable) a documented break-glass process subject to incident review and renewed legal analysis (see §3.4).
- **Not included in staff email content.** Emails to case managers reference the dashboard generically. The dashboard determines what to display from the authenticated user's permissions.
- **Not placed in URL paths or query parameters.** Case IDs are transported via short-lived capability tokens in URL fragments (which do not transmit over the wire after initial request) or via authenticated POST bodies. Both iframes use generic URL paths.
- **Not present in browser referrer headers.** Both iframes set `Referrer-Policy: no-referrer`. The tenant wrapper sets `referrerpolicy="no-referrer"` on the iframe element.
- **Not present in Cloudflare access logs, AWS ALB access logs, AWS WAF sampled requests, Cloudflare security events, reverse proxy logs, or failed-request diagnostics.** Infrastructure, WAF, proxy, and access logging are configured **never** to capture request bodies, authorization headers, capability tokens, or Case IDs (see §3.4).

**The operational use of the Case ID under § 164.514(c) remains expressly subject to counsel confirmation.** This document specifies the intended design; the legal sufficiency of that design under § 164.514(c) requires attorney determination.

### 3.3 Isolated iframe architecture

**Top-level wrapper page:**
- Hosted on tenant origin (e.g., `tenant.example.org/cases`).
- URL contains no Case ID; case selection occurs after authentication.
- Generates a single-use capability token per case selected per §2.6.
- The capability token is consumed once in the iframe's initial exchange with the Hope Connect API; the resulting case session per §2.6.2 covers all subsequent requests within the work session.

**Hope Connect iframe (`hopeconnect.app/case`):**

```http
Content-Security-Policy: 
  default-src 'self';
  script-src 'self';
  style-src 'self' 'unsafe-inline';
  connect-src 'self' https://api.hopeconnect.app;
  frame-ancestors https://cases.tenant1.example.org https://cases.tenant2.example.org;
  form-action 'self' https://api.hopeconnect.app;
  base-uri 'self';
  object-src 'none';

Referrer-Policy: no-referrer
Cache-Control: no-store, no-cache, must-revalidate, private
X-Content-Type-Options: nosniff
```

**Critical: `frame-ancestors` uses exact registered wrapper origins per deployment.** No wildcards. Each tenant's wrapper origin is explicitly enumerated. Any new tenant deployment requires CSP update and re-deployment. A wildcard would permit any compromised or abandoned tenant subdomain to frame the application.

Sandbox attributes on the iframe element (set by the tenant wrapper):
```html
<iframe
  src="https://hopeconnect.app/case#token=..."
  sandbox="allow-scripts allow-same-origin allow-forms"
  referrerpolicy="no-referrer"
  allow="">
</iframe>
```

**JavaScript behavior in the Hope Connect iframe:**
- **No general-purpose message listener.** No `window.addEventListener('message', ...)` in v1. Any future cross-frame coordination via postMessage is a material change requiring renewed architecture review and a re-evaluation of the Expert Determination. Origin verification alone is insufficient because the legitimate tenant wrapper possesses identity information; introducing postMessage could create a new identity-disclosure pathway.
- No session replay tools (no FullStory, LogRocket, Hotjar, equivalent).
- No third-party scripts loaded at runtime.
- No analytics tools that capture DOM content.
- Error reporting strips request URLs, query parameters, and any Case-ID-bearing data.

**Authentication in cross-site iframes:**

Per-tenant subdomain deployment is the primary path: each tenant gets `hopeconnect.<tenant>.example.org`. Clerk cookies are then first-party within the tenant's domain hierarchy, surviving Safari ITP and Chrome third-party-cookie restrictions.

Token-based authentication is the fallback where subdomain deployment is impractical. Cross-browser testing (Safari, Firefox, Chrome) is part of pre-launch validation.

**Cookie isolation requirements (critical):**

The per-tenant subdomain deployment introduces a real risk that tenant cookies could leak to Hope Connect. If the tenant sets a cookie with `Domain=.tenant.example.org`, browsers will send that cookie to `hopeconnect.tenant.example.org`. This could expose tenant authentication or identity-session cookies to Hope Connect, undermining the entire identity-separation premise.

The mitigation is binding on both Hope Connect's deployment and the tenant's wrapper / identity service configuration:

- **Tenant wrapper and identity service cookies must be host-only.** No `Domain` attribute. The cookie is scoped to the specific host that set it (e.g., `cases.tenant.example.org`) and is never sent to sibling subdomains, including the Hope Connect subdomain.
- **All cookies on tenant origins set `Secure`, `HttpOnly`, and appropriate `SameSite`** (typically `Lax` or `Strict`, never `None` unless explicitly justified).
- **Preferred:** the `__Host-` cookie prefix, which the browser enforces as host-only-and-secure-and-no-domain-attribute. This is the strongest enforcement available at the browser level.
- **Pre-launch automated testing.** Hope Connect operates a launch checklist that includes automated testing for broad-domain cookies on the tenant wrapper and identity service. Any cookie set with a `Domain` attribute or without the `__Host-` prefix fails the check.
- **Contractual obligation in the MSA.** Tenants are contractually required not to issue domain-wide identity cookies on any subdomain hierarchy that includes the Hope Connect subdomain. Violation is grounds for de-listing the tenant from the per-tenant subdomain deployment path and falling back to token-based authentication.

This requirement is part of the Expert Determination scope (Part 5) and the binding commitments (Part 7). If a tenant's cookie practices cannot be brought into compliance, the per-tenant subdomain deployment is replaced by the token-based authentication fallback for that tenant; the architecture supports the fallback without redesign.

### 3.4 Two-class logging

Hope Connect operates two strictly separated log classes.

**Class 1 — Infrastructure logs:**
- Contents: precise timestamps, source IPs (which are tenant backend IPs — clients never connect to Hope Connect), HTTP method, response codes, request sizes, infrastructure trace IDs.
- Storage: AWS CloudWatch + S3 archive with KMS encryption.
- Retention: 90 days.
- Access: SRE / on-call engineering only.
- **No Case IDs. No tenant-identifying URL paths. No request body content. No authorization headers. No capability tokens.** This applies to application logs, Cloudflare access logs, Cloudflare security events, AWS ALB access logs, AWS WAF logs (including sampled requests), reverse proxy logs, and failed-request diagnostics.

**Class 2 — Case audit logs:**
- Contents: Case ID, tenant_id, case_manager_id, action_type, structured action payload, year only.
- Storage: Hope Connect's primary Postgres database, separate table with append-only enforcement.
- Retention: tenant-configurable (default 3 years).
- Access: tenant org admins; Hope Connect support personnel only with explicit per-case justification subject to documented review.

**No bridge identifier connects the two classes.** Request IDs, trace IDs, error correlation IDs are scoped to a single class. **No mapping from a Class 1 identifier to a Class 2 identifier is persisted anywhere.**

**Case and infrastructure logs are never correlated in production.** If a production incident requires correlation, it is treated as a security/privacy incident: a documented break-glass process, reviewed and approved by counsel and the Expert Determination's documenting expert if relevant, with after-action review. This is not a routine debugging mechanism.

**The two classes contain no deterministic case-level bridge. Residual linkage through tenant identity, traffic volume, request timing, and request characteristics is evaluated by the Expert Determination** (Part 5). Hope Connect does not claim that case and infrastructure events are completely unlinkable in the abstract; we claim that no deterministic case-level bridge exists and that residual probabilistic linkage is within the bounds the Expert Determination accepts.

This is enforced through:
- Application-level structured logging that labels each log statement by class.
- Lint rules rejecting log statements that include both class-1 and class-2 identifiers.
- Periodic audit of both log stores for cross-class identifier leakage.
- Configuration of all infrastructure logging components (Cloudflare, ALB, WAF, application) to drop request bodies, authorization headers, capability tokens, and Case IDs at the logging layer.

### 3.5 Intake form: structured-only

The published `intake_template_specification.json` permits only Likert, single-select, multi-select, and predefined-tag input types. No free text. No date input. No file upload. No number input outside Likert bounds.

### 3.6 Date handling

Year-only for all individual-related dates. The enum vocabulary in §2.2 eliminates calendar-referencing terms. Per-tenant per-year ordinal counters are absent. Per-case action sequence numbers are retained because they are intra-case-only.

Capability token `exp` fields use precise timestamps because they are validation-only and non-retained; `iat` is omitted unless cryptographically required. These do not constitute persistent individual-related dates because tokens are discarded after validation per §2.6.

### 3.7 Geographic handling

Hope Connect's database stores no geographic subdivision below state. **Hope Connect's business systems (billing, contracts, support, tenant onboarding) necessarily know each tenant's legal name, address, and service territory.** This operational knowledge is:

1. **Structurally separated** from the case data plane. Tenant business records and tenant case data records are in different schemas, accessed by different services, and not joined in any production data path.
2. **Procedurally constrained** by policy: Hope Connect personnel with access to tenant business information are prohibited from combining that knowledge with case data for re-identification purposes. Enforced via access logging, training, and contractual commitments.
3. **Evaluated by the Expert Determination** as a re-identification vector requiring documentation of the residual risk under the stated controls.

We do not claim Hope Connect lacks knowledge of tenant geography. We claim that this knowledge does not enter Hope Connect's case data analytics path, and we submit that claim to expert evaluation.

### 3.8 Support and operational communications

**Outbound staff email (Postmark or equivalent):** Generic transactional emails to Hope Connect staff users referencing the dashboard, never specific cases by Case ID. Email templates audited for absence of Case ID variables.

**Inbound support intake (v1):** Inbound support is **not via free-text email.** Hope Connect operates a structured support form on Hope Connect's own platform. For v1, every category of support intake is structured-only with no free-text narrative permitted in any category. The constraints are uniform across login problems, billing questions, feature requests, technical issues, and any other routine support category:

- **No free-text fields of any kind** for any support category in v1. Every input is structured (enum, dropdown, checkbox, structured numeric).
- **No attachments.** Image uploads, screenshots, log files, and document attachments are not accepted through the support form.
- **Callback request without narrative.** Where a tenant staff member needs to discuss a topic that does not fit the structured categories, the form permits a callback request indicator — but no narrative explanation is captured at submission. The conversation occurs outside Hope Connect's data plane.
- **Synthetic records for technical investigation.** When a technical issue requires reproduction or debugging, the tenant provides a synthetic case-shaped record (no real client data) that exhibits the issue. The synthetic record is the artifact Hope Connect engineers work with, not any real case.
- **Clear prohibition on submitting client information.** Displayed at every form submission point. Tenant staff are trained on this in onboarding.

Any text box, regardless of label, can be misused to paste client details. The v1 commitment is no free text in any routine support intake.

**Security incident response (separate, counsel-designed):** Genuine security concerns — potential data leakage, suspected intrusion, breach indicators — are handled through a distinct process designed by counsel. This process is intentionally not structured-only because security investigations may necessarily expose PHI to legal counsel, forensic firms, security assessors, or specialized consultants in order to understand and remediate the incident.

When PHI is exposed during incident response:

- The exposure is documented and minimized.
- The professional service provider receiving PHI may itself become a Business Associate or subcontractor under HIPAA — HHS recognizes lawyers as Business Associates when legal services involve PHI.
- Appropriate Business Associate Agreements or subcontractor arrangements are executed with each such provider on a per-incident or standing basis as counsel directs.
- The incident response process is reviewed and approved by counsel before any PHI exposure occurs.

The security incident channel is therefore **outside** the routine support architecture and outside the no-PHI-receipt posture. Its handling is the province of counsel, not of architectural commitments.

Postmark (or equivalent) is **outbound only.** Inbound free-text email is not used as a support channel.

---

## Part 4 — Subprocessor inventory (revised, provisional)

All subprocessor BAA conclusions are **pending Expert Determination and counsel confirmation; BAA executed where required.** HHS guidance on software-vendor BA status turns on actual access to PHI, not on the architectural label assigned by the parties. The conclusions below reflect the architectural intent but require attorney determination before being treated as final.

| Subprocessor | What it actually receives | BAA requirement | Mitigations |
|---|---|---|---|
| **Cloudflare** | Server-to-server TLS traffic from tenant backends. Source IPs are tenant infrastructure. Request paths do not contain Case IDs. Precise timestamps in access logs, but no case-level bridge identifier. | Pending ED + counsel | Case ID never in URL path; access logs Class 1 only; logging configured to exclude request bodies, auth headers, capability tokens |
| **AWS (ECS, RDS, S3, ALB, KMS, CloudWatch, ElastiCache)** | Server-to-server traffic; encrypted at-rest storage of Case Data per §2.4; Class 1 logs with precise time but no Case IDs in URLs; ElastiCache holds the ephemeral capability-token replay-marker store per §2.6.1 (jti_hash only, no Case ID, purged at expiration) | Pending ED + counsel; AWS BAA available regardless and recommended as defense-in-depth | Same as Cloudflare; ALB access log fields configured to omit sensitive content; ElastiCache logging configured to exclude key contents |
| **Anthropic (analyzer LLM)** | Structured inputs only per §2.3. No Case ID. No tenant_id. No identifier of any kind. | Pending ED + counsel | Analyzer call schema enforces input restriction; payloads audited |
| **Clerk (auth)** | Staff user emails and authentication state. No Case IDs. No client data. Per-tenant subdomain isolation. | Pending ED + counsel | Auth tokens scoped to per-tenant subdomain |
| **Sentry / Better Stack (observability)** | Class 1 errors only. Non-case-specific error correlation strings. No request bodies. No URL query parameters. No Case IDs. No capability tokens. | Pending ED + counsel | Strict log scrubbing rules; periodic audit |
| **Postmark (staff outbound email)** | Hope Connect staff email addresses and generic content ("you have cases to review"). No Case IDs. No client identifiers. | Pending ED + counsel | Email templates audited; no template includes a Case ID variable; outbound-only — no inbound support email |
| **GitHub (source control, CI)** | Source code only. No production data. | N/A | Standard repo hygiene |
| **AWS Backup (RDS automated)** | Encrypted backups of Hope Connect's database. Contents are de-identified Case Data per §2.4. | Pending ED + counsel | KMS encryption; same posture as primary DB |

### 4.1 Professional service providers (conditional, pending counsel)

The following professional service providers may receive Hope Connect datasets, logs, or incident information in the course of legal, audit, or investigation work. Each is treated as a conditional provider whose handling is specified per engagement.

| Provider category | What they may receive | Default posture | If PHI access becomes necessary |
|---|---|---|---|
| Expert Determination firm (Privacy Analytics / IQVIA, Datavant, NORC, or equivalent) | Synthetic or de-identified datasets and architectural documentation for the ED analysis | Synthetic / de-identified by default; no production identity mapping; performs analysis in a controlled environment | Tenant-specific arrangement may require additional terms; documented per engagement |
| Legal counsel | Architecture, contracts, MSA drafts, incident summaries | Synthetic or de-identified information by default | If counsel must review PHI during incident response, counsel may itself become a Business Associate; HHS expressly recognizes lawyers as Business Associates when legal services involve PHI; BAA executed |
| Security assessor (pre-launch and ongoing security review) | Architectural documentation, code, synthetic test data | Minimum-necessary access; no production identity mapping; synthetic data for testing | BAA or subcontractor terms executed if access to PHI becomes necessary |
| Forensic firm (security incident response) | Incident artifacts, logs, potentially affected records | Minimum-necessary access; specific incident scope | BAA or subcontractor terms executed before PHI exposure |

**Standing requirements for all professional service providers:**

- Engagement letter or contract documenting confidentiality, data handling, and minimum-necessary access.
- Synthetic or de-identified information by default. Production identity mappings are not disclosed.
- No standing access to production data; access is per-engagement and time-bounded.
- BAA or subcontractor terms if any PHI access becomes necessary during the engagement.
- All engagements reviewed and approved by counsel.

The Expert Determination engagement specifically: the expert performs analysis in a controlled environment using architectural documentation, schema specifications, and synthetic or aggregated datasets. The expert does not receive any tenant's identity mapping unless a specific tenant arrangement (e.g., tenant-specific addenda per Part 5) requires otherwise, and only under appropriate confidentiality and BAA terms.

**NOT Hope Connect subprocessors (operated by tenant):**

- Twilio for client SMS
- SendGrid / Postmark for client-directed email
- The tenant's CRM (Salesforce, Apricot, HubSpot, Airtable, Google Sheets, others)
- The tenant's identity iframe origin and backend
- The tenant's intake portal hosting
- The tenant's webhook receiver

**Currently not used in v1:**

- Customer support tooling — v1 uses the structured support form on Hope Connect's own platform
- Product analytics — none in v1
- Session replay / heatmap tools — explicitly disallowed by architecture
- Incident response platform — handled via internal ops runbook with counsel review for security events

---

## Part 5 — Expert Determination

Hope Connect commits to commissioning a formal Expert Determination under 45 CFR § 164.514(b)(1) **before any production data flows.**

**Scope of the determination:**

1. Real-time processing latency between tenant submission and Hope Connect's storage, and the implications for inferred individual-related timing.
2. Operational telemetry (Class 1 logs) and whether the strict separation from case data is sufficient, including residual probabilistic linkage through tenant identity, traffic volume, request timing, and request characteristics.
3. Tenant identifiability through Hope Connect's necessary operational knowledge of tenants' legal names, addresses, and service territories, and the structural and procedural controls separating that knowledge from case data.
4. Structured-data combination re-identification risk given the actual screening question set, enum vocabularies, tag library, and tenant population characteristics.
5. Case Identifier handling under § 164.514(c), including all operational uses Hope Connect makes of the Case ID and the constraints on its propagation.
6. Capability token handling — token format, claim minimization, lifetime, single-use enforcement via the ephemeral `jti`-hash replay-marker store per §2.6.1 (including whether this store constitutes a re-identification vector), non-logging, non-persistence after expiration.
7. **Case session handling per §2.6.2** — the server-side mapping from session_id to Case ID, its lifetime, and whether the case session store constitutes a re-identification vector under § 164.514(c).
8. Cross-site iframe cookie isolation requirements per §3.3, including the host-only / `__Host-` cookie discipline on tenant origins and the residual risk of broad-domain tenant cookies leaking to the Hope Connect subdomain.
9. **Tenant-level billing and usage metric granularity per §2.10** — including whether monthly intake counts at small tenant volumes constitute disclosure of individual-related dates, and confirmation of the appropriate suppression threshold and reporting period.
10. Aggregate reporting risk and the appropriate cell-size suppression thresholds across all aggregate outputs (clinical, operational, and billing).
11. **Whether the specified data, recipients, operational context, telemetry, and controls produce no more than a very small identification risk under § 164.514(b)(1).**

The Expert Determination determines re-identification risk. It does not determine Hope Connect's status as a Business Associate; that determination belongs to counsel.

**Engagement structure:**

The expert engagement is structured to address that re-identification risk depends on the dataset, anticipated recipient, external information, and environment, and that a large statewide tenant and a small specialized organization may present different risks. Counsel and the expert will structure the engagement using one of the following approaches:

- **A certified de-identification method** that tenants implement under defined conditions, with Hope Connect documenting adherence by each tenant.
- **A baseline determination with tenant-specific addenda** for materially different populations or datasets.
- **A baseline determination plus mandatory reassessment triggers** when tenants exceed defined thresholds (e.g., population size, geographic concentration, specialized service categories).

Each covered-entity tenant must be able to rely on and retain appropriate documentation of the Expert Determination as it applies to their data. Hope Connect's MSA includes provisions ensuring tenants receive the documentation needed to support their own de-identification posture.

**Engagement parameters:**

- Selection: a qualified expert with HIPAA de-identification experience under § 164.514(b)(1).
- Pre-launch prerequisite: no production data flows until the Expert Determination is complete and any expert-identified controls are implemented.

Cost estimates, vendor candidate identification, and engagement-letter terms are tracked in the parent company's procurement record and are not part of this architecture document.

---

## Part 6 — Residual risks

**R1 — Expert Determination conclusion.** The expert may conclude that additional controls are needed, or that certain tenants require tenant-specific addenda. Remediation budget of $5–15k is allocated.

**R2 — Counsel BA determination.** Counsel may conclude that Hope Connect is a Business Associate of some or all tenants despite the architectural intent. In that case, the BAA framework activates and subprocessor BAAs become required where they were previously provisional. This is anticipated and planned for in the budget.

**R3 — Tenant non-compliance.** If a tenant transmits PHI despite the de-identification requirement, Hope Connect may become or be treated as a Business Associate by virtue of actual data flow. Mitigation: MSA-imposed de-identification obligations, technical schema validation at the API boundary, audit rights, indemnification provisions.

**R4 — Probabilistic linkage residual.** Even with the two-class logging architecture, tenant-level metadata (static IP addresses, traffic volume, timing patterns) may permit probabilistic linkage of infrastructure events to specific tenants. The Expert Determination evaluates this; mitigations may include traffic batching, IP rotation, or other measures the expert recommends.

**R5 — Bridge identifier creep.** Future engineering changes could inadvertently introduce identifiers that bridge Class 1 and Class 2 logs. Mitigation: lint rules, periodic audit, architectural review of every new observability addition, postMessage gated behind explicit architecture review.

**R6 — Cross-site iframe browser changes.** Browser vendor restrictions on cross-site iframe behavior may evolve. Per-tenant subdomain deployment is the primary mitigation; ongoing browser-policy monitoring is required.

**R7 — Operational knowledge bleed.** Despite structural and procedural separation, Hope Connect personnel could combine tenant business knowledge with case data. Mitigation: access logging, training, MSA commitments, periodic audit, Expert Determination evaluation.

**R8 — Catch-all § 164.514(b)(2)(ii) actual-knowledge condition.** Even with named identifiers removed, residual structured-data combinations could in principle identify individuals in small populations. The Expert Determination is the principal mitigation.

**R9 — Oral disclosure of PHI during callbacks or incident handling.** Tenant staff may disclose client information orally during callbacks or during incident handling. Routine callbacks are limited to non-case-specific administrative and technical topics. Staff must stop and redirect any client-specific disclosure to the counsel-approved incident process per §1.2 and §3.8. PHI can be oral as well as electronic, and keeping it outside the electronic data plane does not by itself remove it from HIPAA analysis. Mitigation: staff training, scripted callback protocols, immediate escalation to the incident process on any client-specific disclosure attempt, and contractual obligations on tenant staff via the MSA.

---

## Part 7 — Binding architectural commitments

These are the non-negotiable architectural commitments. Any deviation invalidates the legal posture and requires renewed expert and counsel review.

1. Hope Connect's API will not accept any field outside the schemas in §2.1 and §2.6.
2. Hope Connect's intake template specification will not permit non-structured input types.
3. Hope Connect's database will not store any date directly related to an individual at greater than year precision.
4. Hope Connect's database will not store any per-tenant or global intake-order counter.
5. Hope Connect's database will not store any geographic subdivision smaller than state.
6. Hope Connect's database will not store any free-text field for client narrative or case manager notes.
7. Hope Connect's frontend JavaScript will not handle any tenant CRM OAuth token or any client identity. No `postMessage` listeners in v1; any future postMessage support requires renewed architecture review.
8. Hope Connect's case manager workspace will be deployed only as the Hope-Connect-origin iframe within a tenant-hosted wrapper, with CSP `frame-ancestors` enumerating exact registered wrapper origins (no wildcards).
9. Hope Connect's analyzer call to the LLM provider will not include any Case ID, tenant_id, or other identifier.
10. Hope Connect will not include Case IDs, capability tokens, or authorization headers in observability logs, infrastructure access logs, WAF logs, staff email content, URL paths, or query parameters.
11. Hope Connect will not persist any mapping between Class 1 (infrastructure) and Class 2 (case audit) identifiers. Case and infrastructure logs are never correlated in production; any exception triggers incident review.
12. Hope Connect will not accept inbound free-text support email. Case-related support uses a structured form with no narrative or attachment capability and synthetic record IDs.
13. Hope Connect will not establish subprocessor relationships with client-directed notification providers.
14. Hope Connect will commission Expert Determination before production data flows. The ED scope per Part 5 must be completed and any expert-identified controls implemented before launch.
15. Hope Connect's MSA imposes tenant de-identification obligations, § 164.514(c) requirements, and the right of covered-entity tenants to retain Expert Determination documentation as applicable to their data.
16. Capability tokens: 5-minute maximum life, single-use, never logged, minimal claims, `iat` omitted unless required. The capability-token body is never persisted; only the non-case-linked `jti_hash`, replay status, and expiration are stored ephemerally as specified in §2.6.1. Case sessions issued after the exchange follow the constraints in §2.6.2.
17. Subprocessor BAA conclusions remain pending Expert Determination and counsel confirmation. BAAs executed where counsel determines they are required.
18. Any change to Hope Connect's accepted fields, log surfaces, integrations, support channels, analytics, or iframe communication patterns requires renewed expert and legal review before deployment.
19. Each Case Identifier is uniquely assigned to one intake, never reassigned to another intake, never reused, and never used as a persistent cross-intake client identifier in any system, communication, or external disclosure.
20. Tenants cannot alter question meanings, enum labels, tag definitions, intake template semantics, or analyzer output enumerations without renewed Expert Determination review. The published intake template specification and analyzer output schema are version-controlled; tenant customization is limited to per-tenant theming (logo, colors, copy strings) and template selection from the published catalog. Any tenant-requested change to the semantic content of a field requires a new template version, expert review, and a documented rollout.
21. Cookies on tenant wrapper and identity-service origins must be host-only (no `Domain` attribute), set `Secure`, `HttpOnly`, and appropriate `SameSite`, and preferably use the `__Host-` prefix. Hope Connect runs automated pre-launch testing for broad-domain cookies on each tenant origin and fails launch if violations are present. The MSA imposes the corresponding tenant obligation.
22. The capability-token replay-marker store (per §2.6.1) holds only `jti_hash`, `used`, and `expires_at` — never the Case ID, never the token body — and is purged at or shortly after token expiration.
23. Professional service providers (Expert Determination firm, legal counsel, security assessor, forensic firm) receive synthetic or de-identified information by default. Any access to PHI during incident response is documented, minimum-necessary, and conducted under appropriate Business Associate Agreement or subcontractor terms approved by counsel.

These commitments are enforced through:
- Application code (schema validation, lint rules, CSP, logging configuration).
- Operational policy (access logging, training, audit, incident review).
- Contractual obligations (MSA terms, subprocessor agreements, employment policies).

---

## Part 8 — Launch prerequisites

**This is the baseline architecture submitted for counsel and Expert Determination review; their required changes supersede this document.** Architectural changes recommended or required by counsel, the Expert Determination firm, or any subsequent professional service review become authoritative when they are documented and approved, regardless of any contrary statement in this baseline.

**Production launch requires all of the following:**

- Completed Expert Determination under § 164.514(b)(1), with a documented "very small risk" conclusion or specified mitigations implemented.
- Counsel-confirmed Business Associate analysis for each tenant arrangement contemplated.
- Counsel-drafted Master Subscription Agreement executed with each launch tenant, incorporating tenant de-identification obligations, § 164.514(c) requirements, cookie-isolation obligations, and the right of covered-entity tenants to retain Expert Determination documentation as applicable to their data.
- All architectural commitments in Part 7 verified by code review and security audit.
- Counsel-approved security incident response process per §1.2 and §3.8, including pre-approved Business Associate Agreement templates and subcontractor terms for legal counsel, forensic firms, and security assessors.

**Document discipline going forward:**

Any change to Hope Connect's accepted fields, logging surfaces, integrations, support channels, analytics, or iframe communication patterns requires:

1. Architectural impact analysis against this document.
2. Expert and legal review where the change affects de-identification or BA status.
3. Update to Part 7 binding commitments.
4. Notification to existing tenants where the change affects their MSA obligations.

**Stop iteration.** This document is the architectural baseline. Remaining open questions belong to qualified counsel and the Expert Determination expert, not to further internal architectural revision.
