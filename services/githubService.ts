import { GitHubPR, GitHubCommit, GitHubUser, GitHubRepo } from '../types';

const GITHUB_API_BASE = 'https://api.github.com';

/**
 * Validates the token and fetches the authenticated user's profile.
 */
export const fetchAuthenticatedUser = async (token: string): Promise<GitHubUser> => {
  const response = await fetch(`${GITHUB_API_BASE}/user`, {
    headers: {
      'Authorization': `token ${token}`,
      'Accept': 'application/vnd.github.v3+json',
    }
  });

  await handleErrors(response);
  return response.json();
};

/**
 * Fetches repositories the user has access to.
 * Sorted by pushed_at to show most recently active ones first.
 * Fetches up to 300 repositories (3 pages) to handle users with many repos.
 */
export const fetchUserRepositories = async (token: string): Promise<GitHubRepo[]> => {
  let allRepos: any[] = [];
  let page = 1;
  const perPage = 100;

  // Fetch up to 3 pages (300 repos)
  while (page <= 3) {
    const url = `${GITHUB_API_BASE}/user/repos?sort=pushed&per_page=${perPage}&type=all&page=${page}`;
    const response = await fetch(url, {
      headers: {
        'Authorization': `token ${token}`,
        'Accept': 'application/vnd.github.v3+json',
      }
    });

    await handleErrors(response);
    const data = await response.json();
    
    if (data.length === 0) break;
    allRepos = [...allRepos, ...data];
    if (data.length < perPage) break;
    page++;
  }
  
  return allRepos.map((repo: any) => ({
    id: repo.id,
    name: repo.name,
    full_name: repo.full_name,
    private: repo.private,
    html_url: repo.html_url,
    url: repo.url,
    description: repo.description,
    language: repo.language,
    updated_at: repo.updated_at
  }));
};

/**
 * Helper to fetch multiple pages of search results to ensure we get enough data
 */
const fetchSearchPages = async (url: string, headers: HeadersInit, maxPages = 10) => {
  let allItems: any[] = [];
  let currentPage = 1;

  while (currentPage <= maxPages) {
    const pageUrl = `${url}&page=${currentPage}`;
    const response = await fetch(pageUrl, { headers });
    await handleErrors(response);
    const data = await response.json();
    const items = data.items || [];
    
    if (items.length === 0) break;
    allItems = [...allItems, ...items];
    
    // If we got less than the per_page limit (100), we reached the end
    if (items.length < 100) break;
    currentPage++;
  }
  return allItems;
};

/**
 * Fetches Pull Requests for a specific user within a date range.
 */
export const fetchUserPullRequests = async (
  username: string,
  token: string,
  startDate: string,
  endDate: string
): Promise<GitHubPR[]> => {
  if (!username) throw new Error('Username is required');

  const headers: HeadersInit = {
    'Accept': 'application/vnd.github.v3+json',
  };

  if (token) {
    headers['Authorization'] = `token ${token}`;
  }

  // Construct search query: author:user type:pr created:start..end
  const query = `author:${username} type:pr created:${startDate}..${endDate}`;
  const encodedQuery = encodeURIComponent(query);
  
  // Fetch up to 10 pages (1000 items) to cover active users working across many repos
  // GitHub Search API limit is 1000 results.
  const url = `${GITHUB_API_BASE}/search/issues?q=${encodedQuery}&per_page=100&sort=created&order=desc`;

  try {
    const items = await fetchSearchPages(url, headers, 10);
    
    // Map basic info
    const basicPRs = items.map((item: any) => ({
      id: item.id,
      number: item.number,
      title: item.title,
      html_url: item.html_url,
      api_url: item.url, // Store API url for fetching details
      state: item.state,
      created_at: item.created_at,
      merged_at: item.pull_request?.merged_at || null,
      body: item.body,
      repository_url: item.repository_url,
    }));

    // Fetch details (additions/deletions) for the top 20 PRs to show impact visuals
    // We only enrich the top 20 most recent ones to save API calls
    const prsToEnrich = basicPRs.slice(0, 20);
    const restPRs = basicPRs.slice(20);

    const enrichedPRs = await Promise.all(prsToEnrich.map(async (pr: any) => {
      try {
        const detailsRes = await fetch(pr.api_url, { headers });
        if (detailsRes.ok) {
          const details = await detailsRes.json();
          return {
            ...pr,
            additions: details.additions,
            deletions: details.deletions
          };
        }
        return pr;
      } catch (e) {
        return pr;
      }
    }));

    return [...enrichedPRs, ...restPRs];

  } catch (error: any) {
    console.error("Fetch PR Error:", error);
    throw new Error(error.message || 'Failed to fetch pull requests');
  }
};

/**
 * Fetches Commits for a specific user within a date range.
 */
export const fetchUserCommits = async (
  username: string,
  token: string,
  startDate: string,
  endDate: string
): Promise<GitHubCommit[]> => {
  if (!username) throw new Error('Username is required');

  const headers: HeadersInit = {
    'Accept': 'application/vnd.github.cloak-preview+json',
  };

  if (token) {
    headers['Authorization'] = `token ${token}`;
  }

  const query = `author:${username} committer-date:${startDate}..${endDate}`;
  const encodedQuery = encodeURIComponent(query);
  
  // Fetch up to 10 pages (1000 items)
  const url = `${GITHUB_API_BASE}/search/commits?q=${encodedQuery}&per_page=100&sort=committer-date&order=desc`;

  try {
    const items = await fetchSearchPages(url, headers, 10);

    return items.map((item: any) => ({
      sha: item.sha,
      message: item.commit.message,
      html_url: item.html_url,
      date: item.commit.author.date,
      repository_url: item.repository?.html_url || 'Unknown Repo',
    }));

  } catch (error: any) {
    console.error("Fetch Commit Error:", error);
    throw new Error(error.message || 'Failed to fetch commits');
  }
};

async function handleErrors(response: Response) {
  if (!response.ok) {
    if (response.status === 403) {
      throw new Error('GitHub API rate limit exceeded. Please try again later.');
    }
    if (response.status === 401) {
      throw new Error('Invalid GitHub Token.');
    }
    if (response.status === 422) {
      // Often happens if date range is invalid or query is too long
      throw new Error('Validation Failed. Try a shorter date range.');
    }
    throw new Error(`GitHub API Error: ${response.statusText}`);
  }
}