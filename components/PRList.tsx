import React from 'react';
import { GitHubPR } from '../types';

interface PRListProps {
  prs: GitHubPR[];
}

const getRepoName = (url: string) => {
  const parts = url.split('/');
  return parts.length > 0 ? parts[parts.length - 1] : 'unknown-repo';
};

const getDurationBadge = (created: string, merged: string | null) => {
  if (!merged) return null;
  const start = new Date(created);
  const end = new Date(merged);
  const diffHours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);

  if (diffHours < 24) {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
        🚀 Quick Merge
      </span>
    );
  }
  return null;
};

const getImpactBadge = (additions?: number, deletions?: number) => {
  if (additions === undefined || deletions === undefined) return null;
  const total = additions + deletions;
  
  if (total > 1000) {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-500/10 text-purple-400 border border-purple-500/20">
        🔥 High Impact
      </span>
    );
  }
  if (total > 300) {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-orange-500/10 text-orange-400 border border-orange-500/20">
        ⚡ Significant
      </span>
    );
  }
  return null;
};

const PRList: React.FC<PRListProps> = ({ prs }) => {
  return (
    <div className="space-y-4">
       <div className="flex items-center justify-between">
         <h3 className="text-lg font-medium text-white">Recent Pull Requests</h3>
         <span className="text-xs text-slate-500">Showing top {Math.min(prs.length, 100)}</span>
       </div>
       
       <div className="grid grid-cols-1 gap-3">
         {prs.map((pr) => {
           const repoName = getRepoName(pr.repository_url);
           const date = new Date(pr.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
           
           return (
             <a 
               key={pr.id} 
               href={pr.html_url}
               target="_blank"
               rel="noopener noreferrer"
               className="group block bg-slate-800/40 hover:bg-slate-800 border border-slate-700 hover:border-slate-600 rounded-lg p-4 transition-all"
             >
               <div className="flex items-start justify-between gap-4">
                 <div className="flex-1 min-w-0">
                   <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="text-xs font-mono text-indigo-400 bg-indigo-500/10 px-1.5 py-0.5 rounded">
                        {repoName}
                      </span>
                      <span className="text-xs text-slate-500">{date}</span>
                      {getDurationBadge(pr.created_at, pr.merged_at)}
                      {getImpactBadge(pr.additions, pr.deletions)}
                   </div>
                   <h4 className="text-sm font-semibold text-slate-200 group-hover:text-white truncate pr-2">
                     {pr.title}
                   </h4>
                 </div>
                 
                 <div className="flex flex-col items-end gap-1 shrink-0">
                    <span className={`text-xs px-2 py-0.5 rounded-full capitalize font-medium
                      ${pr.state === 'open' ? 'bg-green-500/10 text-green-400' : 
                        pr.merged_at ? 'bg-purple-500/10 text-purple-400' : 'bg-red-500/10 text-red-400'}`}>
                      {pr.merged_at ? 'Merged' : pr.state}
                    </span>
                    {(pr.additions !== undefined && pr.deletions !== undefined) && (
                      <div className="text-xs font-mono flex items-center gap-2">
                        <span className="text-emerald-400">+{pr.additions}</span>
                        <span className="text-red-400">-{pr.deletions}</span>
                      </div>
                    )}
                 </div>
               </div>
             </a>
           );
         })}
       </div>
    </div>
  );
};

export default PRList;