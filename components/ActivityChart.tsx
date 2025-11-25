import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, Legend } from 'recharts';
import { GitHubPR, GitHubCommit } from '../types';

interface ActivityChartProps {
  prs: GitHubPR[];
  commits: GitHubCommit[];
}

interface ChartData {
  name: string;
  PRs: number;
  Commits: number;
  date: number;
}

const ActivityChart: React.FC<ActivityChartProps> = ({ prs, commits }) => {
  // Aggregate data by month
  const dataMap: Record<string, ChartData> = {};

  const processDate = (dateStr: string, type: 'PRs' | 'Commits') => {
    const date = new Date(dateStr);
    const key = date.toLocaleString('default', { month: 'short', year: '2-digit' });
    
    if (!dataMap[key]) {
      dataMap[key] = { name: key, PRs: 0, Commits: 0, date: date.getTime() };
    }
    dataMap[key][type] += 1;
  };

  prs.forEach(pr => processDate(pr.created_at, 'PRs'));
  commits.forEach(commit => processDate(commit.date, 'Commits'));

  const data = (Object.values(dataMap) as ChartData[]).sort((a, b) => a.date - b.date);

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 bg-slate-800/50 rounded-lg border border-slate-700 text-slate-400">
        No data available to chart
      </div>
    );
  }

  return (
    <div className="h-64 w-full mt-4">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
          <XAxis 
            dataKey="name" 
            stroke="#94a3b8" 
            fontSize={12} 
            tickLine={false} 
            axisLine={false} 
          />
          <YAxis 
            stroke="#94a3b8" 
            fontSize={12} 
            tickLine={false} 
            axisLine={false} 
            allowDecimals={false}
          />
          <Tooltip 
            contentStyle={{ backgroundColor: '#1e293b', borderColor: '#475569', color: '#f8fafc' }}
            cursor={{ fill: '#334155', opacity: 0.4 }}
          />
          <Legend wrapperStyle={{ paddingTop: '10px' }} />
          <Bar dataKey="PRs" name="Pull Requests" fill="#38bdf8" radius={[4, 4, 0, 0]} />
          <Bar dataKey="Commits" name="Commits" fill="#818cf8" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

export default ActivityChart;