import test from "node:test";
import assert from "node:assert/strict";
import { aggregateSubmissions, normalizeSubmission } from "./codeforces-normalizer.js";

test("normalizes a Codeforces submission", () => {
  const normalized = normalizeSubmission({
    id: 123,
    verdict: "OK",
    programmingLanguage: "GNU C++20",
    creationTimeSeconds: 1700000000,
    problem: { contestId: 4, index: "A", name: "Watermelon", rating: 800, tags: ["math"] }
  });

  assert.equal(normalized.submissionId, 123);
  assert.equal(normalized.problemId, "4-A");
  assert.equal(normalized.submissionUrl, "https://codeforces.com/contest/4/submission/123");
  assert.equal(normalized.name, "Watermelon");
  assert.equal(normalized.verdict, "OK");
});

test("counts each problem once and marks solved if any attempt is accepted", () => {
  const submissions = [
    { submissionId: 3, problemId: "4-A", contestId: 4, index: "A", name: "Watermelon", problemUrl: "https://codeforces.com/problemset/problem/4/A", rating: 800, tags: ["math"], verdict: "OK", creationTimeSeconds: 30 },
    { submissionId: 2, problemId: "4-A", contestId: 4, index: "A", name: "Watermelon", problemUrl: "https://codeforces.com/problemset/problem/4/A", rating: 800, tags: ["math"], verdict: "WRONG_ANSWER", creationTimeSeconds: 20 },
    { submissionId: 1, problemId: "4-B", contestId: 4, index: "B", name: "Another", problemUrl: "https://codeforces.com/problemset/problem/4/B", rating: 900, tags: ["math"], verdict: "WRONG_ANSWER", creationTimeSeconds: 10 }
  ];

  const problems = aggregateSubmissions(submissions);
  assert.equal(problems.length, 2);
  assert.equal(problems.find(problem => problem.problemId === "4-A").attemptsObserved, 2);
  assert.equal(problems.find(problem => problem.problemId === "4-A").solved, true);
  assert.equal(problems.find(problem => problem.problemId === "4-B").status, "Attempted — not solved");
});


test("uses the Codeforces Gym submission URL for gym contest submissions", () => {
  const normalized = normalizeSubmission({
    id: 456,
    verdict: "WRONG_ANSWER",
    problem: { contestId: 100123, index: "A", name: "Gym problem" }
  });

  assert.equal(normalized.submissionUrl, "https://codeforces.com/gym/100123/submission/456");
  assert.equal(normalized.problemUrl, "https://codeforces.com/gym/100123/problem/A");
});
