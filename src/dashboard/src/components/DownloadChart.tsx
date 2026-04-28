import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

interface Props {
  data: { date: string; downloads: number; pageViews: number; impressions: number }[];
}

export function DownloadChart({ data }: Props) {
  if (data.length === 0) {
    return <div className="empty-state">No download data.</div>;
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
        <Line type="monotone" dataKey="downloads" name="Downloads" stroke="#22c55e" strokeWidth={2} dot={false} />
        <Line type="monotone" dataKey="pageViews" name="Page Views" stroke="#3b82f6" strokeWidth={2} dot={false} />
        <Line type="monotone" dataKey="impressions" name="Impressions" stroke="#8b5cf6" strokeWidth={2} dot={false} />
      </LineChart>
    </ResponsiveContainer>
  );
}
