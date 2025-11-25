import { GoogleGenAI } from "@google/genai";
import { GitHubPR, GitHubCommit, ReportTone } from '../types';

const getClient = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    throw new Error("API Key not found in environment variables");
  }
  return new GoogleGenAI({ apiKey });
};

export const generateSelfReview = async (
  username: string,
  prs: GitHubPR[],
  commits: GitHubCommit[],
  tone: ReportTone,
  customFocus?: string
): Promise<string> => {
  const ai = getClient();
  const modelId = 'gemini-2.5-flash';

  // Prepare data for the model
  const prSummary = prs.map(pr => 
    `- [PR ${pr.state.toUpperCase()}] ${pr.title} (Repo: ${pr.repository_url.split('/').pop()}) - Date: ${pr.created_at.split('T')[0]}\n  Summary: ${pr.body ? pr.body.slice(0, 200).replace(/\n/g, ' ') + '...' : 'No description'}`
  ).join('\n');

  const commitSummary = commits.map(c => 
    `- [Commit] ${c.message.split('\n')[0]} (Repo: ${c.repository_url.split('/').pop()}) - Date: ${c.date.split('T')[0]}`
  ).join('\n');

  const systemInstruction = `
    You are an expert Engineering Manager and Career Coach. 
    Your goal is to help an Individual Contributor (IC) write a high-impact "Brag Document" or Self-Performance Review based on their GitHub activity (Pull Requests and Commits).
    
    Focus on:
    1. Impact: What business value did this bring?
    2. Complexity: What technical challenges were solved?
    3. Leadership: Did they mentor, review code, or drive initiatives?
    4. Consistency: Look at the commit history to gauge steady progress or intense sprints.
    
    Do not just list the PRs or commits. Synthesize them into a narrative.
  `;

  const prompt = `
    Candidate Username: ${username}
    Tone: ${tone}
    Additional Focus/Context: ${customFocus || "General performance review"}
    
    Here is the list of Pull Requests from the selected period:
    ${prSummary}

    Here is the list of recent Commits (sampled) to provide context on code-level activity:
    ${commitSummary}
    
    Please generate a structured performance review in Markdown format with the following sections:
    1. **Executive Summary**: A 2-3 sentence elevator pitch of the period's achievements.
    2. **Key Accomplishments**: Grouped by theme (e.g., Feature Work, Bug Fixes, Infrastructure, Maintenance).
    3. **Technical Growth**: Technologies used and hard skills demonstrated.
    4. **Impact Analysis**: How these contributions helped the team/company.
    5. **Areas for Future Focus**: Suggestions based on the work done (e.g., "You did a lot of bug fixes, try leading a feature next").

    Use formatting (bolding, lists) to make it readable.
  `;

  try {
    const response = await ai.models.generateContent({
      model: modelId,
      contents: prompt,
      config: {
        systemInstruction: systemInstruction,
        temperature: 0.7,
      }
    });

    return response.text || "Failed to generate report.";
  } catch (error) {
    console.error("Gemini Generation Error:", error);
    throw error;
  }
};