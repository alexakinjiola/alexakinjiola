-- ===========================================================================
-- 007 — Reference data (safe for every environment; contains no personal data)
-- ===========================================================================

insert into medical_record_categories(key, label, description, sort_order, timeline) values
  ('consultation',      'Consultations',            'Clinic visits, reviews and doctor notes',                   1, true),
  ('diagnosis',         'Diagnoses',                'Confirmed or working diagnoses',                            2, true),
  ('lab_result',        'Laboratory results',       'Blood tests, urinalysis, cultures and other lab reports',   3, true),
  ('prescription',      'Prescriptions',            'Medicines prescribed, doses and durations',                 4, true),
  ('imaging',           'Medical imaging',          'X-ray, ultrasound, CT, MRI reports and images',             5, true),
  ('procedure',         'Procedures & surgeries',   'Operations and clinical procedures',                        6, true),
  ('admission',         'Hospital admissions',      'Inpatient stays and ward admissions',                       7, true),
  ('discharge_summary', 'Discharge summaries',      'Summaries written when leaving hospital',                   8, true),
  ('vaccination',       'Vaccinations',             'Immunisation records',                                      9, true),
  ('allergy',           'Allergies',                'Known allergies and adverse reactions',                    10, true),
  ('other',             'Other documents',          'Anything that does not fit another category',              11, false)
on conflict (key) do nothing;

insert into roles(key, scope, name, description, capabilities) values
  ('platform_admin',   'platform',    'Platform administrator', 'Verifies institutions and professionals, manages settings and patient account support. No clinical access.',
     '{institutions:review,professionals:review,patients:support,settings:manage}'),
  ('security_officer', 'platform',    'Security officer',       'Monitors access, investigates incidents and reviews emergency access. No clinical access.',
     '{security:monitor,audit:read,emergency:review}'),
  ('support_agent',    'platform',    'Support agent',          'Handles patient and institution support requests. No clinical access.',
     '{support:manage,patients:support}'),
  ('institution_admin','institution', 'Institution administrator', 'Manages staff, institution profile and activity. Non-clinical by default.',
     '{staff:manage,institution:manage,activity:view,integrations:manage}'),
  ('clinician',        'institution', 'Clinician',              'Doctors, nurses and other licensed clinicians who treat patients.',
     '{access:request,records:view_authorized,records:submit,emergency:access}'),
  ('lab_scientist',    'institution', 'Laboratory scientist',   'Submits laboratory results and views authorised history.',
     '{access:request,records:view_authorized,records:submit}'),
  ('records_officer',  'institution', 'Health records officer', 'Submits records on behalf of the institution. Cannot view patient history.',
     '{records:submit,access:request}')
on conflict (key) do nothing;

insert into consent_versions(key, version, title, body) values
  ('access_grant', 1, 'Sharing your records with a healthcare institution',
   'When you approve a request, the institution named in the request can view the categories of records you choose, for the dates and duration you choose, for the purpose they stated. ' ||
   'Every view and download is recorded in your activity history. You can revoke access at any time and it ends immediately on the platform. ' ||
   'Information the institution has already downloaded, printed or copied into its own systems cannot be automatically recalled. The institution remains bound by medical confidentiality.')
on conflict (key, version) do nothing;

insert into platform_settings(key, value, description) values
  ('access.request_expiry_days',            '7',   'Days a patient has to answer an access request before it expires.'),
  ('access.max_permission_days',            '180', 'Longest duration a provider may request.'),
  ('emergency.max_hours',                   '12',  'Hours emergency access remains valid.'),
  ('emergency.max_per_professional_per_day','3',   'Emergency accesses one professional may initiate in 24 hours.'),
  ('emergency.allowed_categories',          '["allergy","diagnosis","prescription","vaccination","discharge_summary"]', 'Minimum-necessary categories available through emergency access.'),
  ('security.denied_attempts_threshold',    '5',   'Denied attempts in 10 minutes that open an automated incident.'),
  ('security.patients_per_hour_threshold',  '25',  'Distinct patients viewed per hour before an unusual-access incident is opened.'),
  ('security.searches_per_10_minutes',      '30',  'Patient searches a professional may run in 10 minutes.'),
  ('retention.audit_years',                 '10',  'Minimum audit retention in years. CONFIRM WITH COUNSEL.'),
  ('retention.closed_account_days',         '30',  'Grace period before a closed patient account is de-identified. CONFIRM WITH COUNSEL.')
on conflict (key) do nothing;

insert into policy_documents(key, version, title, body, requires_legal_review) values
  ('privacy_notice', 1, 'Privacy notice (draft)',
   'DRAFT — requires review by qualified Nigerian privacy counsel before production use. ' ||
   'We process your personal and health information to give you access to your records, to let you control who else can see them, and to keep an accurate history of who accessed them. ' ||
   'Depending on the activity, the legal basis may be your consent, the performance of healthcare services, vital interests in an emergency, or a legal obligation. ' ||
   'You can ask to access, correct or export your information, and to close your account, subject to medical record retention requirements.', true),
  ('retention_policy', 1, 'Record retention (draft)',
   'DRAFT — retention periods for each record type must be confirmed against applicable Nigerian clinical record-keeping requirements.', true),
  ('emergency_access_policy', 1, 'Emergency access policy (draft)',
   'DRAFT — emergency access is limited to verified clinicians at approved institutions, requires a written justification, is limited to minimum-necessary categories for a short window, notifies the patient and is reviewed after the fact by the platform security team.', true)
on conflict (key, version) do nothing;
