import React, { useState, useMemo } from 'react';
import { GitHubRepo } from '../types';

interface RepoSelectorProps {
  repos: GitHubRepo[];
  selectedRepoIds: Set<number>;
  onToggleRepo: (id: number) => void;
  onContinue: () => void;
  isLoading: boolean;
}

const RepoSelector: React.FC<RepoSelectorProps> = ({ 
  repos, 
  selectedRepoIds, 
  onToggleRepo, 
  onContinue,
  isLoading 
}) => {
  const [search, setSearch] = useState('');

  const filteredRepos = useMemo(() => {
    return repos.filter(repo => 
      repo.full_name.toLowerCase().includes(search.toLowerCase())
    );
  }, [repos, search]);

  const toggleAll = () => {
    if (filteredRepos.every(r => selectedRepoIds.has(r.id))) {
      // Deselect all visible
      filteredRepos.forEach(r => {
        if (selectedRepoIds.has(r.id)) onToggleRepo(r.id);
      });
    } else {
      // Select all visible
      filteredRepos.forEach(r => {
        if (!selectedRepoIds.has(r.id)) onToggleRepo(r.id);
      });
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold text-white">Select Repositories</h2>
        <p className="text-slate-400">Choose the repositories you want to analyze for your report.</p>
      </div>

      {/* Controls */}
      <div className="flex flex-col md:flex-row gap-4 justify-between bg-slate-800/50 p-4 rounded-xl border border-slate-700">
        <input 
          type="text" 
          placeholder="Search repositories..." 
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 bg-slate-900 border border-slate-600 rounded-lg px-4 py-2 text-white placeholder-slate-500 focus:ring-2 focus:ring-indigo-500 outline-none"
        />
        <div className="flex gap-2">
          <button 
            onClick={toggleAll}
            className="px-4 py-2 text-sm font-medium text-slate-300 hover:text-white bg-slate-700 hover:bg-slate-600 rounded-lg transition-colors"
          >
            Toggle Visible
          </button>
          <button 
            onClick={onContinue}
            disabled={selectedRepoIds.size === 0 || isLoading}
            className="px-6 py-2 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg shadow-lg shadow-indigo-900/20 transition-all flex items-center gap-2"
          >
            {isLoading ? 'Analyzing...' : `Analyze ${selectedRepoIds.size} Repos`}
          </button>
        </div>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[60vh] overflow-y-auto pr-2">
        {filteredRepos.map(repo => {
          const isSelected = selectedRepoIds.has(repo.id);
          return (
            <div 
              key={repo.id}
              onClick={() => onToggleRepo(repo.id)}
              className={`cursor-pointer p-4 rounded-lg border transition-all duration-200 flex items-start gap-3
                ${isSelected 
                  ? 'bg-indigo-500/10 border-indigo-500/50 hover:bg-indigo-500/20' 
                  : 'bg-slate-800/30 border-slate-700 hover:border-slate-500 hover:bg-slate-800'
                }`}
            >
              <div className={`mt-1 w-5 h-5 rounded border flex items-center justify-center shrink-0 transition-colors
                ${isSelected ? 'bg-indigo-500 border-indigo-500' : 'border-slate-500'}`}
              >
                {isSelected && (
                  <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                   <h3 className={`font-medium truncate ${isSelected ? 'text-indigo-300' : 'text-slate-200'}`}>
                     {repo.full_name}
                   </h3>
                   {repo.private && (
                     <span className="text-[10px] uppercase border border-slate-600 text-slate-400 px-1.5 rounded">Private</span>
                   )}
                </div>
                {repo.description && (
                  <p className="text-xs text-slate-500 truncate mt-1">{repo.description}</p>
                )}
                <p className="text-[10px] text-slate-600 mt-2">Updated: {new Date(repo.updated_at).toLocaleDateString()}</p>
              </div>
            </div>
          );
        })}
        {filteredRepos.length === 0 && (
          <div className="col-span-full py-12 text-center text-slate-500">
            No repositories found matching "{search}"
          </div>
        )}
      </div>
    </div>
  );
};

export default RepoSelector;