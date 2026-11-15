# Data Protection Impact Assessment — working draft

> **Status: DRAFT prepared from the implementation, for completion and sign-off by the Data Protection Officer and qualified Nigerian counsel.** It records what the software actually does, so the assessment starts from facts. It isn't itself a completed DPIA or a statement of compliance. ⚖️ marks judgements that only counsel or the DPO can make.

## 1. Processing description

| Item | As implemented |
|---|---|
| Purpose | Give individuals continuous access to their health records; let verified institutions request scoped, time-limited access and submit records |
| Data subjects | Patients (including minors via verified representatives), representatives, healthcare professionals, institution staff, platform staff |
| Personal data | Identity: name, DOB, sex, phone, email, platform Health ID, NIN (stored only as an HMAC plus last 4 digits). Health: records in 11 categories, documents, structured results. Security: sessions, IPs, devices, access and audit logs |
| Special category | Health data — all of it |
| Sources | Patients (uploads, profile), institutions (submissions), hospital systems (FHIR integrations), identity verification provider ⚖️ |
| Recipients | Institutions only under an active permission or emergency access; processors (hosting, email, SMS, identity) ⚖️ |
| Retention | Configurable (`retention.*` settings). Periods per record type ⚖️ |
| Transfers | Depends on hosting region and processors ⚖️ |

## 2. Lawful basis (NDPA 2023) ⚖️

The system records a basis on every access grant (`authorization_basis`):

| Activity | Basis in the system | Counsel to confirm |
|---|---|---|
| Patient sharing with an institution | `patient_consent` / `representative_consent` with a versioned consent text | ⚖️ |
| Emergency access | `emergency_access` (vital interests), time-limited and reviewed | ⚖️ |
| Institution submitting its own clinical records | Care relationship / institutional record-keeping duty | ⚖️ |
| Security logging and fraud prevention | Legitimate interests / legal obligation | ⚖️ |
| Identity verification | ⚖️ | ⚖️ |

## 3. Necessity and proportionality

- Minimum necessary: requests are category-, date- and duration-scoped; patients can narrow them further; emergency access is limited to five categories for 12 hours.
- Search returns a masked identity only. Finding a patient grants nothing.
- Administrators can't read clinical content.
- NIN is never stored in clear text.

## 4. Risks and controls

| Risk to individuals | Likelihood / severity ⚖️ | Controls in the product | Residual ⚖️ |
|---|---|---|---|
| Unauthorised clinical access by staff | | Permission checks on every read; RLS; every attempt logged and visible to the patient; anomaly detection | |
| Insider misuse by platform staff | | No clinical access path; step-up MFA; audited admin actions; hash-chained audit | |
| Account takeover | | argon2id, lockout, MFA (mandatory for staff), new-device alerts, breached-password check | |
| Misattributed records (wrong patient) | | Verified identity before matching; exact identifiers; duplicate detection; patient dispute flow | |
| Loss or exposure of documents | | Encrypted at rest with key rotation; no public URLs; malware scanning; tested backups | |
| Minors and representatives | | Representatives only after document verification; every action recorded under the representative's own name | |
| Copies outside the platform | | Patient warned before export; external copies can't be recalled, and this is stated plainly | |

## 5. Data subject rights

Access and portability: in-app record view, plus export as a PDF summary or FHIR. Rectification: correction requests and profile correction tickets. Erasure and closure: an account-closure request with a retention review ⚖️. Objection and complaint: support ticket and DPO contact ⚖️.

## 6. Sign-off

| Role | Name | Decision | Date |
|---|---|---|---|
| Data Protection Officer | | | |
| Legal counsel | | | |
| Product owner | | | |
