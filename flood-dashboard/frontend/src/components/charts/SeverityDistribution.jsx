import { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

export default function SeverityDistribution({ districts }) {
  const data = useMemo(() => {
    const buckets = [
      { name: 'Critical (7+)', count: 0, color: '#dc2626' },
      { name: 'High (5-7)', count: 0, color: '#ea580c' },
      { name: 'Medium (3-5)', count: 0, color: '#ca8a04' },
      { name: 'Low (0-3)', count: 0, color: '#16a34a' },
    ];
    for (const d of districts) {
      const s = d.severity_score || 0;
      if (s >= 7) buckets[0].count++;
      else if (s >= 5) buckets[1].count++;
      else if (s >= 3) buckets[2].count++;
      else buckets[3].count++;
    }
    return buckets;
  }, [districts]);

  return (
    <ResponsiveContainer width="100%" height={130}>
      <BarChart data={data} barSize={28}>
        <XAxis dataKey="name" tick={{ fill: '#64748b', fontSize: 9 }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fill: '#64748b', fontSize: 9 }} axisLine={false} tickLine={false} width={25} />
        <Tooltip
          contentStyle={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 11 }}
          labelStyle={{ color: '#1e293b' }}
          itemStyle={{ color: '#1e293b' }}
        />
        <Bar dataKey="count" radius={[4, 4, 0, 0]}>
          {data.map((entry, i) => <Cell key={i} fill={entry.color} />)}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
