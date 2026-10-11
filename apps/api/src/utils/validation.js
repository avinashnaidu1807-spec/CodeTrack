import { HttpError } from "./http-error.js";

export function validateCodeforcesHandle(value) {
  const handle = typeof value === "string" ? value.trim() : "";

  if (!handle || handle.length > 24 || !/^[A-Za-z0-9_.-]+$/.test(handle)) {
    throw new HttpError(
      400,
      "Enter a valid Codeforces handle (letters, numbers, underscore, dot, or hyphen; up to 24 characters)."
    );
  }

  return handle;
}

export function validateLeetCodeUsername(value) {
  const username = typeof value === "string" ? value.trim() : "";

  if (!username || username.length > 30 || !/^[A-Za-z0-9_-]+$/.test(username)) {
    throw new HttpError(
      400,
      "Enter a valid LeetCode username (letters, numbers, underscores, or hyphens; up to 30 characters)."
    );
  }

  return username;
}
