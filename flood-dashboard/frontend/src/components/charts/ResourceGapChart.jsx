import { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

export default function ResourceGapChart({ districts }) {
  const data = useMemo(() => {
    return [...districts]
      .sort((a, b) => (b.resource_gap_score || 0) - (a.resource_gap_score || 0))
      .slice(0, 10)
      .map(d => ({
        name: d.district?.length > 10 ? d.district.substring(0, 8) + '..' : d.district,
        gap: Math.round((d.resource_gap_score || 0) * 100),
      }));
  }, [districts]);

  const getColor = (gap) => {
    if (gap >= 80) return '#dc2626';
    if (gap >= 50) return '#ea580c';
    if (gap >= 30) return '#ca8a04';
    return '#16a34a';
  };

  return (
    <ResponsiveContainer width="100%" height={130}>
      <BarChart data={data} layout="vertical" barSize={10}>
        <XAxis type="number" tick={{ fill: '#64748b', fontSize: 9 }} axisLine={false} tickLine={false} domain={[0, 100]} />
        <YAxis type="category" dataKey="name" tick={{ fill: '#64748b', fontSize: 8 }} axisLine={false} tickLine={false} width={60} />
        <Tooltip
          contentStyle={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 11 }}
          formatter={(value) => [`${value}%`, 'Gap']}
        />
        <Bar dataKey="gap" radius={[0, 4, 4, 0]}>
          {data.map((entry, i) => <Cell key={i} fill={getColor(entry.gap)} />)}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
