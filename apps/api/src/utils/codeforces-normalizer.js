export function normalizeSubmission(submission) {
  const problem = submission.problem || {};
  const problemId = problem.contestId != null
    ? `${problem.contestId}-${problem.index || "?"}`
    : `${problem.problemsetName || "problemset"}-${problem.index || problem.name || "unknown"}`;

  const contestId = problem.contestId ?? null;
  const submissionId = submission.id;
  const submissionUrl = contestId != null
    ? `https://codeforces.com/${contestId >= 100000 ? "gym" : "contest"}/${contestId}/submission/${submissionId}`
    : "https://codeforces.com/problemset";

  return {
    submissionId,
    submissionUrl,
    problemId,
    contestId,
    index: problem.index ?? null,
    name: problem.name || "Unknown problem",
    problemUrl: contestId != null && problem.index
      ? `https://codeforces.com/${contestId >= 100000 ? "gym" : "problemset/problem"}/${contestId >= 100000 ? `${contestId}/problem` : contestId}/${problem.index}`
      : "https://codeforces.com/problemset",
    rating: problem.rating ?? null,
    tags: Array.isArray(problem.tags) ? problem.tags : [],
    verdict: submission.verdict || "TESTING",
    language: submission.programmingLanguage || "Unknown",
    creationTimeSeconds: submission.creationTimeSeconds ?? null,
    timeConsumedMillis: submission.timeConsumedMillis ?? null,
    memoryBytes: submission.memoryBytes ?? null
  };
}

export function aggregateSubmissions(submissions) {
  const byProblem = new Map();

  for (const submission of submissions) {
    const existing = byProblem.get(submission.problemId);

    if (!existing) {
      byProblem.set(submission.problemId, {
        problemId: submission.problemId,
        contestId: submission.contestId,
        index: submission.index,
        name: submission.name,
        problemUrl: submission.problemUrl,
        rating: submission.rating,
        tags: submission.tags,
        attemptsObserved: 1,
        solved: submission.verdict === "OK",
        latestVerdict: submission.verdict,
        lastSubmittedAt: submission.creationTimeSeconds,
        submissions: [submission]
      });
      continue;
    }

    existing.attemptsObserved += 1;
    existing.solved ||= submission.verdict === "OK";
    existing.submissions.push(submission);
    if ((submission.creationTimeSeconds ?? 0) > (existing.lastSubmittedAt ?? 0)) {
      existing.lastSubmittedAt = submission.creationTimeSeconds;
      existing.latestVerdict = submission.verdict;
    }
  }

  return [...byProblem.values()]
    .map(problem => ({
      ...problem,
      status: problem.solved ? "Solved" : "Attempted — not solved",
      submissions: problem.submissions.sort((a, b) => b.submissionId - a.submissionId)
    }))
    .sort((a, b) => (b.lastSubmittedAt || 0) - (a.lastSubmittedAt || 0));
}
