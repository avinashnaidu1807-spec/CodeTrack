export function normalizeLeetCodeAcceptedSubmission(submission) {
  const titleSlug = String(submission?.titleSlug || "").trim();
  const timestamp = Number(submission?.timestamp);
  if (!titleSlug || !Number.isFinite(timestamp) || timestamp <= 0) return null;

  return {
    submissionId: String(submission.id ?? ""),
    title: String(submission.title || titleSlug),
    titleSlug,
    timestamp,
    problemUrl: `https://leetcode.com/problems/${encodeURIComponent(titleSlug)}/`,
    submissionUrl: submission.id
      ? `https://leetcode.com/submissions/detail/${encodeURIComponent(String(submission.id))}/`
      : `https://leetcode.com/problems/${encodeURIComponent(titleSlug)}/`
  };
}

export function normalizeLeetCodeStats(acSubmissionNum = []) {
  const byDifficulty = new Map(acSubmissionNum.map(item => [item.difficulty, Number(item.count) || 0]));
  return {
    totalSolved: byDifficulty.get("All") ?? 0,
    easySolved: byDifficulty.get("Easy") ?? 0,
    mediumSolved: byDifficulty.get("Medium") ?? 0,
    hardSolved: byDifficulty.get("Hard") ?? 0
  };
}
