# Hope Connect — Team Proposal & Market Research

_Source: research and proposal document compiled by teammate. Captured here as future context for planning, pricing, scope, and meeting decisions._

---

## Business model of the nonprofit

- Government agency (needs to be researched deeper)
- County
- State

---

## B2B SaaS model examples

### Findhelp — [forbes.com](https://www.forbes.com) | worth: ???

- **Enterprise Software Subscriptions:** Sells flexible subscriptions to healthcare systems, hospitals, health plans, schools, and government agencies. These paid tools allow these organizations to send referrals, manage care coordination workflows, and measure the impact of social interventions.
- Does not charge users or nonprofits for using their software.

### Unite Us | worth: $1.5B

A technology company that builds coordinated care networks, connecting healthcare providers, government agencies, and community-based organizations. It provides software that tracks referrals and social care outcomes, helping communities address social determinants of health like food security, housing, and transportation.

Key features of the platform:

- **Closed-Loop Referrals:** When someone is referred to a social service, the system tracks the interaction from the initial request to the final outcome, verifying the person actually received the help they needed.
- **Cross-Sector Collaboration:** Healthcare systems, insurance plans, and local charities can communicate securely on one digital platform.
- **Data Tracking:** Helps measure the impact of local programs, identify service gaps, and shape community health policies.

### Bitfocus | worth: ???

A technology and services company that builds software solutions to help cities, counties, and nonprofit organizations track and manage homeless services.

### Bonterra | worth: $1B

A software company that provides technology and AI solutions designed specifically for nonprofits, public agencies, and corporate social responsibility (CSR) programs. The company's name combines the French word _bon_ (good) and the Latin word _terra_ (land) to reflect its focus on driving social impact.

---

## Viability / market advantage

The AI angle is genuinely novel right now. Most nonprofit case management software (Salesforce NPSP, Apricot, ETO) has zero AI. An AI-assisted intake that can auto-triage, flag crises, and automate benefits enrollment would be a real competitive differentiator — not just a buzzword.

### Government case management

Source: <https://www.visualvault.com/blog/government-case-management-software/>

The market for these solutions is substantial and growing. According to Precedence Research (2025), the global case management software market was valued at **USD 8.26 billion in 2024** and is forecast to reach **USD 24.09 billion by 2034**, growing at a CAGR of **11.3%**. The public sector accounts for a significant share of this growth, driven by federal digital transformation mandates, citizen experience expectations, and the need to modernize legacy case systems.

---

## Quote options / info

### Terms defined

- **Maintenance** — maintaining compliance (HIPAA, other), security updates, feature updates, overall continued development, edits to design, bug fixes, optimization.
- **Hard costs** — 3rd party costs for compliance audits, hosting ($2,400–$6,000/yr), security audits, legal.

> **~$12,000–$34,000** in hard costs.
> **~$2,000 per month** in maintenance.

### Equity option — $40k + 10% ownership

Devs (Quinn and Ted) maintain equity / partial ownership in the software and monetary intake from the software. As well as a reduced upfront development fee and a monthly maintenance fee to perform maintenance. Hard costs not included.

### Full transfer of ownership — $60k

Devs (Quinn and Ted) will transfer full IP ownership and licensing rights to the nonprofit but will get paid a monthly maintenance fee to perform maintenance. Hard costs not included.

---

## Quote reasoning / market analysis

### Notes

- **HIPAA compliance** typically adds **$40k to $60k** to the total project cost PLUS an additional monthly maintenance/auditing fee — _ayelite.com_.
  - **Reasoning for base addition:** you'll need to hire lawyer and/or consulting/auditing companies to review and approve everything.
  - **Reasoning for additional monthly fee:** Once the app is live, you'll need to continue to actively monitor systems, run vulnerability scans, collect logs and review them. Additionally, it covers security patching, log review, cloud compliance monitoring, policy updates, and the vulnerability assessment.
- According to Clutch's 2025 data, the average software development project costs **$132,480** and takes about **13 months** to complete (_adevs.com_).

---

### What you've already built — retroactive value (our project)

Based on the repo, roughly **100–160 hours** of combined work building the prototype. At honest market rates for a 2-person indie dev team (not an agency):

| Rate | Estimate |
|---|---|
| $50/hr (fair for early-stage, no agency overhead) | $5,000 – $8,000 |
| $75/hr (competitive independent dev rate) | $7,500 – $12,000 |
| $100/hr (agency-comparable) | $10,000 – $16,000 |

**Realistic ask for the prototype:** $8,000–$15,000 as a one-time payment, OR waive it in exchange for better terms going forward (equity, IP ownership, or a higher future rate).

---

### Production build — what to charge going forward (our project)

Realistic breakdown of hours and cost at a **$75/hr** blended rate for two developers:

| Phase | Est. hours (2 devs) | Cost at $75/hr |
|---|---|---|
| Database + data persistence | 80–120 hrs | $6,000–$9,000 |
| Authentication + role-based access | 60–80 hrs | $4,500–$6,000 |
| HIPAA compliance implementation | 150–250 hrs | $11,250–$18,750 |
| Benefits enrollment automation (API integrations) | 200–400 hrs | $15,000–$30,000 |
| Deployment + infrastructure | 40–60 hrs | $3,000–$4,500 |
| Testing, QA, documentation | 80–120 hrs | $6,000–$9,000 |
| **Total** | **610–1,030 hrs** | **$45,750–$77,250** |

Plus third-party costs paid out of pocket regardless:

- HIPAA security audit: $5,000–$15,000
- Legal (BAAs, contracts, terms): $3,000–$8,000
- Cloud infrastructure / year: $2,400–$6,000
- Compliance tools (encryption, audit logging software): $2,000–$5,000

**Total production build:** ~$58,000–$111,000 in dev labor + ~$12,000–$34,000 in hard costs.

---

### Reason supporting the quote price

Source: <https://ayelite.com/blog/hipaa-compliance-cost-for-app-development>

> Fundamentally, the cost of developing a "typical" non-HIPAA-compliant app may be $10,000 to $50,000, with cost being determined by features and complexity.
>
> When you take into account the additional security, infrastructure, and legal oversight you need to comply with HIPAA. We generally see the costs of developing a HIPAA compliant app increase by **$40,000 to $60,000**.

---

### Market example — Healthcare Scheduling Platform (HIPAA-Compliant)

Source: <https://adevs.com/blog/custom-software-development-cost-usa/>

- **Client:** Mid-sized medical practice network, California
- **Scope:**
  - Patient portal with appointment booking
  - Video consultation integration (Zoom API)
  - EHR integration (Epic, Cerner)
  - HIPAA-compliant infrastructure
  - Admin dashboard with reporting
- **Team:** US-based hybrid model
  - Senior engineers for HIPAA compliance and integrations
  - Mid-level engineers for frontend and backend
  - Security consultant
- **Timeline:** 7 months
- **Cost:** $280,000 – $350,000
- **Ongoing support:** $35,000 – $50,000/year

---

### Market example — Small Business App (Internal CRM or Booking System)

Source: <https://adevs.com/blog/custom-software-development-cost-usa/>

- **Scope:**
  - Basic user authentication
  - Dashboard with reporting
  - Simple integrations (calendar, email)
  - Mobile-responsive design
- **Team:**
  - 2 mid-level engineers
  - 1 designer (part-time)
  - 1 project manager (part-time)
- **Monthly cost:** $25,000 – $40,000
- **Duration:** 3–4 months
- **Total:** $75,000 – $160,000

---

## Project requirements

Source: <https://www.visualvault.com/blog/government-case-management-software/>

- [ ] **Configurable Intake & Triage** — Drag-and-drop form builder with conditional logic to adapt to different program types (benefits, investigations, permits) without developer intervention.
- [ ] **Automated Workflow Routing** — Rules-based assignment engine that routes cases to the right caseworker, supervisor, or agency based on intake data, geography, program type, or priority flags.
- [ ] **Role-Based Access Control (RBAC)** — Granular permission management so frontline workers, supervisors, auditors, and external partners each see only the data they are authorized to access.
- [ ] **Document Management & e-Signatures** — Secure, version-controlled document storage with legally compliant e-signature support, eliminating paper and enabling remote intake for constituents.
- [ ] **Real-Time Reporting & Dashboards** — Pre-built and custom dashboards for program outcomes, caseload metrics, SLA compliance, and federal grant reporting (TANF, SNAP, CDBG, etc.).
- [ ] **Interagency Data Sharing & APIs** — Open API architecture or pre-built connectors to share case data with state MMIS, child welfare systems, law enforcement databases, and ERP platforms without re-keying.
- [ ] **Audit Trail & Compliance Logging** — Immutable, time-stamped activity logs that track every action taken on a case — required for federal compliance, litigation response, and public records requests.
- [ ] **Mobile & Field Access** — Responsive mobile interface (or native app) so field investigators, home visitors, and outreach workers can access and update cases from the field securely.
- [ ] **Client/Constituent Portal** — Self-service portal where constituents can submit applications, upload documents, check case status, and receive notifications — reducing inbound call volume.
- [ ] **Low-Code / No-Code Configurability** — Ability for trained agency staff (not developers) to modify forms, workflows, and reports as programs evolve, reducing total cost of ownership and IT dependency.

---

## Meeting 1

Slides: <https://docs.google.com/presentation/d/1jC0BuR2Ce7js3h2iOHFWC_bURGFq9YvGdyYJWCak8fw/edit?usp=sharing>

### Overview

- **Hope Connect** — product name
- Human intervention
- **Hope Connector** — staff role name

### Needs

- HIPAA compliance
- PII security
- Intaking
  - Manual or via person
- What they qualify for
  - Immediate help
  - Long term help

### Key categories

- Intake
- Client data
- Security and compliance
- AI
- Reporting
- Client and staff sides
- Build and support
- Risk assessment

### Purpose and scope

- **Intake** — client into and assessment of what the client needs
- **End users** — case managers
- **Assistance types** — financial, educational, crisis, housing, mental health
- Can intake question
- **USE an intake agent** that works end to end about everything and walks the user through everything. For example it may say, "do you have access to food — Y / N — can you then get to where you can get food (transportation)"

### AI usage

- Chat bot to get all the questions — have a nice opening message from the agent that makes the user feel cared for and not just talking to a bot. Keep transparency about them talking to a bot. Make sure the user knows they have access to a real person.
- Agent to find info about programs over the web (long term welfare and immediate help).
- Chat bot that takes notes and walks through, then takes all that summary and gives it to a person who can then if wanted call the staff.

### Critical questions

- How to follow up
- How to track the AI is giving the proper advice
- How to track if the AI is actually working and not being skipped

### Can have

- CRM and management
- Use something like Salesforce

### Plan idea

- Human and AI intake and get a general idea
- Store everything in a CRM

### General additions

- **"Path of success"** — where the user is and where they need to be
- Client to case worker portal
- Have connections to other nonprofits

### My questions

- Nationwide or local
- Same time sessions or outside hours
  - **Both** — within hours it's same session kinda, but outside it will get info and the case agent will reach out the next day
- Goal is nationwide or localized — **nationwide**
- Intake portal → data viewing → ?

### Prototype ideas

- Local AI chat bot model
- Build for North Carolina
- <https://www.usa.gov/benefits>

### Focus points

- Ensure standard formatting
- Figure out AI scope
- How POC will work: option 1 or 2?
  1. **Option 1:** User → back end → case manager → back end → user → case manager → gov
     - User talks to AI → AI makes a summary, fills out report, gets suggested program recommendations → sends it to a case manager who reviews and approves the recommendations → back end then gets the approved recommendations and attempts to fill in any info it can on the applications for the user → user confirms auto-filled info is correct and fills in any missing info → filled-in applications go to the case manager for a final audit → audited applications are sent to the agency they came from
  2. **Option 2:** User → back end → User → case manager audit → gov
     - Same as Option 1 but without the step "sends it to a case manager who then reviews and approves the recommendations" — instead, the AI would send the documentation straight to the user.

- **Documentation** — documents for government assistance, access of documents
- **Summarization**
- **Storage**
- **Final sign-off comes from human employee**

### POC workflow / human review question

We want to clarify where human review should happen in the workflow.

- **Option 1:** The user talks to the AI, the AI creates a summary and suggested program recommendations, and a case manager reviews/approves those recommendations before anything is sent back to the user. After that, the system can help pre-fill applications, the user confirms or completes missing information, and the case manager does a final audit before submission.
- **Option 2:** The user talks to the AI, the AI creates a summary and suggested program recommendations, and those recommendations go directly back to the user without initial case manager review. The case manager would then review later, before final submission.

### Program scope / recommendation data question

We also want to clarify what specific programs or assistance categories are in scope for the application, and whether program recommendation is part of the intended workflow.

If recommendations are in scope, we need to understand:

- Which programs or program categories we should target first
- Whether this includes government programs, nonprofit resources, or both
- What data source we would use to power those recommendations (program thresholds — e.g., <$40k/year, age, etc?)
- Whether you already have a dataset, directory, or partner resource list we should work from, or if you expect us to help build that data layer

### Case manager portal / employee workflow question

We also want to clarify what you want included in the employee-facing side of the application.

Right now, our outline includes:

- An AI-generated summary
- The full conversation transcript
- Case information collected during intake
- A high-risk / urgency flag

We want to better understand what staff would actually need to see and do in that portal.

**Question:** What information, tools, or actions would you want available to employees inside the case manager portal? For example, are there other fields, notes, review steps, status updates, document handling, communication tools, or case actions you would want included?

---

## Meeting 2

### Picked Option 1

**Option 1:** The user talks to the AI, the AI creates a summary and suggested program recommendations, and a case manager reviews/approves those recommendations before anything is sent back to the user. After that, the system can help pre-fill applications, the user confirms or completes missing information, and the case manager does a final audit before submission.

```
User → AI → CM → AI → user → CM → org
```

With AI giving a few hard-coded approved resources immediately.

Ensure that AI discretion is used; let the user know it's human-in-the-loop ("Hope Connector").

1. **1st** — general questionnaire with AI
2. **2nd** — generate report
3. **3rd** — "complementary" meeting with the case manager ("Hope Connector" / real human calls)

### Notes

- Ensure ease — like "breathe", "calm down", "we're here", etc.
- Have a progress bar that displays the user's progress in the program
- Offer immediate help
- Give each person a **"help score"**
- Drop-down questions with a comment section that has no char length limit
- Multilingual — Spanish and English, for sure

### Quinn's slice

- AI Comments
- Severity levels and key words
- Admin route page
- Reporting

### Questions moving forward

(See sprint plan below.)

### Sprint 1 (Apr 22 – May ~20)

**Ted:**

- Landing page
  - CTA
  - About us
  - Contact us
- Questionnaire page
  - Dropdown / questions
  - <https://docs.google.com/document/d/1scRFoczf2wiwjpieSqNI7tBmei1Uj0gww1lXXY52GmM/edit?usp=sharing>
- Reporting
- Questionnaire page layout
  - Top
  - 17 questions with selectors 1–5
  - Comment section
- Use LLM to have a conversation with user OR just have the user type out their situation and use AI for summary and triage

---

## Meeting 3 (May 20th, 2026 — 10 AM)

### Plan

- Demo
- Q&A (both ways)
- Propose TODOs

### Questions

- User accounts or just admin accounts?
- Keep LLM text/chat help agent?
- Are the questions on the questionnaire good enough?
- Do we need to follow any HIPAA/PHI guidelines while creating this?
- What welfare programs are we working with?

### TODOs

- **Accessibility**
  - Spanish
  - Standard accessibility like text-to-speech and text size
- **Split sides**
  - Client
  - Case manager
- **Donate??**
  - Can users donate, or is it through 3rd parties?
- **Theme change?**
  - Any theme changes
- **Question changes**
  - Change the questions to something else maybe??
- **Implement documentation** — forms for welfare programs
- **User plans** — getting the client from new to helped

### Notes from meeting

_(to be filled in)_
