interface Props {
  lines: string[];
  active: number;
}

export function Pseudocode({ lines, active }: Props) {
  return (
    <pre className="rounded-lg border bg-muted/40 p-3 text-xs font-mono overflow-x-auto">
      {lines.map((l, i) => (
        <div
          key={i}
          className={`px-2 py-0.5 rounded ${i === active ? "bg-amber-400/40 text-foreground" : "text-muted-foreground"}`}
        >
          <span className="opacity-50 mr-2">{String(i + 1).padStart(2, "0")}</span>
          {l}
        </div>
      ))}
    </pre>
  );
}
