interface BarData {
  label: string;
  val: number;
  active?: boolean;
}

const BarChart = ({ data }: { data: BarData[] }) => {
  const max = Math.max(...data.map(d => d.val));

  return (
    <div className="flex items-end gap-1.5 px-1" style={{ height: 80 }}>
      {data.map((d, i) => (
        <div key={i} className="flex-1 flex flex-col items-center gap-1">
          <div
            className="w-full rounded-t-md relative transition-all duration-700 ease-out"
            style={{
              height: `${(d.val / max) * 70}px`,
              background: d.active ? 'hsl(var(--primary))' : 'hsl(var(--border))',
            }}
          >
            {d.active && (
              <div className="absolute inset-0 rounded-t-md" style={{ background: 'linear-gradient(180deg,rgba(255,255,255,0.2),transparent)' }} />
            )}
          </div>
          <div
            className="font-sans"
            style={{
              fontSize: 9,
              color: d.active ? 'hsl(var(--primary))' : 'hsl(var(--muted-foreground))',
              fontWeight: d.active ? 600 : 400,
            }}
          >
            {d.label}
          </div>
        </div>
      ))}
    </div>
  );
};

export default BarChart;
