import { HttpError } from "../utils/http-error.js";
import { normalizeLeetCodeAcceptedSubmission, normalizeLeetCodeStats } from "../utils/leetcode-normalizer.js";

const LEETCODE_GRAPHQL_URL = "https://leetcode.com/graphql";
const ACCEPTED_SUBMISSION_LIMIT = 1000;

async function callLeetCode(query, variables) {
  let response;
  try {
    response = await fetch(LEETCODE_GRAPHQL_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json",
        "Origin": "https://leetcode.com",
        "Referer": "https://leetcode.com/",
        "User-Agent": "Mozilla/5.0 (compatible; CodeTrack/1.0; educational project)"
      },
      body: JSON.stringify({ query, variables }),
      signal: AbortSignal.timeout(15000)
    });
  } catch {
    throw new HttpError(502, "Could not reach LeetCode. Check your connection and try again.");
  }

  if (!response.ok) {
    if (response.status === 404) throw new HttpError(404, "LeetCode profile was not found.");
    if (response.status === 429) throw new HttpError(429, "LeetCode is rate-limiting requests. Wait a little and try again.");
    throw new HttpError(502, `LeetCode returned HTTP ${response.status}. Its public endpoint may be temporarily unavailable.`);
  }

  let payload;
  try {
    payload = await response.json();
  } catch {
    throw new HttpError(502, "LeetCode returned an unreadable response.");
  }

  if (Array.isArray(payload.errors) && payload.errors.length) {
    const message = String(payload.errors[0]?.message || "LeetCode GraphQL request failed");
    if (/not found|does not exist|invalid username/i.test(message)) {
      throw new HttpError(404, "That LeetCode username was not found. Check the spelling and try again.");
    }
    throw new HttpError(502, "LeetCode did not return public profile data. Try again later; its public endpoint can change or block requests.");
  }

  return payload.data;
}

export async function getLeetCodeConnectionSnapshot(username) {
  const profileQuery = `
    query userProfilePublicProfile($username: String!) {
      matchedUser(username: $username) {
        username
        profile { realName userAvatar ranking }
        submitStats { acSubmissionNum { difficulty count submissions } }
      }
    }
  `;
  const acceptedSubmissionsQuery = `
    query recentAcSubmissions($username: String!, $limit: Int!) {
      recentAcSubmissionList(username: $username, limit: $limit) {
        id title titleSlug timestamp
      }
    }
  `;

  const [profileData, submissionData] = await Promise.all([
    callLeetCode(profileQuery, { username }),
    callLeetCode(acceptedSubmissionsQuery, { username, limit: ACCEPTED_SUBMISSION_LIMIT })
  ]);

  const matchedUser = profileData?.matchedUser;
  if (!matchedUser) {
    throw new HttpError(404, "That LeetCode username was not found or its profile is not public.");
  }

  const acceptedSubmissions = (submissionData?.recentAcSubmissionList || [])
    .map(normalizeLeetCodeAcceptedSubmission)
    .filter(Boolean)
    .sort((a, b) => b.timestamp - a.timestamp);
  const stats = normalizeLeetCodeStats(matchedUser.submitStats?.acSubmissionNum || []);

  return {
    platform: "LeetCode",
    syncedAt: new Date().toISOString(),
    historyLimit: ACCEPTED_SUBMISSION_LIMIT,
    historyIsComplete: acceptedSubmissions.length < ACCEPTED_SUBMISSION_LIMIT,
    profile: {
      username: matchedUser.username,
      realName: matchedUser.profile?.realName || null,
      avatar: matchedUser.profile?.userAvatar || null,
      ranking: matchedUser.profile?.ranking ?? null
    },
    summary: {
      ...stats,
      acceptedSubmissionsObserved: acceptedSubmissions.length,
      activeDaysObserved: new Set(acceptedSubmissions.map(item => new Date(item.timestamp * 1000).toISOString().slice(0, 10))).size
    },
    acceptedSubmissions
  };
}
