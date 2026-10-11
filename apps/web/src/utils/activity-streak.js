function localDateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function addDaysToKey(dateKey, amount) {
  const [year, month, day] = dateKey.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day + amount));
  return date.toISOString().slice(0, 10);
}

export function calculateActivityStreak(activities, now = new Date(), daysToShow = 35) {
  const byDate = new Map();

  for (const activity of activities || []) {
    const timestamp = Number(activity?.timestamp);
    if (!Number.isFinite(timestamp) || timestamp <= 0) continue;
    const dateKey = localDateKey(new Date(timestamp * 1000));
    const entry = byDate.get(dateKey) || { date: dateKey, count: 0, platforms: new Set() };
    entry.count += 1;
    if (activity.platform) entry.platforms.add(activity.platform);
    byDate.set(dateKey, entry);
  }

  const activeDates = [...byDate.keys()].sort();
  const activeDateSet = new Set(activeDates);
  const today = localDateKey(now);
  const yesterday = addDaysToKey(today, -1);
  const todayActive = activeDateSet.has(today);
  let currentStreak = 0;

  if (todayActive || activeDateSet.has(yesterday)) {
    let cursor = todayActive ? today : yesterday;
    while (activeDateSet.has(cursor)) {
      currentStreak += 1;
      cursor = addDaysToKey(cursor, -1);
    }
  }

  let longestStreak = 0;
  let runningStreak = 0;
  let previousDate = null;
  for (const dateKey of activeDates) {
    if (previousDate && addDaysToKey(previousDate, 1) === dateKey) runningStreak += 1;
    else runningStreak = 1;
    longestStreak = Math.max(longestStreak, runningStreak);
    previousDate = dateKey;
  }

  const grid = Array.from({ length: Math.max(1, daysToShow) }, (_, index) => {
    const date = addDaysToKey(today, index - Math.max(1, daysToShow) + 1);
    const entry = byDate.get(date);
    return {
      date,
      count: entry?.count || 0,
      platforms: entry ? [...entry.platforms] : [],
      active: Boolean(entry)
    };
  });

  return {
    currentStreak,
    longestStreak,
    solvedDays: activeDates.length,
    todayActive,
    activeDates,
    grid
  };
}
