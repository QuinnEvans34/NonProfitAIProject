# Hope Connect — Architectural Response to Legal Review

**Purpose:** This document responds to the ten-point legal critique of the prior Hope Connect proposal architecture. For each critique item, it describes the specific architectural change committed, identifies residual risks, and explicitly asks the reviewer to assess whether the change is sufficient. The original proposal claimed Hope Connect was outside HIPAA. The reviewer demonstrated that the claim was not supported by the architecture as described. The architecture has been substantially reworked. We are not asking the reviewer to validate the original claim; we are asking whether the reworked architecture supports the claim.

**Status:** Pre-attorney review. We are seeking a second-opinion technical/legal assessment before commissioning a formal attorney review and before any communication with the partner organization.

---

## 1. Summary of the architectural shift

The original proposal described Hope Connect as a SaaS that clients interact with directly (client browser → Cloudflare → Hope Connect API), with backend PII scrubbing, server-side CRM credentials in some configurations, client authentication via Clerk/Google, in-Hope-Connect staff notes, and exact timestamps on every record. The reviewer correctly identified that this architecture meant PHI passed through Hope Connect before any de-identification could occur, that the platform retained identifiers Safe Harbor prohibits, and that the "out of HIPAA scope" claim was inconsistent with multiple system features.

The reworked architecture, **Architecture A** (the "strict de-identified pipeline"), changes the fundamental data flow such that Hope Connect's systems and subprocessors never receive any client-side traffic, identifiers, or unscrubbed text. PHI removal happens client-side in the user's browser, before any data is transmitted to the tenant's backend or to Hope Connect.

The legal position is no longer "Hope Connect receives PHI and de-identifies it under Safe Harbor." The legal position is now **"Hope Connect never receives PHI in the first place."** These are different framings with different rule applicability: the first invokes § 164.514 and requires meeting Safe Harbor or Expert Determination; the second invokes the threshold question of whether Hope Connect is a Business Associate at all, which we believe it is not because Hope Connect does not create, receive, maintain, or transmit PHI per § 160.103.

We are not stating this as established fact. We are stating it as the architectural intent and asking the reviewer to assess whether the architecture, as described below, supports this position.

## 2. The new data flow

```
1. CLIENT BROWSER (on tenant.org domain, not hopeconnect.app)
   ├─ Loads intake form from TENANT'S domain and servers
   ├─ Loads Hope Connect Scrubber SDK (bundled via NPM into tenant's app,
   │   not loaded from Hope Connect's CDN at runtime)
   ├─ User fills out form
   ├─ Scrubber runs in browser:
   │    • Regex pass: phone, email, SSN, US ZIP, name patterns
   │    • Small LLM pass via WebGPU (Phi-3.5-mini or equivalent, ~150-300MB,
   │      downloaded once and cached): detects contextual identifiers
   │      (e.g., "my mother who works at..." → flagged)
   ├─ User reviews scrubbed version before submission
   └─ SDK produces signed submission payload with tenant-scoped key
   
2. TENANT BACKEND (tenant's infrastructure)
   ├─ Receives signed submission from client browser
   ├─ Validates SDK signature
   ├─ Generates random opaque Case ID (16 bytes from CSPRNG)
   ├─ Strips network metadata: client IP, user-agent, headers, cookies
   ├─ Truncates submission timestamp to day (not minute or second)
   ├─ POSTs to Hope Connect API using tenant's server-to-server credentials
   └─ Tenant separately stores: {Case ID, name, phone, address} in its CRM
   
3. HOPE CONNECT API (AWS)
   ├─ Accepts traffic only from tenant backends, never directly from clients
   ├─ Validates SDK signature (proves scrubbing was performed)
   ├─ Runs last-line defense: server-side regex scan for PII patterns
   │    • If pattern detected → reject submission, alert tenant
   ├─ Stores: Case ID, scrubbed text, screening responses, day-truncated
   │   timestamps, structured status only (no free-text staff notes)
   
4. ANALYZER LLM (cloud, no BAA needed)
   ├─ Receives only scrubbed Case Data
   ├─ Returns AnalysisResult (severity, recommendations, etc.)
   
5. CASE MANAGER WORKFLOW
   ├─ Case manager logs into Hope Connect using tenant-scoped credentials
   │   (no client-side authentication occurs in Hope Connect)
   ├─ Browser fetches Case Data from Hope Connect API
   ├─ Browser SEPARATELY fetches Identifying Information from tenant CRM
   │   using browser-side OAuth tokens (Hope Connect's backend never holds
   │   CRM credentials)
   ├─ Browser joins the two views in memory; nothing is persisted
   ├─ Case manager records status transitions in Hope Connect
   │   (structured fields only: status, outcome, priority — no narrative)
   └─ Case manager writes narrative notes in tenant CRM, not Hope Connect
```

The boundary that matters: Hope Connect's servers, logs, vendor subprocessors (Cloudflare, AWS, Anthropic, Sentry, observability), and infrastructure are downstream of a scrubbing checkpoint that runs entirely on the client's device or the tenant's infrastructure.

## 3. Point-by-point response to the prior critique

### Critique 1: Free text reaches Hope Connect before de-identification

**Original architecture:** Backend regex and LLM scrubbing on Hope Connect's API server.

**Change committed:** Scrubbing moved to client-side in the user's browser. A WebGPU-loaded small LLM (Phi-3.5-mini class, around 150–300 MB, cached after first load) and a regex layer run on the client device. Submission is signed by the scrubber SDK; Hope Connect's API rejects unsigned submissions. The Hope Connect-published scrubber is shipped as an NPM package the tenant bundles into their intake portal, not as a runtime CDN-loaded script — meaning Hope Connect's servers are not a runtime party to the scrubbing process.

**Resolution:** Unscrubbed text never leaves the user's device. The de-identification operation occurs within the client's trust boundary, before any cross-organizational transmission. Hope Connect does not perform de-identification under § 164.514 because Hope Connect never receives the identifiable data in the first place.

**Residual concern:** Browser-side scrubbing is imperfect. We add a last-line server-side detector on Hope Connect's API that rejects obvious PII patterns; this is a defense-in-depth check, not a primary de-identification step. We ask the reviewer to confirm whether this two-tier approach (primary client-side scrubbing + last-line server-side rejection) is sufficient or whether additional measures are needed.

### Critique 2: Exact dates and timestamps violate Safe Harbor

**Original architecture:** `created_at`, `updated_at`, `completed_at`, status-transition timestamps, audit timestamps — all at second-level precision.

**Change committed:** All timestamps directly related to an individual are truncated to **day precision** at the tenant backend before submission to Hope Connect. Hope Connect stores `received_date` (date only, no time). For ordering within a case manager queue, we use relative time deltas (e.g., "received 3 days ago") computed against the day field, not stored wall-clock times. Audit log entries on Hope Connect's side capture only events about access to Case Data, not events tied to the individual.

**Resolution:** Hope Connect's database does not contain dates at greater precision than Safe Harbor permits. Safe Harbor's date rule is satisfied by virtue of the data Hope Connect receives, not because Hope Connect performed truncation post-receipt.

**Residual concern:** Even day-level dates combined with tenant location (Charlotte) and screening signals could contribute to re-identification in small populations. This is addressed under Critique 8 below. We ask the reviewer to assess whether day-level dates are sufficient for Hope Connect's posture or whether further generalization (week, month, quarter) is needed.

### Critique 3: Client IP addresses and network metadata reach the platform

**Original architecture:** Clients connected directly through Cloudflare and AWS ALB to Hope Connect's API. IP addresses reached Cloudflare's TLS termination, the ALB, application logs, and observability vendors alongside health-related intake traffic.

**Change committed:** Clients never connect to Hope Connect's infrastructure. The intake portal is served from the tenant's domain on tenant infrastructure. Only the tenant's backend connects to Hope Connect's API, using server-to-server credentials. The IPs reaching Hope Connect's Cloudflare and AWS layers are tenant infrastructure IPs, not client IPs. Cloudflare, AWS ALB, and observability vendors never see client traffic in connection with health data.

**Resolution:** Hope Connect's network surface is fully decoupled from client devices. No subprocessor on the Hope Connect side receives client IPs, user-agents, or other client network metadata. Cloudflare and AWS are receiving server-to-server backend traffic from authenticated tenants, not client-to-server traffic carrying health information.

**Residual concern:** The tenant's own infrastructure does receive client IPs and is the party that must handle them appropriately. This is now a Tenant responsibility documented in the Master Subscription Agreement. We ask the reviewer to confirm whether server-to-server traffic from authenticated tenant backends counts as "Hope Connect receiving PHI via metadata" or not.

### Critique 4: Client authentication conflicts with identity separation

**Original architecture:** Clerk client accounts with optional Google OAuth, ability for clients to view their own submissions.

**Change committed:** **Client authentication is removed from Hope Connect entirely.** Hope Connect has no concept of a "client user." There is no client login, no Google OAuth for clients, no Clerk identity for clients, no "view my submission" feature in Hope Connect. The only Hope Connect users with accounts are case managers, tenant org admins, and Hope Connect master admins — all of whom are tenant staff or Hope Connect staff, never clients.

If a tenant wishes to offer a client portal where clients can return to view their own submissions, that portal is built and operated by the tenant on the tenant's infrastructure, using the tenant's CRM as the data source. Hope Connect does not host or operate such a portal.

**Resolution:** No client identity exists in Hope Connect's systems. The link between a client identity (email, OAuth profile, etc.) and a Case ID cannot be made by Hope Connect because Hope Connect holds neither side of that link.

**Residual concern:** None on this point.

### Critique 5: Server-side CRM credentials contradict the access claim

**Original architecture:** Section 5.7 permitted server-side OAuth credential storage encrypted with KMS for CRMs that don't support browser-direct calls.

**Change committed:** **Browser-only OAuth, no server-side credential storage of any kind.** For CRMs supporting browser-direct OAuth (Google Sheets, Airtable, HubSpot, Notion), the credentials live only in the case manager's browser session. For CRMs that block browser-direct access (Salesforce, Bonterra), the bridge service is **tenant-hosted on tenant infrastructure** (Cloudflare Worker in tenant's Cloudflare account, or Docker container on tenant's servers) and holds the credentials in the tenant's environment. Hope Connect never possesses CRM credentials in any form.

**Resolution:** Hope Connect cannot read tenant identity stores. The bridge for restrictive CRMs is documented as a tenant-deployed component, with deployment templates provided but no credential storage on Hope Connect's side.

**Residual concern:** Hope Connect publishes the bridge template code. If the tenant deploys it correctly but the template itself had a security flaw, Hope Connect could be indirectly implicated. Mitigation: published code is open and auditable; tenant assumes deployment responsibility under the MSA.

### Critique 6: Staff-note overrides can place PHI in Hope Connect

**Original architecture:** Staff notes stored in Hope Connect's database with a "warn but allow" override on PII detection.

**Change committed:** **Staff notes are removed from Hope Connect entirely.** Hope Connect's case manager UI does not have a narrative notes field. Status fields, outcome fields, and tag fields are structured (enum values, predefined tags). Narrative notes are written by case managers in the tenant CRM, alongside the client name. Hope Connect's audit log captures status transitions and structured-field changes but never narrative text.

**Resolution:** No free-form narrative entry surface exists in Hope Connect. Any human-authored narrative about a client lives in the tenant's CRM, outside Hope Connect's data plane.

**Residual concern:** Case managers may attempt to encode narrative information into the available structured fields (e.g., creating a tag like "homeless_with_kids_evicted_yesterday"). Mitigation: tag values are constrained to a predefined library managed by Hope Connect; tenants cannot add free-form tags in v1.

### Critique 7: The Case ID exception is not automatic

**Original architecture:** Claimed that § 164.514(c) permitted Hope Connect to hold the Case ID as a re-identification code.

**Change committed:** **Reframed legal position.** Hope Connect does not invoke § 164.514(c) because that subsection applies to a Covered Entity holding a re-identification code on data it has itself de-identified. Hope Connect is not a Covered Entity and does not perform de-identification under HIPAA. The data Hope Connect receives is already de-identified by the tenant (which generates the Case ID at the tenant's infrastructure, performs network metadata stripping, and validates that scrubbing has occurred).

The legal position is: **Hope Connect does not create, receive, maintain, or transmit PHI per § 160.103, and is therefore not a Business Associate, regardless of the regulatory status of the tenant.**

**Resolution:** The question of whether the Case ID satisfies § 164.514(c) is mooted. The Case ID is not a re-identification code in Hope Connect's hands because Hope Connect has no de-identified PHI; Hope Connect has only data that was de-identified before Hope Connect received it.

**Residual concern:** This framing depends on the tenant actually performing proper de-identification before submission. We ask the reviewer to assess whether shifting the de-identification step to the tenant creates legal exposure for Hope Connect if the tenant is sloppy. Our planned mitigation: contractual obligations on tenants in the MSA, technical enforcement via the SDK signing system, last-line server-side detection on the Hope Connect API, audit rights.

### Critique 8: Remaining Case Data may still identify people

**Original architecture:** The claim that removing names is sufficient was implicit. Re-identification risk from the combination of tenant location, language, crisis status, immigration-related signals, and detailed narrative was not adequately addressed.

**Change committed:** Three layers of mitigation:

1. **Free-text scrubbing removes contextual identifiers** at the client side (as described in Critique 1). Implicit identifiers like "my mother who works at Bank of America" are caught by the LLM pass; obvious patterns like "I live at 123 Main" are caught by regex.

2. **Field generalization for high-risk attributes.** Specific implementation:
   - Language: detected and stored as the language code only; specific phrases are scrubbed.
   - Geography: never stored at greater specificity than the tenant's primary service region. ZIP codes are scrubbed; tenant assignment is the only geographic signal.
   - Immigration status: stored as a structured boolean (immigrant_services_relevant: true/false) only; narrative is scrubbed.
   - Demographic combinations: not directly stored; only the screening Likert responses and the AI analyzer's categorical outputs are persisted.

3. **Aggregate reporting controls.** All cross-tenant or external aggregate reporting applies a minimum cell size suppression (k ≥ 11, consistent with HHS Expert Determination examples), suppresses small-bucket outputs, and applies cell rounding for counts of 11–99.

**Residual concern:** Even with these mitigations, the combination of detailed screening responses with tenant location could theoretically identify an individual to a determined re-identification attacker with sufficient external data. We acknowledge this as residual risk. We propose that once Hope Connect reaches 10,000+ stored intakes, a formal Expert Determination by a qualified statistician be commissioned to document the actual re-identification risk and recommend further mitigations.

We ask the reviewer to assess whether (a) these mitigations are sufficient for the pre-10k-intake stage, (b) whether an Expert Determination should be obtained earlier, and (c) whether the k ≥ 11 minimum cell size is defensible for the aggregate reporting use case.

### Critique 9: Covered Entity and Business Associate status conflated

**Original architecture:** Mixed treatment of Covered Entity status and Business Associate status, with implicit reliance on neither applying.

**Change committed:** Explicit clarification in the legal posture documentation:

- Hope Connect is not a Covered Entity. Hope Connect is not a health plan, healthcare clearinghouse, or healthcare provider that transmits health information in standard transactions.
- Hope Connect's status as a Business Associate depends entirely on whether Hope Connect handles PHI on behalf of a Covered Entity. Under Architecture A, Hope Connect does not handle PHI for any party. Therefore Hope Connect is not a Business Associate of any tenant — regardless of whether the tenant is itself a Covered Entity.
- A Covered Entity tenant does not automatically render Hope Connect a Business Associate. The data flow determines the status, not the contractual relationship.
- Conversely, a non-Covered-Entity tenant does not insulate Hope Connect from Business Associate status if Hope Connect were to handle PHI on their behalf via some other route.

**Resolution:** The two statuses are decoupled and the architectural analysis is the determining factor.

**Residual concern:** We are not legally qualified to assert these conclusions ourselves. We are asking the reviewer (and ultimately a qualified attorney) to confirm.

### Critique 10: Several secondary claims need correction

**Original architecture:** Stated as established facts: minimum cell size of 10 as a "universal safe harbor," seven-year audit log retention "consistent with HIPAA," "Vanta required for HIPAA," "no BAA needed for Anthropic."

**Change committed:** All such language is being struck from the revised proposal.

- **Minimum cell size:** Documented as an industry-standard risk control commonly referenced in HHS Expert Determination examples (k ≥ 11 is a frequent threshold), not as a legal de-identification standard. Hope Connect's actual de-identification posture relies on the architectural never-receive-PHI position, not on the cell-size threshold alone.
- **Audit retention:** Reset to a tenant-configurable default of three (3) years with the ability to extend on contractual terms. HIPAA's six-year requirement under § 164.530(j) applies to policy/procedure documentation, not arbitrary application audit logs, and is not directly applicable here. The retention period is now a contractual choice rather than a regulatory one.
- **Vanta:** Removed from the architecture description as a required component. Continuous compliance monitoring is recommended but optional, and Vanta is named as one of several possible tools, not as a HIPAA requirement.
- **"No BAA needed for Anthropic":** Reframed as "No BAA with the analyzer LLM provider is required under Architecture A because the analyzer processes only data that has been de-identified before Hope Connect received it, and therefore Hope Connect does not transmit PHI to the analyzer." Subject to confirmation that the de-identification before submission is, in fact, sufficient.

**Resolution:** Categorical claims removed; defensible statements made with caveats.

## 4. Subprocessor inventory under Architecture A

Per the reviewer's request, here is the complete subprocessor list and our position on BAA requirement for each:

| Subprocessor | Role | Data received | BAA needed under Architecture A? |
|---|---|---|---|
| Cloudflare | DNS, WAF, DDoS for Hope Connect's API | Server-to-server TLS traffic from tenant backends; no client traffic | No, because no client metadata or PHI reaches Cloudflare |
| AWS (compute, storage, network) | Hosting | Same as above, scrubbed Case Data at rest | No, by same reasoning; AWS BAA still recommended for general data hygiene |
| Anthropic (analyzer LLM) | AnalysisResult generation | Scrubbed Case Data only | No, because PHI is removed before submission |
| Clerk | Auth for case managers, org admins, THC admins | Email and password for staff users; no client identities | No, because no client identities exist in Hope Connect |
| Sentry / Datadog / Better Stack | Observability | Scrubbed application logs (no PII in logs by design) | No, log scrubbing rules enforced; ongoing audit required |
| Postmark / SendGrid | Transactional email to case managers and admins | Staff email addresses; no client information | No |
| Twilio | Optional crisis SMS to designated crisis contact | Tenant's crisis-contact phone (the receiver of the alert), Case ID only — no client info | No |
| Stripe | Billing (tenant-level subscriptions) | Tenant org billing info; no client data | No |

We ask the reviewer to validate this analysis and identify any subprocessor where this position would not hold.

## 5. Features removed or changed from the original proposal

A complete list of what changed at the product level, for clarity:

| Feature | Original | Revised |
|---|---|---|
| Client portal in Hope Connect | Existed; clients could view their submission | **Removed.** Hope Connect has no client-facing UI. |
| Client authentication | Clerk + Google OAuth | **Removed.** No client identities in Hope Connect. |
| Intake portal hosting | Cloudflare + Hope Connect API | **Moved.** Intake portal is hosted by each tenant on tenant infrastructure. |
| Scrubbing | Backend (Hope Connect API) | **Moved.** Client-side in the user's browser, via SDK. |
| Scrubber LLM | Server-side Claude Haiku call | **Local.** Browser WebGPU model (Phi-3.5-mini or similar), bundled via NPM. |
| Staff notes | Free-text in Hope Connect DB | **Removed.** Notes go to tenant CRM; only structured fields in Hope Connect. |
| Timestamps | Second-level precision | **Day-level only.** Stored as date type. |
| CRM credentials | Server-side encrypted with KMS in some configs | **Browser-only OAuth or tenant-deployed bridge.** No Hope Connect-side credentials. |
| Case manager IP addresses | Logged in audit log | **Removed from audit log.** Hashed or omitted. |
| Audit retention | "7 years (HIPAA expectation)" | **3 years default, tenant-configurable.** |
| Vanta requirement | Asserted | **Optional.** Removed from architecture requirements. |

## 6. Features added to make Architecture A work

| Feature | Purpose | Approximate effort |
|---|---|---|
| Hope Connect Scrubber SDK (NPM package) | Client-side PII detection and removal | 120–200 hours |
| Submission signing | Cryptographic attestation that scrubbing was performed | 30–50 hours |
| Last-line API-level PII detection | Defense-in-depth at Hope Connect's API | 30–40 hours |
| Tenant intake-portal hosting templates | Reference implementations the tenant deploys on their own infrastructure | 60–100 hours |
| Tenant-hosted bridge templates (for Salesforce/Bonterra) | OAuth proxy for CRMs that block browser-direct calls | 80–120 hours |
| Tag/status library management | Constrained structured-field library replacing staff notes | 40–60 hours |
| Documentation: MSA template language, tenant deployment guides, scrubber audit procedures | Contractual and operational backing for the architecture | 80–120 hours |

## 7. Residual risks acknowledged

We do not claim Architecture A eliminates all risk. The following are residual and require ongoing mitigation:

1. **Tenant compliance with the architecture.** If a tenant misconfigures their intake portal to bypass scrubbing or skip Case ID generation, raw PHI could reach Hope Connect. Mitigation: SDK signing requirement, server-side last-line detection, audit rights in the MSA, periodic spot audits.

2. **Imperfect scrubbing quality.** No automated scrubber catches 100% of PII. Mitigation: two-layer scrubbing (regex + LLM), tenant-side review step before submission, server-side last-line, ongoing improvement of the model.

3. **Re-identification of detailed records.** Even with scrubbing, the combination of tenant geography, language, crisis status, and screening responses creates residual re-identification risk for individuals in small populations. Mitigation: field generalization, aggregate-only reporting with cell suppression, formal Expert Determination commissioned at 10k intake threshold.

4. **Model and dependency vulnerabilities.** The scrubber SDK, the analyzer LLM, and the tenant bridges all have software supply-chain risk. Mitigation: dependency monitoring, pinned versions, security review at launch and annually.

5. **Legal posture is novel and depends on a counsel sign-off.** The position that a SaaS providing AI-assisted case triage to social services nonprofits is outside HIPAA scope because of the federated identity architecture is, to our knowledge, not common case law. We are explicitly asking for both a second-opinion technical review (this document) and a qualified attorney review before contracting language commits to this position publicly.

## 8. What we are asking the reviewer to assess

Specific questions for the reviewer to evaluate and respond to:

1. Does the architecture as described in §2 support the position that Hope Connect does not create, receive, maintain, or transmit PHI per § 160.103?

2. If yes to (1), does that position make Hope Connect not a Business Associate of any tenant, regardless of whether the tenant is itself a Covered Entity?

3. Is the client-side scrubbing approach (browser-side LLM + regex, signed submission, server-side last-line) sufficient to defend the claim that PHI does not reach Hope Connect, or are additional measures needed?

4. Is day-level timestamp truncation sufficient, or is further generalization required?

5. Is server-to-server traffic from a tenant backend to Hope Connect's API treated as "Hope Connect receiving PHI via network metadata" if the request body contains only de-identified data?

6. Is the subprocessor analysis in §4 correct? Are there subprocessors not listed that should be addressed?

7. Are the residual risks in §7 acceptable for this stage of the product (pre-launch, pre-10k-intakes), or are mitigations required earlier?

8. Should we commission an Expert Determination from a qualified statistician before launch, or is post-10k-intake acceptable?

9. Is the proposed contractual language theme — tenant assumes responsibility for de-identification on their side, Hope Connect provides the SDK and last-line, MSA documents the split — likely to hold up under regulatory scrutiny, or does it need restructuring?

10. Are there critique items from the prior review that we have not adequately addressed, or new critique items the revised architecture introduces?

## 9. What we are not asking the reviewer to do

- Validate the original architecture from the prior proposal. That architecture is being abandoned.
- Provide formal legal advice. The reviewer is providing a technical/architectural assessment to be paired with formal counsel review.
- Confirm tenant-specific compliance. Each tenant's HIPAA, state privacy, or other regulatory status is the tenant's responsibility under the proposed MSA.

---

## Next steps after the reviewer responds

1. Incorporate the reviewer's feedback into a final architectural commit.
2. Commission attorney review with the data flow inventory in §2 and the MSA framework as starting materials.
3. Rewrite the proposal (`HOPE_CONNECT_PROPOSAL.md`) to reflect the final architecture, with all categorical "out of HIPAA scope" statements replaced with conditional language pending attorney confirmation.
4. Re-cost the proposal with the architectural changes and new SDK build work included.
5. Deliver the revised proposal to the partner organization, accompanied by the data flow inventory and the attorney's confirmation.
