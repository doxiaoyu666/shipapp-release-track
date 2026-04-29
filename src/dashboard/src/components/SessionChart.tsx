import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

interface Props {
  data: { date: string; sessions: number; activeDevices: number }[];
}

export function SessionChart({ data }: Props) {
  if (data.length === 0) {
    return <div className="empty-state">No session data.</div>;
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
        <Line type="monotone" dataKey="sessions" name="Sessions" stroke="#007aff" strokeWidth={2} dot={false} />
        <Line type="monotone" dataKey="activeDevices" name="Active Devices" stroke="#5856d6" strokeWidth={2} dot={false} />
      </LineChart>
    </ResponsiveContainer>
  );
}
