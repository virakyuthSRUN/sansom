interface RingChartProps {
  pct: number;
  size?: number;
  color?: string;
  bg?: string;
  stroke?: number;
  label?: string;
  sub?: string;
}

const RingChart = ({ pct, size = 80, color = 'hsl(162,100%,39%)', bg = 'hsl(var(--border))', stroke = 8, label, sub }: RingChartProps) => {
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;

  return (
    <div className="relative flex-shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={bg} strokeWidth={stroke} />
        <circle
          cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={stroke}
          strokeDasharray={`${(pct / 100) * circ} ${circ}`} strokeLinecap="round"
          className="transition-all duration-1000 ease-out"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        {label && <div className="font-bold text-foreground leading-none" style={{ fontSize: size > 70 ? 16 : 12 }}>{label}</div>}
        {sub && <div className="text-muted-foreground mt-0.5" style={{ fontSize: 9 }}>{sub}</div>}
      </div>
    </div>
  );
};

export default RingChart;
