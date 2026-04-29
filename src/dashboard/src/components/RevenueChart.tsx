import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

interface Props {
  data: { date: string; proceeds: number; units: number }[];
}

export function RevenueChart({ data }: Props) {
  if (data.length === 0) {
    return <div className="empty-state">No revenue data.</div>;
  }

  const hasRevenue = data.some(d => d.proceeds > 0 || d.units > 0);
  if (!hasRevenue) {
    return <div className="empty-state">No purchases recorded.</div>;
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
        <YAxis yAxisId="left" stroke="#ccc" tick={{ fill: '#86868b', fontSize: 11 }} />
        <YAxis yAxisId="right" orientation="right" stroke="#ccc" tick={{ fill: '#86868b', fontSize: 11 }} />
        <Tooltip
          contentStyle={{ background: '#fff', border: '1px solid #e0e0e0', borderRadius: 8 }}
          labelStyle={{ color: '#1d1d1f' }}
          formatter={(value: number, name: string) =>
            name === 'Revenue' ? `$${value.toFixed(2)}` : value
          }
        />
        <Line yAxisId="left" type="monotone" dataKey="proceeds" name="Revenue" stroke="#34c759" strokeWidth={2} dot={false} />
        <Line yAxisId="right" type="monotone" dataKey="units" name="Units" stroke="#007aff" strokeWidth={2} dot={false} />
      </LineChart>
    </ResponsiveContainer>
  );
}
