import { Icon } from "@/components/ui/icon";

/** Shown whenever the signed-in account is part of the synthetic demo data set. */
export function SyntheticBanner() {
  return (
    <div className="border-b border-warning-line bg-warning-bg px-4 py-1.5 text-center text-xs font-medium text-warning-fg">
      <Icon name="science" size={14} className="mr-1.5 inline-block align-[-2px]" />
      Demonstration environment — all people, institutions and records shown are synthetic.
    </div>
  );
}
