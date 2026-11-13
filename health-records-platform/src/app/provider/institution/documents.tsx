"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Select } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";
import { FileDrop, checkFileClientSide, uploadWithProgress } from "@/components/domain/file-drop";

export function DocumentUpload({ institutionId }: { institutionId: string }) {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [type, setType] = useState("operating_license");
  const [err, setErr] = useState<string | null>(null);
  const [pct, setPct] = useState<number | null>(null);
  return (
    <div className="space-y-4">
      <div className="max-w-xs">
        <label htmlFor="doc-type" className="mb-1.5 block text-sm font-medium text-ink">Document type</label>
        <Select id="doc-type" value={type} onChange={(e) => setType(e.target.value)}>
          <option value="operating_license">Operating licence</option><option value="cac_certificate">CAC certificate</option>
          <option value="representative_id">Representative ID</option><option value="accreditation">Accreditation</option><option value="other">Other</option>
        </Select>
      </div>
      <FileDrop id="inst-doc" file={file} onFile={(f) => { setFile(f); setErr(f ? checkFileClientSide(f) : null); }} error={err} disabled={pct !== null} />
      <Button icon="upload" loading={pct !== null} disabled={!file || !!err} onClick={async () => {
        if (!file) return;
        const fd = new FormData(); fd.append("institutionId", institutionId); fd.append("documentType", type); fd.append("file", file);
        setPct(0);
        const res = await uploadWithProgress("/api/provider/institution-documents", fd, setPct);
        setPct(null);
        if (res.body.ok) { toast.success("Document uploaded."); setFile(null); router.refresh(); } else setErr(res.body.error ?? "Upload failed. Try again.");
      }}>{pct !== null ? `Uploading ${pct}%` : "Upload document"}</Button>
    </div>
  );
}
