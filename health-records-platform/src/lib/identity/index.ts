import "server-only";
import { env } from "../env";

/**
 * Identity verification provider interface. Real integrations (e.g. NIMC NIN
 * verification through a licensed verification partner) implement this.
 * Which provider to use is an open product/legal decision (see DECISIONS.md).
 */
export interface IdentityProvider {
  readonly name: string;
  verifyNin(input: { nin: string; fullName: string; dateOfBirth: string }): Promise<IdentityResult>;
}

export type IdentityResult =
  | { status: "verified"; reference: string }
  | { status: "pending"; reference: string; reason: string }
  | { status: "failed"; reference: string; reason: string };

/**
 * SANDBOX ONLY — deterministic synthetic outcomes, refused in production:
 *   NIN ending 0 → failed, ending 9 → pending manual review, otherwise verified.
 */
class SandboxProvider implements IdentityProvider {
  readonly name = "sandbox";
  async verifyNin({ nin }: { nin: string }): Promise<IdentityResult> {
    const ref = `SBX-${crypto.randomUUID().slice(0, 8)}`;
    if (nin.endsWith("0")) return { status: "failed", reference: ref, reason: "The details provided did not match the identity record." };
    if (nin.endsWith("9")) return { status: "pending", reference: ref, reason: "Sent for manual review." };
    return { status: "verified", reference: ref };
  }
}

class ManualReviewProvider implements IdentityProvider {
  readonly name = "manual_review";
  async verifyNin(): Promise<IdentityResult> {
    return { status: "pending", reference: `MAN-${crypto.randomUUID().slice(0, 8)}`, reason: "Queued for review by the platform team." };
  }
}

export function identityProvider(): IdentityProvider {
  return env().IDENTITY_PROVIDER === "sandbox" ? new SandboxProvider() : new ManualReviewProvider();
}
