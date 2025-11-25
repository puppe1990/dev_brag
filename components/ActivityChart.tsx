import React, { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { GitHubPR, GitHubCommit } from '../types';

interface ActivityChartProps {
  prs: GitHubPR[];
  commits: GitHubCommit[];
  startDate: string;
  endDate: string;
}

interface ChartData {
  key: string; // YYYY-MM-DD or YYYY-MM
  label: string; // Display label
  PRs: number;
  Commits: number;
  timestamp: number; // For sorting
}

const ActivityChart: React.FC<ActivityChartProps> = ({ prs, commits, startDate, endDate }) => {
  const chartData = useMemo(() => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    // Calculate duration in days to decide granularity
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    // If range is large (> 60 days), show Monthly. Otherwise Daily.
    const isMonthly = diffDays > 60;

    const dataMap = new Map<string, ChartData>();

    // 1. Initialize the timeline with empty buckets (Zero-filling)
    // We iterate from start to end
    const current = new Date(start);
    // Adjust start to beginning of day/month for consistency
    if (isMonthly) {
        current.setDate(1); 
    }

    const endTarget = new Date(end);
    if (isMonthly) {
        endTarget.setDate(1); 
    }

    // Safety break to prevent infinite loops
    let loops = 0;
    while (current <= endTarget || (isMonthly && current.getMonth() === endTarget.getMonth() && current.getFullYear() === endTarget.getFullYear())) {
      if (loops++ > 1000) break;

      let key: string;
      let label: string;

      if (isMonthly) {
        // Key: YYYY-MM
        key = `${current.getFullYear()}-${String(current.getMonth() + 1).padStart(2, '0')}`;
        // Label: MMM YY
        label = current.toLocaleDateString(undefined, { month: 'short', year: '2-digit' });
      } else {
        // Key: YYYY-MM-DD
        key = current.toISOString().split('T')[0];
        // Label: MMM dd
        label = current.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
      }

      dataMap.set(key, {
        key,
        label,
        PRs: 0,
        Commits: 0,
        timestamp: current.getTime()
      });

      // Increment
      if (isMonthly) {
        current.setMonth(current.getMonth() + 1);
      } else {
        current.setDate(current.getDate() + 1);
      }
    }

    // 2. Fill with Data
    const processItem = (dateStr: string, type: 'PRs' | 'Commits') => {
       // Convert item date to UTC YYYY-MM-DD or YYYY-MM key
       // Note: dateStr from GitHub is ISO (UTC). 
       // We slice the string directly to match the keys we generated (assuming ISO format for keys).
       
       const date = new Date(dateStr);
       // Simple validation
       if (isNaN(date.getTime())) return;

       let key: string;
       if (isMonthly) {
          key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
       } else {
          key = date.toISOString().split('T')[0];
       }

       const bucket = dataMap.get(key);
       if (bucket) {
         bucket[type] += 1;
       }
    };

    prs.forEach(pr => processItem(pr.created_at, 'PRs'));
    commits.forEach(c => processItem(c.date, 'Commits'));

    return Array.from(dataMap.values()).sort((a, b) => a.timestamp - b.timestamp);
  }, [prs, commits, startDate, endDate]);

  if (chartData.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 bg-slate-800/50 rounded-lg border border-slate-700 text-slate-400">
        No data available for this range
      </div>
    );
  }

  return (
    <div className="h-64 w-full mt-4">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
          <XAxis 
            dataKey="label" 
            stroke="#94a3b8" 
            fontSize={12} 
            tickLine={false} 
            axisLine={false} 
            interval="preserveStartEnd"
            minTickGap={20}
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
            labelStyle={{ color: '#cbd5e1', marginBottom: '0.5rem' }}
          />
          <Legend wrapperStyle={{ paddingTop: '10px' }} />
          <Bar dataKey="PRs" name="Pull Requests" fill="#38bdf8" radius={[4, 4, 0, 0]} maxBarSize={50} />
          <Bar dataKey="Commits" name="Commits" fill="#818cf8" radius={[4, 4, 0, 0]} maxBarSize={50} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

export default ActivityChart;