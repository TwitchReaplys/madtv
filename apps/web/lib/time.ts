export function unixSecondsIn(secondsFromNow: number) {
  return Math.floor(Date.now() / 1000) + secondsFromNow;
}
