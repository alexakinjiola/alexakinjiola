"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { Field, Input, Select } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { FormError } from "@/components/ui/form-error";
import { toast } from "@/components/ui/toast";
import { applyFieldErrors } from "@/lib/client-action";
import { inviteStaffAction } from "../actions";

type V = { fullName: string; email: string; roleKey: string };
export function InviteDialog() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const form = useForm<V>({ defaultValues: { fullName: "", email: "", roleKey: "clinician" } });
  const e = form.formState.errors;
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button icon="person_add">Invite staff</Button></DialogTrigger>
      <DialogContent title="Invite a staff member" description="They'll get an email link, sign in with that address, and submit their licence for platform verification.">
        <form noValidate className="space-y-5" onSubmit={form.handleSubmit((v) => start(async () => {
          setError(null);
          const res = await inviteStaffAction(v);
          if (res.ok) { toast.success(res.message!); setOpen(false); form.reset(); router.refresh(); }
          else if (!applyFieldErrors(form.setError, res)) setError(res.error);
        }))}>
          <FormError message={error} />
          <Field label="Full name" error={e.fullName?.message} required><Input {...form.register("fullName")} /></Field>
          <Field label="Work email" error={e.email?.message} required><Input type="email" {...form.register("email")} /></Field>
          <Field label="Role" hint="Roles decide what someone can do. Clinical roles also require a verified licence." error={e.roleKey?.message} required>
            <Select {...form.register("roleKey")}>
              <option value="clinician">Clinician — request, view and submit records</option>
              <option value="lab_scientist">Laboratory scientist — submit results, view authorised history</option>
              <option value="records_officer">Health records officer — submit records only</option>
              <option value="institution_admin">Institution administrator — staff & settings, no clinical access</option>
            </Select>
          </Field>
          <div className="flex justify-end gap-2"><Button type="button" variant="secondary" onClick={() => setOpen(false)}>Cancel</Button><Button type="submit" loading={pending}>Send invitation</Button></div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
