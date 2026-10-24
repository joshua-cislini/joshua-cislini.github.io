// Fetches the last 20 weeks of contributions via the GitHub GraphQL API and writes
// data/github-contributions.json. Run by .github/workflows/update-github-chart.yml.
// Usage: GH_TOKEN=... GH_LOGIN=joshua-cislini node scripts/generate-github-chart.mjs
import { writeFile, mkdir } from "node:fs/promises";

const LOGIN = process.env.GH_LOGIN || "joshua-cislini";
const TOKEN = process.env.GH_TOKEN;
const WEEKS = 20;
if (!TOKEN) { console.error("GH_TOKEN is required"); process.exit(1); }

const LEVELS = { NONE: 0, FIRST_QUARTILE: 1, SECOND_QUARTILE: 2, THIRD_QUARTILE: 3, FOURTH_QUARTILE: 4 };
const to = new Date();
// Pull a 22-week buffer to ensure our new Mon-Sun chunks are fully populated
const from = new Date(to.getTime() - (22 * 7) * 86400000);

const query = `query($login:String!,$from:DateTime!,$to:DateTime!){
  user(login:$login){ contributionsCollection(from:$from,to:$to){ contributionCalendar{
    weeks{ contributionDays{ date contributionCount contributionLevel weekday } } } } } }`;

const res = await fetch("https://api.github.com/graphql", {
  method: "POST",
  headers: { Authorization: `Bearer ${TOKEN}`, "Content-Type": "application/json", "User-Agent": "chart-generator" },
  body: JSON.stringify({ query, variables: { login: LOGIN, from: from.toISOString(), to: to.toISOString() } }),
});
const json = await res.json();
if (!res.ok || json.errors) { console.error(JSON.stringify(json.errors || json)); process.exit(1); }

// 1. Flatten all days chronologically to break out of GitHub's Sunday-start chunks
const allDays = json.data.user.contributionsCollection.contributionCalendar.weeks.flatMap(w => w.contributionDays);

// 2. Re-chunk the days starting on Monday (0) and ending on Sunday (6)
const rawWeeks = [];
let currentWeek = Array(7).fill(null);

for (const d of allDays) {
  const shiftedWeekday = (d.weekday + 6) % 7; // Shift so Mon=0 ... Sun=6
  currentWeek[shiftedWeekday] = { d: d.date, c: d.contributionCount, l: LEVELS[d.contributionLevel] ?? 0 };

  // If we hit Sunday (6), the column is complete. Push it and start a new one.
  if (shiftedWeekday === 6) {
    rawWeeks.push(currentWeek);
    currentWeek = Array(7).fill(null);
  }
}
// Push the final partial week if it contains any days
if (currentWeek.some(day => day !== null)) {
  rawWeeks.push(currentWeek);
}

// 3. Keep exactly the last WEEKS (20) so the CSS grid doesn't overflow
const finalWeeks = rawWeeks.slice(-WEEKS);

// 4. Calculate the accurate total only for the visible cells
let total = 0;
for (const w of finalWeeks) {
  for (const d of w) {
    if (d) total += d.c;
  }
}

await mkdir("data", { recursive: true });
await writeFile("data/github-contributions.json",
  JSON.stringify({ generated: to.toISOString(), login: LOGIN, total, weeks: finalWeeks }) + "\n");
console.log(`Wrote ${finalWeeks.length} weeks, ${total} contributions`);