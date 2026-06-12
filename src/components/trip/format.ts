export function formatRouteFacts(totalMiles: number | null, driveTimeMinutes: number | null) {
  const facts = [
    totalMiles === null ? null : `${totalMiles} mi`,
    driveTimeMinutes === null ? null : formatDuration(driveTimeMinutes),
  ].filter(Boolean);

  return facts.length > 0 ? facts.join(" / ") : "Route facts pending";
}

export function formatDuration(minutes: number) {
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  if (hours === 0) {
    return `${remainingMinutes} min`;
  }
  if (remainingMinutes === 0) {
    return `${hours} hr`;
  }
  return `${hours} hr ${remainingMinutes} min`;
}

export function formatDate(date: string) {
  const parsed = new Date(`${date}T00:00:00`);
  return new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  }).format(parsed);
}

export function formatTime(date: Date) {
  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}
