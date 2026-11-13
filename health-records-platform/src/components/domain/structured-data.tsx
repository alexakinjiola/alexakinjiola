import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TBody, Td, Th, THead, Tr } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

type Result = { test: string; value: string | number; unit?: string; reference?: string; flag?: "high" | "low" | "normal" };

/** Renders structured results (e.g. lab panels). Displays values only — no interpretation. */
export function StructuredData({ data }: { data: { results?: Result[]; medications?: { name: string; dose: string; frequency: string; duration?: string }[] } }) {
  if (data.results?.length) {
    return (
      <Card>
        <CardHeader><CardTitle>Results</CardTitle></CardHeader>
        <Table caption="Test results">
          <THead><tr><Th>Test</Th><Th>Result</Th><Th>Reference range</Th><Th>Flag</Th></tr></THead>
          <TBody>
            {data.results.map((r) => (
              <Tr key={r.test}>
                <Td className="font-medium text-ink">{r.test}</Td>
                <Td className="tabular">{r.value} {r.unit}</Td>
                <Td className="text-ink-3">{r.reference ?? "—"}</Td>
                <Td>{r.flag && r.flag !== "normal" ? <Badge tone="warning">{r.flag === "high" ? "Above range" : "Below range"}</Badge> : <span className="text-ink-3">—</span>}</Td>
              </Tr>
            ))}
          </TBody>
        </Table>
      </Card>
    );
  }
  if (data.medications?.length) {
    return (
      <Card>
        <CardHeader><CardTitle>Medicines</CardTitle></CardHeader>
        <Table caption="Prescribed medicines">
          <THead><tr><Th>Medicine</Th><Th>Dose</Th><Th>How often</Th><Th>Duration</Th></tr></THead>
          <TBody>{data.medications.map((m) => (
            <Tr key={m.name}><Td className="font-medium text-ink">{m.name}</Td><Td>{m.dose}</Td><Td>{m.frequency}</Td><Td>{m.duration ?? "—"}</Td></Tr>
          ))}</TBody>
        </Table>
      </Card>
    );
  }
  return null;
}
