import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

interface Props {
  data: { date: string; totalWeight: number; signatureCount: number }[];
}

export function CrashChart({ data }: Props) {
  if (data.length === 0) {
    return <div className="empty-state">No crash trend data.</div>;
  }

  return (
    <ResponsiveContainer width="100%" height={240}>
      <LineChart data={data}>
        <XAxis
          dataKey="date"
          tickFormatter={(d: string) => d.slice(5)}
          stroke="#444"
          tick={{ fill: '#666', fontSize: 11 }}
        />
        <YAxis stroke="#444" tick={{ fill: '#666', fontSize: 11 }} />
        <Tooltip
          contentStyle={{ background: '#1a1a1a', border: '1px solid #333', borderRadius: 8 }}
          labelStyle={{ color: '#999' }}
        />
        <Line type="monotone" dataKey="totalWeight" name="Weight" stroke="#ef4444" strokeWidth={2} dot={false} />
        <Line type="monotone" dataKey="signatureCount" name="Signatures" stroke="#f97316" strokeWidth={2} dot={false} />
      </LineChart>
    </ResponsiveContainer>
  );
}
