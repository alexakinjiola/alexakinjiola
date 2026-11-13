import { Callout } from "./callout";

export function FormError({ message }: { message?: string | null }) {
  if (!message) return null;
  return <Callout tone="danger" role="alert">{message}</Callout>;
}
