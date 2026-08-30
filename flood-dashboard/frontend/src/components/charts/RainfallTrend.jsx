import { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

export default function RainfallTrend({ districts }) {
  const data = useMemo(() => {
    return [...districts]
      .sort((a, b) => (b.severity_score || 0) - (a.severity_score || 0))
      .slice(0, 10)
      .map(d => ({
        name: d.district?.length > 10 ? d.district.substring(0, 8) + '..' : d.district,
        monsoon: Math.round(d.monsoon_rain_mm || 0),
        annual: Math.round(d.annual_rain_mm || 0),
      }));
  }, [districts]);

  return (
    <ResponsiveContainer width="100%" height={130}>
      <BarChart data={data} barGap={2} barSize={8}>
        <XAxis dataKey="name" tick={{ fill: '#64748b', fontSize: 8 }} axisLine={false} tickLine={false} angle={-30} textAnchor="end" height={35} />
        <YAxis tick={{ fill: '#64748b', fontSize: 9 }} axisLine={false} tickLine={false} width={35} />
        <Tooltip
          contentStyle={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 11 }}
          labelStyle={{ color: '#1e293b' }}
        />
        <Bar dataKey="monsoon" name="Monsoon" fill="#1a56db" radius={[2, 2, 0, 0]} />
        <Bar dataKey="annual" name="Annual" fill="#0369a1" radius={[2, 2, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
