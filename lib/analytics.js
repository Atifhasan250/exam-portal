export const getLocalDateString = (date = new Date()) => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/**
 * Returns the current consecutive-day streak where ALL habits were completed.
 */
export function getCurrentStreak(habits, history) {
  if (!habits || habits.length === 0) return 0;
  let streak = 0;
  const today = new Date();
  for (let i = 0; i < 365; i++) {
    const date = new Date(today);
    date.setDate(today.getDate() - i);
    const dateStr = getLocalDateString(date);
    const dayHabits = history[dateStr] || {};
    const allCompleted = habits.every((h) => dayHabits[h.id]);
    if (allCompleted) {
      streak++;
    } else if (i > 0) {
      break;
    }
  }
  return streak;
}

/**
 * Returns the best-ever consecutive-day streak.
 */
export function getBestStreak(habits, history) {
  if (!habits || habits.length === 0) return 0;
  
  const dates = Object.keys(history).sort();
  if (dates.length === 0) return 0;
  
  let bestStreak = 0;
  let currentStreak = 0;
  
  const earliest = new Date(dates[0] + "T00:00:00");
  const latest = new Date(dates[dates.length - 1] + "T00:00:00");
  const dayCount = Math.ceil((latest.getTime() - earliest.getTime()) / (1000 * 60 * 60 * 24)) + 1;
  
  for (let i = 0; i < dayCount; i++) {
    const date = new Date(earliest);
    date.setDate(earliest.getDate() + i);
    const dateStr = getLocalDateString(date);
    const dayHabits = history[dateStr] || {};
    const allCompleted = habits.every((h) => dayHabits[h.id]);
    
    if (allCompleted) {
      currentStreak++;
      bestStreak = Math.max(bestStreak, currentStreak);
    } else {
      currentStreak = 0;
    }
  }
  
  return bestStreak;
}

/**
 * 7-day rolling average completion percentage.
 */
export function get7DayAverage(habits, history) {
  if (!habits || habits.length === 0) return 0;
  
  const today = new Date();
  let totalPercent = 0;
  
  for (let i = 0; i < 7; i++) {
    const date = new Date(today);
    date.setDate(today.getDate() - i);
    const dateStr = getLocalDateString(date);
    const dayHabits = history[dateStr] || {};
    const completedCount = Object.values(dayHabits).filter(Boolean).length;
    totalPercent += (completedCount / habits.length) * 100;
  }
  
  return Math.round(totalPercent / 7);
}

/**
 * Tasks completed this week vs last week.
 */
export function getWeekOverWeekComparison(weeks) {
  if (!weeks || weeks.length === 0) return { thisWeek: 0, lastWeek: 0, changePercent: 0, direction: "same" };

  const today = new Date();
  const startOfThisWeek = new Date(today);
  startOfThisWeek.setDate(today.getDate() - today.getDay());
  startOfThisWeek.setHours(0, 0, 0, 0);
  
  const startOfLastWeek = new Date(startOfThisWeek);
  startOfLastWeek.setDate(startOfLastWeek.getDate() - 7);
  
  let thisWeekCount = 0;
  let lastWeekCount = 0;
  
  weeks.forEach((week) => {
    week.tasks.forEach((task) => {
      if (task.completed && task.completedDate) {
        const completedDate = new Date(task.completedDate + "T00:00:00");
        if (completedDate >= startOfThisWeek) {
          thisWeekCount++;
        } else if (completedDate >= startOfLastWeek && completedDate < startOfThisWeek) {
          lastWeekCount++;
        }
      }
    });
  });
  
  const changePercent = lastWeekCount > 0
    ? Math.round(((thisWeekCount - lastWeekCount) / lastWeekCount) * 100)
    : thisWeekCount > 0 ? 100 : 0;
  
  return {
    thisWeek: thisWeekCount,
    lastWeek: lastWeekCount,
    changePercent: Math.abs(changePercent),
    direction: thisWeekCount > lastWeekCount ? "up" : thisWeekCount < lastWeekCount ? "down" : "same",
  };
}

/**
 * "Power Days" — days where ALL habits were done AND at least one task was completed.
 */
export function getPowerDays(habits, history, weeks) {
  if (!habits || habits.length === 0) return [];
  
  const taskCompletionDates = new Set();
  if (weeks) {
    weeks.forEach((week) => {
      week.tasks.forEach((task) => {
        if (task.completed && task.completedDate) {
          taskCompletionDates.add(task.completedDate);
        }
      });
    });
  }
  
  const powerDays = [];
  
  Object.keys(history).forEach((dateStr) => {
    const dayHabits = history[dateStr] || {};
    const allHabitsDone = habits.every((h) => dayHabits[h.id]);
    const hasCompletedTask = taskCompletionDates.has(dateStr);
    
    if (allHabitsDone && hasCompletedTask) {
      powerDays.push(dateStr);
    }
  });
  
  return powerDays;
}

/**
 * Consistency score (0-100): measures how regularly the user engages.
 * Based on percentage of days with any activity in the last 30 days.
 */
export function getConsistencyScore(history, weeks) {
  const today = new Date();
  let activeDays = 0;
  
  const taskCompletionDates = new Set();
  if (weeks) {
    weeks.forEach((week) => {
      week.tasks.forEach((task) => {
        if (task.completed && task.completedDate) {
          taskCompletionDates.add(task.completedDate);
        }
      });
    });
  }
  
  for (let i = 0; i < 30; i++) {
    const date = new Date(today);
    date.setDate(today.getDate() - i);
    const dateStr = getLocalDateString(date);
    
    const dayHabits = history[dateStr] || {};
    const hasHabitActivity = Object.values(dayHabits).some(Boolean);
    const hasTaskActivity = taskCompletionDates.has(dateStr);
    
    if (hasHabitActivity || hasTaskActivity) {
      activeDays++;
    }
  }
  
  return Math.round((activeDays / 30) * 100);
}

/**
 * Total active days — how many days the user has logged something.
 */
export function getTotalActiveDays(history, weeks) {
  const activeDates = new Set();
  
  Object.keys(history).forEach((dateStr) => {
    const dayHabits = history[dateStr] || {};
    if (Object.values(dayHabits).some(Boolean)) {
      activeDates.add(dateStr);
    }
  });
  
  if (weeks) {
    weeks.forEach((week) => {
      week.tasks.forEach((task) => {
        if (task.completed && task.completedDate) {
          activeDates.add(task.completedDate);
        }
      });
    });
  }
  
  return activeDates.size;
}
