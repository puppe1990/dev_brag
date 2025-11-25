import React, { useState, useCallback } from 'react';
import { AppState, DateRange, ReportTone, GitHubPR, GitHubCommit } from './types';
import { fetchAuthenticatedUser, fetchUserRepositories, fetchUserPullRequests, fetchUserCommits } from './services/githubService';
import { generateSelfReview } from './services/geminiService';
import { GitHubIcon, SparklesIcon, RefreshIcon, DocumentIcon, ChevronRightIcon } from './components/Icons';
import ActivityChart from './components/ActivityChart';
import PRList from './components/PRList';
import RepoSelector from './components/RepoSelector';

const getLastSixMonths = (): DateRange => {
  const end = new Date();
  const start = new Date();
  start.setMonth(start.getMonth() - 6);
  return {
    startDate: start.toISOString().split('T')[0],
    endDate: end.toISOString().split('T')[0],
  };
};

const App: React.FC = () => {
  const [state, setState] = useState<AppState>({
    step: 'login',
    user: null,
    githubToken: '',
    repositories: [],
    selectedRepoIds: new Set(),
    dateRange: getLastSixMonths(),
    status: 'idle',
    error: null,
    prs: [],
    commits: [],
    generatedReport: null,
  });

  const [reportTone, setReportTone] = useState<ReportTone>(ReportTone.PROFESSIONAL);
  const [customFocus, setCustomFocus] = useState<string>('');

  // --- Auth & Repo Fetching ---
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!state.githubToken) return;

    setState(s => ({ ...s, status: 'loading', error: null }));
    try {
      const user = await fetchAuthenticatedUser(state.githubToken);
      const repos = await fetchUserRepositories(state.githubToken);
      
      setState(s => ({ 
        ...s, 
        user, 
        repositories: repos, 
        status: 'idle', 
        step: 'repo_selection' 
      }));
    } catch (err: any) {
      setState(s => ({ ...s, status: 'error', error: err.message }));
    }
  };

  const toggleRepo = (id: number) => {
    setState(s => {
      const newSet = new Set(s.selectedRepoIds);
      if (newSet.has(id)) newSet.delete(id);
      else newSet.add(id);
      return { ...s, selectedRepoIds: newSet };
    });
  };

  // --- Data Fetching for Dashboard ---
  const handleFetchStats = useCallback(async () => {
    if (!state.user) return;
    
    setState(s => ({ ...s, status: 'loading', error: null, step: 'dashboard' }));

    try {
      // 1. Fetch ALL data via search (GitHub API is optimized for author search)
      const [allPrs, allCommits] = await Promise.all([
        fetchUserPullRequests(
          state.user.login,
          state.githubToken,
          state.dateRange.startDate,
          state.dateRange.endDate
        ),
        fetchUserCommits(
          state.user.login,
          state.githubToken,
          state.dateRange.startDate,
          state.dateRange.endDate
        )
      ]);

      // 2. Filter based on selected repositories
      // Note: GitHub Search API returns `repository_url` (API URL)
      // We need to match it against our selected repos.
      
      const selectedRepoUrls = new Set(
        state.repositories
          .filter(r => state.selectedRepoIds.has(r.id))
          .map(r => r.url)
      );

      const filteredPrs = allPrs.filter(pr => selectedRepoUrls.has(pr.repository_url));
      const filteredCommits = allCommits.filter(c => 
        // Commits often have inconsistent repo URLs in search results depending on headers
        // Simple heuristic: check if HTML url starts with repo html url
        state.repositories.some(r => 
          state.selectedRepoIds.has(r.id) && c.html_url.startsWith(r.html_url)
        )
      );

      setState(s => ({ 
        ...s, 
        status: 'complete', 
        prs: filteredPrs, 
        commits: filteredCommits, 
        error: null 
      }));

    } catch (err: any) {
      setState(s => ({ ...s, status: 'error', error: err.message }));
    }
  }, [state.user, state.githubToken, state.dateRange, state.repositories, state.selectedRepoIds]);


  // --- AI Report Generation ---
  const handleGenerateReport = useCallback(async () => {
    if (state.prs.length === 0 && state.commits.length === 0) return;

    setState(s => ({ ...s, status: 'analyzing_ai', error: null }));

    try {
      const report = await generateSelfReview(
        state.user!.login,
        state.prs,
        state.commits,
        reportTone,
        customFocus
      );
      setState(s => ({ ...s, status: 'complete', generatedReport: report }));
    } catch (err: any) {
      setState(s => ({ ...s, status: 'error', error: 'Failed to generate report using AI.' }));
    }
  }, [state.user, state.prs, state.commits, reportTone, customFocus]);


  // --- Helper to Reset ---
  const handleLogout = () => {
    setState(s => ({ ...s, step: 'login', user: null, githubToken: '', repositories: [], selectedRepoIds: new Set(), prs: [], commits: [] }));
  };

  // --- Render Steps ---

  // 1. LOGIN SCREEN
  if (state.step === 'login') {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
        <div className="bg-slate-950 border border-slate-800 p-8 rounded-2xl w-full max-w-md shadow-2xl">
           <div className="flex justify-center mb-6">
             <div className="w-16 h-16 bg-indigo-500 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-indigo-500/30">
               <GitHubIcon />
             </div>
           </div>
           <h1 className="text-2xl font-bold text-center text-white mb-2">DevBrag</h1>
           <p className="text-center text-slate-400 mb-8">
             Connect your GitHub account to analyze your contributions and generate a performance review.
           </p>

           <form onSubmit={handleLogin} className="space-y-4">
             <div>
               <label className="block text-sm font-medium text-slate-300 mb-1">
                 Personal Access Token
               </label>
               <input 
                 type="password" 
                 value={state.githubToken}
                 onChange={(e) => setState(s => ({ ...s, githubToken: e.target.value }))}
                 placeholder="ghp_..."
                 className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
               />
               <p className="text-xs text-slate-500 mt-2">
                 Requires <code>repo</code> scope for private repositories.
               </p>
             </div>

             {state.error && (
               <div className="text-red-400 text-sm bg-red-900/20 p-3 rounded-lg border border-red-900/50">
                 {state.error}
               </div>
             )}

             <button 
               type="submit"
               disabled={state.status === 'loading' || !state.githubToken}
               className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-3 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center gap-2"
             >
               {state.status === 'loading' ? 'Connecting...' : 'Connect with GitHub'}
             </button>
           </form>
        </div>
      </div>
    );
  }

  // 2. REPO SELECTION SCREEN
  if (state.step === 'repo_selection') {
    return (
      <div className="min-h-screen bg-slate-900 p-4">
        <RepoSelector 
          repos={state.repositories}
          selectedRepoIds={state.selectedRepoIds}
          onToggleRepo={toggleRepo}
          onContinue={handleFetchStats}
          isLoading={state.status === 'loading'}
        />
      </div>
    );
  }

  // 3. DASHBOARD (Main App)
  const hasData = state.prs.length > 0 || state.commits.length > 0;

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col md:flex-row font-sans">
      
      {/* Sidebar */}
      <aside className="w-full md:w-1/3 lg:w-1/4 bg-slate-950 border-r border-slate-800 flex flex-col h-auto md:h-screen sticky top-0 z-20 overflow-y-auto">
        <div className="p-6 border-b border-slate-800 flex items-center gap-3">
          {state.user?.avatar_url && (
            <img src={state.user.avatar_url} alt={state.user.login} className="w-8 h-8 rounded-full border border-slate-700" />
          )}
          <div className="flex-1 min-w-0">
             <h1 className="text-sm font-bold text-white truncate">{state.user?.name || state.user?.login}</h1>
             <p className="text-xs text-slate-500 truncate">@{state.user?.login}</p>
          </div>
          <button onClick={handleLogout} className="text-xs text-slate-500 hover:text-white underline">
            Log out
          </button>
        </div>

        <div className="p-6 space-y-8 flex-1">
          {/* Controls */}
          <section className="space-y-4">
             <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Start Date</label>
                <input 
                  type="date" 
                  value={state.dateRange.startDate}
                  onChange={(e) => setState(s => ({ ...s, dateRange: { ...s.dateRange, startDate: e.target.value } }))}
                  className="w-full bg-slate-900 border border-slate-700 rounded-md px-3 py-2 text-sm text-slate-300 focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">End Date</label>
                <input 
                  type="date" 
                  value={state.dateRange.endDate}
                  onChange={(e) => setState(s => ({ ...s, dateRange: { ...s.dateRange, endDate: e.target.value } }))}
                  className="w-full bg-slate-900 border border-slate-700 rounded-md px-3 py-2 text-sm text-slate-300 focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>
            </div>

            <div className="flex gap-2">
               <button 
                onClick={() => setState(s => ({ ...s, step: 'repo_selection' }))}
                className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 py-2.5 rounded-md font-medium text-sm transition-colors"
              >
                Edit Repos ({state.selectedRepoIds.size})
              </button>
              <button 
                onClick={handleFetchStats}
                disabled={state.status === 'loading'}
                className="flex-none px-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-md flex items-center justify-center transition-colors"
              >
                {state.status === 'loading' ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : <RefreshIcon />}
              </button>
            </div>
          </section>

          {/* AI Config */}
          <section className={`space-y-4 transition-opacity duration-300 ${hasData ? 'opacity-100' : 'opacity-40 pointer-events-none'}`}>
             <h2 className="text-sm uppercase tracking-wider text-slate-500 font-semibold flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-indigo-500"></span> Generation
            </h2>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Tone</label>
              <select 
                value={reportTone}
                onChange={(e) => setReportTone(e.target.value as ReportTone)}
                className="w-full bg-slate-900 border border-slate-700 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
              >
                {Object.values(ReportTone).map(t => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Specific Focus</label>
              <textarea 
                value={customFocus}
                onChange={(e) => setCustomFocus(e.target.value)}
                placeholder="e.g. Focus on database work..."
                rows={3}
                className="w-full bg-slate-900 border border-slate-700 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none resize-none"
              />
            </div>

            <button 
              onClick={handleGenerateReport}
              disabled={state.status === 'analyzing_ai' || !hasData}
              className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white py-2.5 rounded-md font-medium text-sm transition-colors shadow-lg shadow-emerald-900/20 disabled:opacity-50 disabled:cursor-not-allowed"
            >
               {state.status === 'analyzing_ai' ? 'Writing...' : <><SparklesIcon /> Write Review</>}
            </button>
          </section>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden bg-slate-900 relative">
        <div className="h-16 border-b border-slate-800 flex items-center justify-between px-8 bg-slate-900/90 backdrop-blur z-10">
          <div className="flex items-center gap-2 text-sm text-slate-400">
             <span className="cursor-pointer hover:text-white" onClick={() => setState(s => ({ ...s, step: 'repo_selection' }))}>Repositories</span>
             <ChevronRightIcon />
             <span className="text-white font-medium">Dashboard</span>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 md:p-8">
           {!hasData && !state.error && (
            <div className="h-full flex flex-col items-center justify-center text-center max-w-lg mx-auto pb-20 opacity-60">
              <div className="w-16 h-16 bg-slate-800 rounded-2xl flex items-center justify-center mb-6 text-slate-600">
                <DocumentIcon />
              </div>
              <h2 className="text-xl font-bold text-white mb-2">No activity loaded</h2>
              <p className="text-slate-400">
                Adjust the date range or select different repositories to view stats.
              </p>
            </div>
           )}

           {hasData && (
             <div className="space-y-8 animate-[slideUp_0.4s_ease-out]">
               <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-slate-800/50 border border-slate-700 p-5 rounded-xl">
                    <p className="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-1">Total PRs</p>
                    <p className="text-3xl font-bold text-white">{state.prs.length}</p>
                  </div>
                  <div className="bg-slate-800/50 border border-slate-700 p-5 rounded-xl">
                    <p className="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-1">Total Commits</p>
                    <p className="text-3xl font-bold text-indigo-400">{state.commits.length}</p>
                  </div>
                  <div className="bg-slate-800/50 border border-slate-700 p-5 rounded-xl">
                    <p className="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-1">Active Repos</p>
                    <p className="text-3xl font-bold text-emerald-400">
                       {new Set([...state.prs.map(p => p.repository_url), ...state.commits.map(c => c.repository_url)]).size}
                    </p>
                  </div>
               </div>

               <div className="bg-slate-800/30 border border-slate-800 p-6 rounded-xl">
                  <h3 className="text-lg font-medium text-white mb-4">Timeline</h3>
                  <ActivityChart prs={state.prs} commits={state.commits} />
               </div>

               <div className="bg-slate-800/30 border border-slate-800 p-6 rounded-xl">
                  <PRList prs={state.prs} />
               </div>

               {state.generatedReport && (
                 <div className="mt-8 animate-[fadeIn_0.5s_ease-out]">
                   <div className="flex items-center justify-between mb-4">
                     <h3 className="text-xl font-bold text-white flex items-center gap-2">
                       <SparklesIcon /> Generated Review
                     </h3>
                     <button 
                       onClick={() => navigator.clipboard.writeText(state.generatedReport || '')}
                       className="text-xs font-medium text-slate-400 hover:text-white border border-slate-700 hover:border-slate-500 px-3 py-1.5 rounded transition-colors"
                     >
                       Copy
                     </button>
                   </div>
                   <div className="bg-slate-950 border border-slate-800 rounded-xl p-8 shadow-2xl overflow-hidden relative">
                      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-emerald-500"></div>
                      <div className="prose prose-invert prose-sm md:prose-base max-w-none whitespace-pre-wrap font-mono text-slate-300">
                        {state.generatedReport}
                      </div>
                   </div>
                 </div>
               )}
             </div>
           )}
        </div>
      </main>
    </div>
  );
};

export default App;