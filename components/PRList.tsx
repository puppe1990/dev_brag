import React, { useState, useMemo } from 'react';
import { GitHubPR } from '../types';
import { ChevronRightIcon } from './Icons';

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

const ITEMS_PER_PAGE = 5;

const PRList: React.FC<PRListProps> = ({ prs }) => {
  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  const filteredPrs = useMemo(() => {
    const term = search.toLowerCase();
    return prs.filter(pr => {
      const repoName = getRepoName(pr.repository_url).toLowerCase();
      return (
        pr.title.toLowerCase().includes(term) ||
        repoName.includes(term) ||
        String(pr.number).includes(term)
      );
    });
  }, [prs, search]);

  const totalPages = Math.ceil(filteredPrs.length / ITEMS_PER_PAGE);
  const paginatedPrs = filteredPrs.slice(
    (currentPage - 1) * ITEMS_PER_PAGE, 
    currentPage * ITEMS_PER_PAGE
  );

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
    setCurrentPage(1); // Reset to first page on search
  };

  const handlePrev = () => {
    if (currentPage > 1) setCurrentPage(p => p - 1);
  };

  const handleNext = () => {
    if (currentPage < totalPages) setCurrentPage(p => p + 1);
  };

  return (
    <div className="space-y-4">
       <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
         <div>
            <h3 className="text-lg font-medium text-white">Recent Pull Requests</h3>
            <p className="text-xs text-slate-500 mt-1">
              Found {filteredPrs.length} PRs
            </p>
         </div>
         <input 
            type="text"
            placeholder="Search PRs..."
            value={search}
            onChange={handleSearchChange}
            className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-sm text-white placeholder-slate-500 focus:ring-2 focus:ring-indigo-500 outline-none w-full sm:w-64 transition-all"
         />
       </div>
       
       <div className="grid grid-cols-1 gap-3 min-h-[200px] content-start">
         {paginatedPrs.length > 0 ? (
           paginatedPrs.map((pr) => {
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
           })
         ) : (
           <div className="text-center py-8 text-slate-500 bg-slate-800/20 rounded-lg border border-slate-800 border-dashed">
             No Pull Requests match your search.
           </div>
         )}
       </div>

       {/* Pagination Controls */}
       {filteredPrs.length > ITEMS_PER_PAGE && (
          <div className="flex items-center justify-between border-t border-slate-800 pt-4">
            <button 
              onClick={handlePrev}
              disabled={currentPage === 1}
              className="flex items-center gap-1 px-3 py-1.5 rounded-md text-sm text-slate-400 hover:text-white hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <div className="rotate-180 flex"><ChevronRightIcon /></div>
              Previous
            </button>
            <span className="text-sm text-slate-500">
              Page <span className="text-white font-medium">{currentPage}</span> of {totalPages}
            </span>
            <button 
              onClick={handleNext}
              disabled={currentPage === totalPages}
              className="flex items-center gap-1 px-3 py-1.5 rounded-md text-sm text-slate-400 hover:text-white hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Next
              <ChevronRightIcon />
            </button>
          </div>
       )}
    </div>
  );
};

export default PRList;