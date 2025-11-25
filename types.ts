export interface GitHubPR {
  id: number;
  number: number;
  title: string;
  html_url: string;
  state: string;
  created_at: string;
  merged_at: string | null;
  body: string | null;
  repository_url: string;
  additions?: number;
  deletions?: number;
}

export interface GitHubCommit {
  sha: string;
  message: string;
  html_url: string;
  date: string;
  repository_url: string;
}

export interface GitHubUser {
  login: string;
  avatar_url: string;
  name: string;
}

export interface GitHubRepo {
  id: number;
  name: string;
  full_name: string;
  private: boolean;
  html_url: string;
  url: string; // API url
  description: string | null;
  language: string | null;
  updated_at: string;
}

export interface DateRange {
  startDate: string;
  endDate: string;
}

export type AppStep = 'login' | 'repo_selection' | 'dashboard';

export interface AppState {
  step: AppStep;
  user: GitHubUser | null;
  githubToken: string;
  repositories: GitHubRepo[];
  selectedRepoIds: Set<number>;
  
  dateRange: DateRange;
  status: 'idle' | 'loading' | 'analyzing_ai' | 'complete' | 'error';
  error: string | null;
  
  prs: GitHubPR[];
  commits: GitHubCommit[];
  generatedReport: string | null;
}

export enum ReportTone {
  PROFESSIONAL = 'Professional',
  ENTHUSIASTIC = 'Enthusiastic',
  CONCISE = 'Concise'
}