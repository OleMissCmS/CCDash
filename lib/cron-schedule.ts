/** True when `date` is the Monday immediately before the month's second Tuesday. */
export function isMondayBeforeSecondTuesday(date: Date): boolean {
  const monday = getMondayBeforeSecondTuesday(
    date.getFullYear(),
    date.getMonth()
  );
  return (
    date.getFullYear() === monday.getFullYear() &&
    date.getMonth() === monday.getMonth() &&
    date.getDate() === monday.getDate()
  );
}

export function getMondayBeforeSecondTuesday(year: number, month: number): Date {
  const secondTuesday = getNthWeekdayOfMonth(year, month, 2, 2);
  const monday = new Date(secondTuesday);
  monday.setDate(secondTuesday.getDate() - 1);
  return monday;
}

function getNthWeekdayOfMonth(
  year: number,
  month: number,
  weekday: number,
  occurrence: number
): Date {
  let count = 0;
  for (let day = 1; day <= 31; day += 1) {
    const date = new Date(year, month, day);
    if (date.getMonth() !== month) break;
    if (date.getDay() === weekday) {
      count += 1;
      if (count === occurrence) return date;
    }
  }
  throw new Error(`No ${occurrence} weekday ${weekday} in ${year}-${month + 1}`);
}
