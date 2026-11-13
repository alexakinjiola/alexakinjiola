"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Field, Textarea } from "@/components/ui/field";
import { RadioCards } from "@/components/ui/radio-group";
import { FormError } from "@/components/ui/form-error";
import { toast } from "@/components/ui/toast";
import { raiseCorrectionAction } from "../../actions";

export function CorrectionDialog({ recordId, institutional }: { recordId: string; institutional: boolean }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState("flag_error");
  const [details, setDetails] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button variant="secondary" icon="flag">Report a problem</Button></DialogTrigger>
      <DialogContent title="Report a problem with this record" description={institutional
        ? "Your query goes to the institution that submitted it. The original record isn't changed silently — any correction is added as a new, traceable version."
        : "Tell us what's wrong. You can also mark your own upload as an error."}>
        <form className="space-y-5" onSubmit={(e) => {
          e.preventDefault(); setError(null);
          start(async () => {
            const res = await raiseCorrectionAction({ recordId, kind, details });
            if (!res.ok) { setError(res.fieldErrors?.details ?? res.error); return; }
            setOpen(false); setDetails(""); toast.success(res.message!); router.refresh();
          });
        }}>
          <RadioCards name="kind" ariaLabel="Type of problem" value={kind} onValueChange={setKind} options={[
            { value: "flag_error", label: "Something is wrong", description: "A detail such as a date, name or value is incorrect." },
            { value: "correction_request", label: "Ask for a correction", description: "Request that the institution amend the record." },
            { value: "dispute", label: "I disagree with this", description: "For example, you dispute a diagnosis. Your view is recorded alongside it." },
          ]} />
          <Field label="What's wrong?" hint="Don't include passwords or other people's information." error={error ?? undefined} required>
            <Textarea value={details} onChange={(e) => setDetails(e.target.value)} rows={4} maxLength={4000} />
          </Field>
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button type="button" variant="secondary" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" loading={pending}>Send</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
