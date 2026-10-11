import test from "node:test";
import assert from "node:assert/strict";
import { normalizeLeetCodeAcceptedSubmission, normalizeLeetCodeStats } from "./leetcode-normalizer.js";

test("normalizes an accepted LeetCode submission and builds its problem URL", () => {
  const normalized = normalizeLeetCodeAcceptedSubmission({
    id: "987654321",
    title: "Two Sum",
    titleSlug: "two-sum",
    timestamp: "1700000000"
  });

  assert.equal(normalized.submissionId, "987654321");
  assert.equal(normalized.title, "Two Sum");
  assert.equal(normalized.problemUrl, "https://leetcode.com/problems/two-sum/");
  assert.equal(normalized.timestamp, 1700000000);
});

test("ignores malformed accepted submissions", () => {
  assert.equal(normalizeLeetCodeAcceptedSubmission({ titleSlug: "two-sum", timestamp: "invalid" }), null);
});

test("normalizes LeetCode solved counts", () => {
  assert.deepEqual(normalizeLeetCodeStats([
    { difficulty: "All", count: 125 },
    { difficulty: "Easy", count: 60 },
    { difficulty: "Medium", count: 55 },
    { difficulty: "Hard", count: 10 }
  ]), { totalSolved: 125, easySolved: 60, mediumSolved: 55, hardSolved: 10 });
});
