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
const from = new Date(to.getTime() - (WEEKS * 7 - 1) * 86400000);

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

const apiWeeks = json.data.user.contributionsCollection.contributionCalendar.weeks.slice(-WEEKS);
let total = 0;
const weeks = apiWeeks.map((w) => {
  const col = Array(7).fill(null); // index = weekday (0 = Monday); null = day outside the range
  for (const d of w.contributionDays) {
    // Shift the index so Monday is 0, Tuesday is 1 ... Sunday is 6
    const shiftedWeekday = (d.weekday + 6) % 7;
    col[shiftedWeekday] = { d: d.date, c: d.contributionCount, l: LEVELS[d.contributionLevel] ?? 0 };
    total += d.contributionCount;
  }
  return col;
});

await mkdir("data", { recursive: true });
await writeFile("data/github-contributions.json",
  JSON.stringify({ generated: to.toISOString(), login: LOGIN, total, weeks }) + "\n");
console.log(`Wrote ${weeks.length} weeks, ${total} contributions`);