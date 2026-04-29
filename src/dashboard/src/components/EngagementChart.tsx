import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

interface Props {
  data: { date: string; impressions: number; pageViews: number; webImpressions: number; webTaps: number }[];
}

export function EngagementChart({ data }: Props) {
  if (data.length === 0) {
    return <div className="empty-state">No engagement data.</div>;
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
        <Line type="monotone" dataKey="impressions" name="Impressions" stroke="#007aff" strokeWidth={2} dot={false} />
        <Line type="monotone" dataKey="pageViews" name="Page Views" stroke="#5856d6" strokeWidth={2} dot={false} />
        <Line type="monotone" dataKey="webImpressions" name="Web Views" stroke="#ff9500" strokeWidth={1.5} dot={false} strokeDasharray="4 2" />
        <Line type="monotone" dataKey="webTaps" name="Web Taps" stroke="#ff3b30" strokeWidth={1.5} dot={false} strokeDasharray="4 2" />
      </LineChart>
    </ResponsiveContainer>
  );
}
