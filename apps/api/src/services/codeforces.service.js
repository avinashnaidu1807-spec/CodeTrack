import { config } from "../config/env.js";
import { HttpError } from "../utils/http-error.js";
import { aggregateSubmissions, normalizeSubmission } from "../utils/codeforces-normalizer.js";

const API_BASE_URL = "https://codeforces.com/api";
const MIN_REQUEST_INTERVAL_MS = 2100;
let lastRequestAt = 0;

async function waitForRateLimitSlot() {
  const waitMs = Math.max(0, lastRequestAt + MIN_REQUEST_INTERVAL_MS - Date.now());
  if (waitMs > 0) await new Promise(resolve => setTimeout(resolve, waitMs));
  lastRequestAt = Date.now();
}

async function callCodeforces(method, params) {
  await waitForRateLimitSlot();

  const url = new URL(`${API_BASE_URL}/${method}`);
  Object.entries(params).forEach(([key, value]) => {
    url.searchParams.set(key, String(value));
  });

  let response;
  try {
    response = await fetch(url, {
      headers: { "User-Agent": "CodeTrack/1.0 (educational project)" },
      signal: AbortSignal.timeout(15000)
    });
  } catch {
    throw new HttpError(502, "Could not reach Codeforces. Check the connection and try again.");
  }

  if (!response.ok) {
    throw new HttpError(502, `Codeforces returned HTTP ${response.status}. Try again later.`);
  }

  let payload;
  try {
    payload = await response.json();
  } catch {
    throw new HttpError(502, "Codeforces returned an unreadable response.");
  }

  if (payload.status !== "OK") {
    const comment = String(payload.comment || "Codeforces API request failed");
    if (comment.toLowerCase().includes("not found")) {
      throw new HttpError(404, "That Codeforces handle was not found. Check the spelling and try again.");
    }
    throw new HttpError(502, `Codeforces API error: ${comment}`);
  }

  return payload.result;
}

export async function getCodeforcesConnectionSnapshot(handle) {
  const [profiles] = await Promise.all([
    callCodeforces("user.info", { handles: handle })
  ]);
  const profile = profiles[0];

  const rawSubmissions = await callCodeforces("user.status", {
    handle: profile.handle,
    from: 1,
    count: config.codeforcesMaxSubmissions
  });

  const submissions = rawSubmissions.map(normalizeSubmission);
  const problems = aggregateSubmissions(submissions);
  const acceptedSubmissionCount = submissions.filter(item => item.verdict === "OK").length;

  return {
    platform: "Codeforces",
    syncedAt: new Date().toISOString(),
    historyLimit: config.codeforcesMaxSubmissions,
    historyIsComplete: rawSubmissions.length < config.codeforcesMaxSubmissions,
    profile: {
      handle: profile.handle,
      avatar: profile.titlePhoto || profile.avatar || null,
      rank: profile.rank || "Unrated",
      rating: profile.rating ?? null,
      maxRank: profile.maxRank || "Unrated",
      maxRating: profile.maxRating ?? null,
      contribution: profile.contribution ?? 0,
      friendOfCount: profile.friendOfCount ?? null,
      registrationTimeSeconds: profile.registrationTimeSeconds ?? null,
      lastOnlineTimeSeconds: profile.lastOnlineTimeSeconds ?? null
    },
    summary: {
      submissionsObserved: submissions.length,
      acceptedSubmissionsObserved: acceptedSubmissionCount,
      uniqueProblemsAttempted: problems.length,
      uniqueProblemsSolved: problems.filter(problem => problem.solved).length,
      attemptedNotSolved: problems.filter(problem => !problem.solved).length
    },
    problems,
    submissions
  };
}
