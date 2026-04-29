import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

interface Props {
  data: { date: string; installations: number; deletions: number }[];
}

export function RetentionChart({ data }: Props) {
  if (data.length === 0) {
    return <div className="empty-state">No retention data.</div>;
  }

  return (
    <ResponsiveContainer width="100%" height={240}>
      <LineChart data={data}>
        <XAxis
          dataKey="date"
          tickFormatter={(d: string) => d.slice(5)}
          stroke="#ccc"
          tick={{ fill: '#86868b', fontSize: 11 }}
        />
        <YAxis stroke="#ccc" tick={{ fill: '#86868b', fontSize: 11 }} />
        <Tooltip
          contentStyle={{ background: '#fff', border: '1px solid #e0e0e0', borderRadius: 8 }}
          labelStyle={{ color: '#1d1d1f' }}
        />
        <Line type="monotone" dataKey="installations" name="Installations" stroke="#34c759" strokeWidth={2} dot={false} />
        <Line type="monotone" dataKey="deletions" name="Deletions" stroke="#ff3b30" strokeWidth={2} dot={false} />
      </LineChart>
    </ResponsiveContainer>
  );
}
