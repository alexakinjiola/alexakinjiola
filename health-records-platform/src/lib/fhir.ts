/**
 * Minimal HL7 FHIR R4 mapping.
 *
 *  • fromFhirBundle(): incoming Bundle (transaction / collection / batch) from a
 *    hospital system → normalised records for app.integration_ingest().
 *  • toFhirBundle(): a patient's export → a FHIR "collection" Bundle.
 *
 * Deliberately conservative: unknown resource types are reported, never
 * guessed. Terminology (ICD-10, LOINC, SNOMED CT) is carried through as-is
 * from codings; no clinical interpretation is added.
 */

type Coding = { system?: string; code?: string; display?: string };
type CodeableConcept = { text?: string; coding?: Coding[] };
type Resource = { resourceType: string; id?: string; [k: string]: unknown };

export interface NormalisedRecord {
  source_ref: string;
  category: string;
  title: string;
  description: string;
  clinical_date: string | null;
  practitioner: string | null;
  structured_data: unknown;
  /** Raw inline documents (base64) — validated, scanned and stored by the server before ingestion. */
  attachments?: { title: string; contentType: string; data: string }[];
}

type Attachment = { contentType?: string; data?: string; title?: string; url?: string };
const inlineAttachments = (list: Attachment[] | undefined, fallbackTitle: string) =>
  (list ?? []).filter((a) => typeof a?.data === "string" && a.data.length > 0)
    .map((a, i) => ({ title: a.title ?? `${fallbackTitle}${i ? `-${i + 1}` : ""}`, contentType: a.contentType ?? "application/octet-stream", data: a.data! }));

const conceptText = (c?: CodeableConcept) => c?.text ?? c?.coding?.find((x) => x.display)?.display ?? c?.coding?.[0]?.code ?? "";
const codingList = (c?: CodeableConcept) => (c?.coding ?? []).map((x) => [x.system, x.code, x.display].filter(Boolean).join(" | ")).join("; ");
const dateOf = (...v: unknown[]) => {
  for (const x of v) if (typeof x === "string" && /^\d{4}-\d{2}-\d{2}/.test(x)) return x.slice(0, 10);
  return null;
};
const practitionerOf = (r: Resource) => {
  const refs = [r.performer, r.recorder, r.requester, r.asserter, r.author].flat().filter(Boolean) as { display?: string }[];
  return refs.find((p) => p?.display)?.display ?? null;
};

/** Patient Health ID from a Patient resource or a reference identifier. */
export function healthIdFromBundle(bundle: { entry?: { resource?: Resource }[] }): string | null {
  for (const e of bundle.entry ?? []) {
    const r = e.resource;
    if (r?.resourceType !== "Patient") continue;
    const ids = (r.identifier as { system?: string; value?: string }[] | undefined) ?? [];
    const hid = ids.find((i) => i.system?.includes("health-id") || /^NG\d{10}$/.test(String(i.value ?? "").replace(/\s/g, "")));
    if (hid?.value) return hid.value.replace(/\s/g, "").toUpperCase();
  }
  return null;
}

export function fromFhirBundle(bundle: unknown): { records: NormalisedRecord[]; unsupported: string[] } {
  const b = bundle as { resourceType?: string; type?: string; entry?: { resource?: Resource }[] };
  if (b?.resourceType !== "Bundle" || !Array.isArray(b.entry)) throw new Error("Expected a FHIR Bundle with entries.");
  const records: NormalisedRecord[] = [];
  const unsupported: string[] = [];
  const observationsByReport = new Map<string, Resource[]>();
  const all = b.entry.map((e) => e.resource).filter(Boolean) as Resource[];
  for (const r of all) if (r.resourceType === "Observation" && r.id) observationsByReport.set(r.id, [r]);

  const obsResult = (o: Resource) => {
    const q = o.valueQuantity as { value?: number; unit?: string } | undefined;
    const range = (o.referenceRange as { text?: string; low?: { value?: number }; high?: { value?: number } }[] | undefined)?.[0];
    const interp = conceptText((o.interpretation as CodeableConcept[] | undefined)?.[0]).toLowerCase();
    return {
      test: conceptText(o.code as CodeableConcept),
      value: q?.value ?? (o.valueString as string) ?? conceptText(o.valueCodeableConcept as CodeableConcept),
      unit: q?.unit ?? "",
      reference: range?.text ?? (range?.low || range?.high ? `${range?.low?.value ?? ""}–${range?.high?.value ?? ""}` : undefined),
      flag: /high|^h$/.test(interp) ? "high" : /low|^l$/.test(interp) ? "low" : interp ? "normal" : undefined,
    };
  };
  const usedObs = new Set<string>();

  for (const r of all) {
    const ref = `${r.resourceType}/${r.id ?? crypto.randomUUID()}`;
    const push = (category: string, title: string, description: string, date: string | null, structured: unknown = null, attachments?: NormalisedRecord["attachments"]) =>
      records.push({ source_ref: ref, category, title: title || r.resourceType, description, clinical_date: date, practitioner: practitionerOf(r), structured_data: structured,
        ...(attachments?.length ? { attachments } : {}) });

    switch (r.resourceType) {
      case "Patient":
        break;
      case "DiagnosticReport": {
        const results = ((r.result as { reference?: string }[] | undefined) ?? [])
          .map((x) => x.reference?.split("/").pop())
          .flatMap((id) => { if (id) usedObs.add(id); return observationsByReport.get(id ?? "") ?? []; })
          .map(obsResult);
        const isImaging = conceptText((r.category as CodeableConcept[] | undefined)?.[0]).toLowerCase().includes("imag");
        push(isImaging ? "imaging" : "lab_result", conceptText(r.code as CodeableConcept), (r.conclusion as string) ?? "",
          dateOf(r.effectiveDateTime, r.issued), results.length ? { results } : null,
          inlineAttachments(r.presentedForm as Attachment[] | undefined, conceptText(r.code as CodeableConcept) || "report"));
        break;
      }
      case "Condition":
        push("diagnosis", conceptText(r.code as CodeableConcept), [codingList(r.code as CodeableConcept), conceptText(r.clinicalStatus as CodeableConcept)].filter(Boolean).join(" · "),
          dateOf(r.onsetDateTime, r.recordedDate));
        break;
      case "MedicationRequest":
      case "MedicationStatement": {
        const name = conceptText((r.medicationCodeableConcept as CodeableConcept) ?? undefined);
        const dose = (r.dosageInstruction ?? r.dosage) as { text?: string }[] | undefined;
        push("prescription", name, dose?.[0]?.text ?? "", dateOf(r.authoredOn, r.effectiveDateTime),
          { medications: [{ name, dose: dose?.[0]?.text ?? "", frequency: "" }] });
        break;
      }
      case "AllergyIntolerance":
        push("allergy", `${conceptText(r.code as CodeableConcept)} allergy`,
          ((r.reaction as { manifestation?: CodeableConcept[] }[] | undefined) ?? []).flatMap((x) => x.manifestation ?? []).map(conceptText).join(", "),
          dateOf(r.recordedDate, r.onsetDateTime));
        break;
      case "Immunization":
        push("vaccination", conceptText(r.vaccineCode as CodeableConcept), (r.lotNumber as string) ? `Lot ${r.lotNumber}` : "", dateOf(r.occurrenceDateTime));
        break;
      case "Procedure":
        push("procedure", conceptText(r.code as CodeableConcept), "", dateOf(r.performedDateTime, (r.performedPeriod as { start?: string })?.start));
        break;
      case "Encounter": {
        const cls = (r.class as Coding | undefined)?.code;
        const period = r.period as { start?: string; end?: string } | undefined;
        push(cls === "IMP" ? "admission" : "consultation", conceptText((r.type as CodeableConcept[] | undefined)?.[0]) || (cls === "IMP" ? "Hospital admission" : "Consultation"),
          conceptText((r.reasonCode as CodeableConcept[] | undefined)?.[0]), dateOf(period?.start));
        break;
      }
      case "Composition":
      case "DocumentReference":
        push(conceptText(r.type as CodeableConcept).toLowerCase().includes("discharge") ? "discharge_summary" : "other",
          (r.title as string) ?? (r.description as string) ?? conceptText(r.type as CodeableConcept), (r.description as string) ?? "", dateOf(r.date), null,
          inlineAttachments(((r.content as { attachment?: Attachment }[] | undefined) ?? []).map((c) => c.attachment!).filter(Boolean),
            (r.title as string) ?? "document"));
        break;
      case "Observation":
        break; // handled below
      default:
        unsupported.push(r.resourceType);
    }
  }
  // Stand-alone observations (not referenced by a report) become individual lab results.
  for (const r of all) {
    if (r.resourceType !== "Observation" || (r.id && usedObs.has(r.id))) continue;
    const res = obsResult(r);
    records.push({ source_ref: `Observation/${r.id ?? crypto.randomUUID()}`, category: "lab_result", title: res.test || "Observation",
      description: "", clinical_date: dateOf(r.effectiveDateTime, r.issued), practitioner: practitionerOf(r), structured_data: { results: [res] } });
  }
  return { records, unsupported: [...new Set(unsupported)] };
}

// ---------------------------------------------------------------------------
// Export
// ---------------------------------------------------------------------------
type ExportRecord = {
  id: string; category: string; title: string; description: string | null; clinical_date: string | null; added_at: string;
  source: string; verification_status: string; institution: string | null; professional: string | null; facility: string | null;
  structured_data: { results?: { test: string; value: unknown; unit?: string; reference?: string; flag?: string }[]; medications?: { name: string; dose: string }[] } | null;
};
type ExportPayload = { generated_at: string; patient: { id: string; full_name: string; date_of_birth: string; sex: string; health_id: string }; records: ExportRecord[] };

const SEX: Record<string, string> = { female: "female", male: "male", intersex: "other", undisclosed: "unknown" };

export function toFhirBundle(p: ExportPayload, baseUrl: string) {
  const patientRef = `Patient/${p.patient.id}`;
  const prov = (r: ExportRecord) => ({
    extension: [{ url: `${baseUrl}/fhir/StructureDefinition/record-provenance`, valueString: r.source }],
    meta: { tag: [{ system: `${baseUrl}/fhir/verification`, code: r.verification_status }] },
  });
  const entries: object[] = [{
    fullUrl: `urn:uuid:${p.patient.id}`,
    resource: { resourceType: "Patient", id: p.patient.id, identifier: [{ system: `${baseUrl}/fhir/health-id`, value: p.patient.health_id }],
      name: [{ text: p.patient.full_name }], birthDate: String(p.patient.date_of_birth).slice(0, 10), gender: SEX[p.patient.sex] ?? "unknown" },
  }];
  for (const r of p.records) {
    const date = r.clinical_date ? String(r.clinical_date).slice(0, 10) : undefined;
    const note = r.description ? [{ text: r.description }] : undefined;
    const base = { id: r.id, subject: { reference: patientRef }, ...prov(r) };
    let res: object;
    switch (r.category) {
      case "diagnosis": res = { resourceType: "Condition", ...base, code: { text: r.title }, recordedDate: date, note }; break;
      case "allergy": res = { resourceType: "AllergyIntolerance", ...base, patient: { reference: patientRef }, code: { text: r.title }, recordedDate: date, note }; break;
      case "vaccination": res = { resourceType: "Immunization", ...base, patient: { reference: patientRef }, status: "completed", vaccineCode: { text: r.title }, occurrenceDateTime: date, note }; break;
      case "procedure": res = { resourceType: "Procedure", ...base, status: "completed", code: { text: r.title }, performedDateTime: date, note }; break;
      case "prescription": res = { resourceType: "MedicationStatement", ...base, status: "recorded", medicationCodeableConcept: { text: r.structured_data?.medications?.[0]?.name ?? r.title },
        dosage: r.structured_data?.medications?.map((m) => ({ text: m.dose })), effectiveDateTime: date, note }; break;
      case "lab_result":
      case "imaging": res = { resourceType: "DiagnosticReport", ...base, status: "final", category: [{ text: r.category === "imaging" ? "Imaging" : "Laboratory" }],
        code: { text: r.title }, effectiveDateTime: date, conclusion: r.description ?? undefined,
        contained: r.structured_data?.results?.map((x, i) => ({ resourceType: "Observation", id: `obs${i}`, status: "final", code: { text: x.test },
          ...(typeof x.value === "number" ? { valueQuantity: { value: x.value, unit: x.unit } } : { valueString: String(x.value) }),
          referenceRange: x.reference ? [{ text: x.reference }] : undefined })) }; break;
      default: res = { resourceType: "DocumentReference", ...base, status: "current", type: { text: r.category }, description: r.title, date: r.added_at,
        content: [{ attachment: { title: r.title } }] };
    }
    entries.push({ fullUrl: `urn:uuid:${r.id}`, resource: res });
  }
  return { resourceType: "Bundle", type: "collection", timestamp: p.generated_at, entry: entries };
}
