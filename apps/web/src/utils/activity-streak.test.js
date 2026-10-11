import test from "node:test";
import assert from "node:assert/strict";
import { calculateActivityStreak } from "./activity-streak.js";

const localTimestamp = (year, month, day, hour = 12) => new Date(year, month - 1, day, hour).getTime() / 1000;

test("combines platform activity into one streak and longest streak", () => {
  const now = new Date(2026, 9, 11, 10);
  const result = calculateActivityStreak([
    { timestamp: localTimestamp(2026, 10, 9), platform: "Codeforces" },
    { timestamp: localTimestamp(2026, 10, 10), platform: "LeetCode" },
    { timestamp: localTimestamp(2026, 10, 10, 17), platform: "Codeforces" }
  ], now, 7);

  assert.equal(result.currentStreak, 2);
  assert.equal(result.longestStreak, 2);
  assert.equal(result.solvedDays, 2);
  assert.equal(result.todayActive, false);
  assert.equal(result.grid.find(day => day.date === "2026-10-10").count, 2);
});

test("a streak starts at zero after both today and yesterday have no activity", () => {
  const now = new Date(2026, 9, 11, 10);
  const result = calculateActivityStreak([
    { timestamp: localTimestamp(2026, 10, 8), platform: "Codeforces" }
  ], now, 7);

  assert.equal(result.currentStreak, 0);
  assert.equal(result.longestStreak, 1);
});

test("today's solve extends a streak immediately", () => {
  const now = new Date(2026, 9, 11, 10);
  const result = calculateActivityStreak([
    { timestamp: localTimestamp(2026, 10, 10), platform: "LeetCode" },
    { timestamp: localTimestamp(2026, 10, 11), platform: "Codeforces" }
  ], now, 7);

  assert.equal(result.currentStreak, 2);
  assert.equal(result.todayActive, true);
});
