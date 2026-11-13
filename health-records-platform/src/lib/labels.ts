import type { IconName } from "@/components/ui/icon-paths";
import type { Tone } from "@/components/ui/badge";

export const CATEGORY: Record<string, { label: string; singular: string; icon: IconName }> = {
  consultation: { label: "Consultations", singular: "Consultation", icon: "stethoscope" },
  diagnosis: { label: "Diagnoses", singular: "Diagnosis", icon: "diagnosis" },
  lab_result: { label: "Laboratory results", singular: "Lab result", icon: "science" },
  prescription: { label: "Prescriptions", singular: "Prescription", icon: "medication" },
  imaging: { label: "Medical imaging", singular: "Imaging", icon: "radiology" },
  procedure: { label: "Procedures & surgeries", singular: "Procedure", icon: "procedure" },
  admission: { label: "Hospital admissions", singular: "Admission", icon: "bed" },
  discharge_summary: { label: "Discharge summaries", singular: "Discharge summary", icon: "exit_to_app" },
  vaccination: { label: "Vaccinations", singular: "Vaccination", icon: "vaccines" },
  allergy: { label: "Allergies", singular: "Allergy", icon: "allergy" },
  other: { label: "Other documents", singular: "Document", icon: "description" },
};
export const CATEGORY_KEYS = Object.keys(CATEGORY);
export const categoryLabel = (k: string) => CATEGORY[k]?.label ?? k;

export const PURPOSE: Record<string, { label: string; description: string }> = {
  ongoing_care: { label: "Ongoing care", description: "Continuing treatment you are already receiving" },
  referral: { label: "Referral", description: "You were referred to this institution" },
  specialist_consultation: { label: "Specialist consultation", description: "A specialist review of your condition" },
  diagnostic_review: { label: "Diagnostic review", description: "Reviewing previous tests or imaging" },
  second_opinion: { label: "Second opinion", description: "Another clinician reviewing your diagnosis or plan" },
  follow_up: { label: "Follow-up", description: "Following up after earlier treatment" },
  emergency_care: { label: "Emergency care", description: "Urgent treatment where you could not be asked" },
  other: { label: "Other", description: "See the explanation provided" },
};
export const purposeLabel = (k: string) => PURPOSE[k]?.label ?? k;

/** Provenance — the single most important trust signal on a record. */
export const SOURCE: Record<string, { label: string; short: string; tone: Tone; icon: IconName; explain: string }> = {
  institution_submission: {
    label: "Submitted by a verified institution", short: "Verified institution", tone: "success", icon: "verified",
    explain: "Added directly by a healthcare institution verified on the platform, with the submitting professional recorded.",
  },
  integration: {
    label: "Received through an approved integration", short: "Approved integration", tone: "info", icon: "share",
    explain: "Sent automatically from the institution's own records system through an approved connection.",
  },
  patient_upload: {
    label: "Uploaded by you — not medically verified", short: "Uploaded by patient", tone: "sand", icon: "upload_file",
    explain: "A document you uploaded. It hasn't been checked by a healthcare institution, and providers will see it labelled this way.",
  },
  administrative_migration: {
    label: "Migrated from a previous system", short: "Migrated", tone: "neutral", icon: "history",
    explain: "Imported from an earlier system by the platform team.",
  },
};

export const RECORD_STATUS: Record<string, { label: string; tone: Tone }> = {
  available: { label: "Available", tone: "success" },
  pending_processing: { label: "Processing", tone: "info" },
  under_review: { label: "Under review", tone: "warning" },
  superseded: { label: "Superseded", tone: "neutral" },
  restricted: { label: "Restricted", tone: "neutral" },
  entered_in_error: { label: "Marked as error", tone: "danger" },
};

export const REQUEST_STATUS: Record<string, { label: string; tone: Tone }> = {
  pending: { label: "Awaiting response", tone: "warning" },
  approved: { label: "Approved", tone: "success" },
  partially_approved: { label: "Partly approved", tone: "success" },
  rejected: { label: "Declined", tone: "neutral" },
  expired: { label: "Expired", tone: "neutral" },
  cancelled: { label: "Withdrawn", tone: "neutral" },
};

export const PERMISSION_STATUS: Record<string, { label: string; tone: Tone }> = {
  active: { label: "Active", tone: "success" },
  expired: { label: "Expired", tone: "neutral" },
  revoked: { label: "Revoked", tone: "danger" },
  suspended: { label: "Paused", tone: "warning" },
};

export const BASIS: Record<string, string> = {
  patient_consent: "Your consent",
  representative_consent: "Consent from your representative",
  emergency_access: "Emergency access (reviewed)",
  legal_obligation: "Legal obligation",
};

export const VERIFICATION: Record<string, { label: string; tone: Tone; icon: IconName }> = {
  unverified: { label: "Not verified", tone: "neutral", icon: "help" },
  pending: { label: "Verification pending", tone: "warning", icon: "hourglass_top" },
  under_review: { label: "Under review", tone: "warning", icon: "hourglass_top" },
  verified: { label: "Identity verified", tone: "success", icon: "verified_user" },
  failed: { label: "Verification failed", tone: "danger", icon: "error" },
};

export const INSTITUTION_STATUS: Record<string, { label: string; tone: Tone }> = {
  draft: { label: "Draft", tone: "neutral" },
  submitted: { label: "Submitted", tone: "info" },
  under_review: { label: "Under review", tone: "warning" },
  approved: { label: "Verified", tone: "success" },
  rejected: { label: "Not approved", tone: "danger" },
  suspended: { label: "Suspended", tone: "danger" },
};

export const PRO_STATUS: Record<string, { label: string; tone: Tone }> = {
  unverified: { label: "No licence on file", tone: "neutral" },
  pending: { label: "Licence pending", tone: "warning" },
  verified: { label: "Licence verified", tone: "success" },
  rejected: { label: "Licence rejected", tone: "danger" },
  suspended: { label: "Suspended", tone: "danger" },
};

export const INSTITUTION_TYPE: Record<string, string> = {
  hospital: "Hospital", clinic: "Clinic", laboratory: "Laboratory", diagnostic_centre: "Diagnostic centre",
  primary_health_centre: "Primary health centre", pharmacy: "Pharmacy",
};

export const PROFESSION: Record<string, string> = {
  medical_doctor: "Medical doctor", dentist: "Dentist", nurse_midwife: "Nurse / midwife", pharmacist: "Pharmacist",
  medical_lab_scientist: "Medical laboratory scientist", radiographer: "Radiographer",
  health_records_officer: "Health records officer", administrator: "Administrator", other: "Other",
};

export const LICENSE_BODIES = [
  { value: "MDCN", label: "MDCN — Medical and Dental Council of Nigeria" },
  { value: "NMCN", label: "NMCN — Nursing and Midwifery Council of Nigeria" },
  { value: "PCN", label: "PCN — Pharmacy Council of Nigeria" },
  { value: "MLSCN", label: "MLSCN — Medical Laboratory Science Council of Nigeria" },
  { value: "RRBN", label: "RRBN — Radiographers Registration Board of Nigeria" },
  { value: "HRORBN", label: "HRORBN — Health Records Officers Registration Board of Nigeria" },
];

export const TICKET_CATEGORY: Record<string, string> = {
  account_access: "I can't access my account", identity_verification: "Identity verification",
  identity_reconciliation: "Identity or representative check", duplicate_account: "Duplicate account",
  profile_correction: "Correct my personal details", record_correction: "A record is wrong",
  suspicious_activity: "Suspicious activity", data_subject_request: "Request a copy of my data",
  account_closure: "Close my account", institution_verification: "Institution verification", technical: "Technical problem",
  other: "Something else",
};

export const TICKET_STATUS: Record<string, { label: string; tone: Tone }> = {
  open: { label: "Open", tone: "info" }, in_progress: { label: "In progress", tone: "warning" },
  awaiting_requester: { label: "Waiting for you", tone: "warning" }, resolved: { label: "Resolved", tone: "success" },
  closed: { label: "Closed", tone: "neutral" },
};

export const INCIDENT_STATUS: Record<string, { label: string; tone: Tone }> = {
  open: { label: "Open", tone: "danger" }, investigating: { label: "Investigating", tone: "warning" },
  contained: { label: "Contained", tone: "info" }, resolved: { label: "Resolved", tone: "success" }, dismissed: { label: "Dismissed", tone: "neutral" },
};

export const SEVERITY: Record<string, Tone> = { low: "neutral", medium: "info", high: "warning", critical: "danger" };

export const DENIAL_REASON: Record<string, string> = {
  no_active_permission: "No active permission", outside_permission_scope: "Outside the approved scope",
  institution_not_approved: "Institution not verified", professional_not_verified: "Licence not verified",
  no_affiliation: "Not a member of the institution", affiliation_suspended: "Staff access suspended",
  missing_capability: "Role not permitted", not_a_professional: "Not a healthcare professional",
  account_inactive: "Account inactive", rate_limited: "Too many searches", record_not_found: "Record not found",
  emergency_limit_reached: "Emergency access limit reached", file_not_available: "File not available", not_found: "Not found",
};
