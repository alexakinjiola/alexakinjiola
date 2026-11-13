import "server-only";
import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";

type Rec = { category: string; title: string; description: string | null; clinical_date: string | null; source: string;
  institution: string | null; facility: string | null; professional: string | null;
  structured_data: { results?: { test: string; value: unknown; unit?: string; reference?: string; flag?: string }[]; medications?: { name: string; dose: string; frequency?: string }[] } | null };
type Payload = { generated_at: string; patient: { full_name: string; date_of_birth: string; sex: string; health_id: string }; records: Rec[] };

const CATEGORY: Record<string, string> = { allergy: "Allergies", diagnosis: "Diagnoses", prescription: "Prescriptions", lab_result: "Laboratory results",
  imaging: "Medical imaging", procedure: "Procedures & surgeries", admission: "Hospital admissions", discharge_summary: "Discharge summaries",
  vaccination: "Vaccinations", consultation: "Consultations", other: "Other documents" };
// Safety-critical sections first, like a clinical summary.
const ORDER = ["allergy", "diagnosis", "prescription", "lab_result", "imaging", "procedure", "admission", "discharge_summary", "vaccination", "consultation", "other"];
const SOURCE: Record<string, string> = { institution_submission: "Verified institution", integration: "Approved integration", patient_upload: "Uploaded by patient (not verified)", administrative_migration: "Migrated" };

const INK = rgb(0.075, 0.137, 0.227), MUTED = rgb(0.353, 0.396, 0.455), BRAND = rgb(0.059, 0.431, 0.361), LINE = rgb(0.89, 0.87, 0.83);
const fmt = (d: string | null) => d ? new Date(`${String(d).slice(0, 10)}T12:00:00Z`).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "Date unknown";
// Standard PDF fonts are WinAnsi; strip characters they cannot encode rather than failing.
// Superscript exponents (e.g. ×10⁹/L) must never collapse into ordinary digits ("109/L") — that changes a clinical value.
// So they are rewritten as ^n BEFORE Unicode normalisation (NFKD/NFKC would silently turn ⁹ into 9).
const SUPERSCRIPT: Record<string, string> = { "⁰": "0", "¹": "1", "²": "2", "³": "3", "⁴": "4", "⁵": "5", "⁶": "6", "⁷": "7", "⁸": "8", "⁹": "9", "⁻": "-" };
export const pdfSafeText = (s: string) => s
  .replace(/[⁰¹²³⁴⁵⁶⁷⁸⁹⁻]+/g, (m) => "^" + [...m].map((c) => SUPERSCRIPT[c]).join(""))
  .normalize("NFKC")
  .replace(/[^\x20-\x7E\u00A0-\u00FF]/g, (c) => ({ "–": "-", "—": "-", "‘": "'", "’": "'", "“": '"', "”": '"', "•": "-" } as Record<string, string>)[c] ?? "?");

export async function renderSummaryPdf(p: Payload) {
  const doc = await PDFDocument.create();
  doc.setTitle(`Health record summary — ${pdfSafeText(p.patient.full_name)}`);
  doc.setProducer("Continuum personal health record");
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const W = 595, H = 842, M = 48;
  let page: PDFPage = doc.addPage([W, H]);
  let y = H - M;

  const newPage = () => { page = doc.addPage([W, H]); y = H - M; };
  const ensure = (h: number) => { if (y - h < M + 30) newPage(); };
  const wrap = (text: string, f: PDFFont, size: number, width: number) => {
    const words = pdfSafeText(text).split(/\s+/); const lines: string[] = []; let line = "";
    for (const w of words) { const t = line ? `${line} ${w}` : w; if (f.widthOfTextAtSize(t, size) > width && line) { lines.push(line); line = w; } else line = t; }
    if (line) lines.push(line); return lines;
  };
  const text = (s: string, x: number, size = 10, f = font, color = INK) => page.drawText(pdfSafeText(s), { x, y, size, font: f, color });

  // Header
  text("PERSONAL HEALTH RECORD SUMMARY", M, 9, bold, BRAND); y -= 26;
  text(p.patient.full_name, M, 20, bold); y -= 20;
  text(`Born ${fmt(p.patient.date_of_birth)}  ·  Health ID ${p.patient.health_id}  ·  Generated ${new Date(p.generated_at).toLocaleString("en-GB", { timeZone: "Africa/Lagos" })}`.replace(/·/g, "|"), M, 9, font, MUTED);
  y -= 16;
  for (const l of wrap("This summary contains records available on the platform and may not be a complete medical history. Each entry shows its source. Documents uploaded by the patient have not been verified by a healthcare institution.", font, 8.5, W - 2 * M)) { text(l, M, 8.5, font, MUTED); y -= 11; }
  y -= 6; page.drawLine({ start: { x: M, y }, end: { x: W - M, y }, thickness: 1, color: LINE }); y -= 20;

  for (const cat of ORDER) {
    const recs = p.records.filter((r) => r.category === cat);
    if (!recs.length) continue;
    ensure(80); // keep a heading with at least its first entry
    text(CATEGORY[cat] ?? cat, M, 12, bold, BRAND); y -= 18;
    for (const r of recs) {
      ensure(48);
      text(r.title, M, 10.5, bold);
      const date = fmt(r.clinical_date);
      text(date, W - M - font.widthOfTextAtSize(date, 9), 9, font, MUTED); y -= 13;
      text(`${SOURCE[r.source] ?? r.source}${r.institution ?? r.facility ? ` - ${r.institution ?? r.facility}` : ""}${r.professional ? ` - ${r.professional}` : ""}`, M, 8.5, font, MUTED); y -= 12;
      if (r.description) for (const l of wrap(r.description, font, 9.5, W - 2 * M).slice(0, 8)) { ensure(12); text(l, M, 9.5); y -= 12; }
      for (const x of r.structured_data?.results ?? []) { ensure(12); text(`${x.test}: ${x.value} ${x.unit ?? ""}${x.reference ? `  (ref ${x.reference})` : ""}${x.flag && x.flag !== "normal" ? `  [${x.flag.toUpperCase()}]` : ""}`, M + 10, 9); y -= 12; }
      for (const m of r.structured_data?.medications ?? []) { ensure(12); text(`${m.name} ${m.dose} ${m.frequency ?? ""}`, M + 10, 9); y -= 12; }
      y -= 8;
    }
    y -= 6;
  }
  if (!p.records.length) text("No records available.", M, 10, font, MUTED);

  const pages = doc.getPages();
  pages.forEach((pg, i) => pg.drawText(pdfSafeText(`Confidential health information - page ${i + 1} of ${pages.length}`), { x: M, y: 28, size: 7.5, font, color: MUTED }));
  return Buffer.from(await doc.save());
}
