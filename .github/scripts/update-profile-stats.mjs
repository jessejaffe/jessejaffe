import { writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const login = process.env.GITHUB_REPOSITORY_OWNER;
const token = process.env.GITHUB_TOKEN;

if (!login || !token) {
  throw new Error("GITHUB_REPOSITORY_OWNER and GITHUB_TOKEN are required.");
}

const response = await fetch("https://api.github.com/graphql", {
  method: "POST",
  headers: {
    Accept: "application/vnd.github+json",
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
    "User-Agent": `${login}-profile-stats`,
    "X-GitHub-Api-Version": "2022-11-28",
  },
  body: JSON.stringify({
    query: `
      query ProfileStats($login: String!) {
        user(login: $login) {
          createdAt
          contributionsCollection {
            contributionCalendar {
              totalContributions
            }
          }
          repositories(first: 1, ownerAffiliations: OWNER, privacy: PUBLIC) {
            totalCount
          }
        }
      }
    `,
    variables: { login },
  }),
});

if (!response.ok) {
  throw new Error(`GitHub API request failed: ${response.status} ${response.statusText}`);
}

const result = await response.json();

if (result.errors?.length || !result.data?.user) {
  throw new Error(`GitHub API returned an error: ${JSON.stringify(result.errors)}`);
}

const user = result.data.user;
const contributions = user.contributionsCollection.contributionCalendar.totalContributions;
const repositories = user.repositories.totalCount;
const startYear = new Date(user.createdAt).getUTCFullYear();
const formattedContributions = new Intl.NumberFormat("en-US").format(contributions);
const repositoryLabel = repositories === 1 ? "public repository" : "public repositories";
const outputPath = process.env.PROFILE_STATS_OUTPUT
  ? process.env.PROFILE_STATS_OUTPUT
  : fileURLToPath(new URL("../../assets/github-stats.svg", import.meta.url));

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="420" height="180" viewBox="0 0 420 180" role="img" aria-labelledby="title desc">
  <title id="title">${login}'s GitHub stats</title>
  <desc id="desc">${formattedContributions} contributions in the last year and ${repositories} ${repositoryLabel}.</desc>
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#0d1117"/>
      <stop offset="1" stop-color="#161b22"/>
    </linearGradient>
  </defs>
  <rect x="1" y="1" width="418" height="178" rx="12" fill="url(#bg)" stroke="#30363d"/>
  <circle cx="32" cy="34" r="8" fill="#2f81f7"/>
  <text x="50" y="40" fill="#f0f6fc" font-family="-apple-system,BlinkMacSystemFont,Segoe UI,sans-serif" font-size="20" font-weight="700">GitHub at a glance</text>
  <text x="28" y="93" fill="#58a6ff" font-family="-apple-system,BlinkMacSystemFont,Segoe UI,sans-serif" font-size="30" font-weight="700">${formattedContributions}</text>
  <text x="28" y="116" fill="#8b949e" font-family="-apple-system,BlinkMacSystemFont,Segoe UI,sans-serif" font-size="13">contributions · last year</text>
  <line x1="210" y1="72" x2="210" y2="137" stroke="#30363d"/>
  <text x="238" y="93" fill="#f0f6fc" font-family="-apple-system,BlinkMacSystemFont,Segoe UI,sans-serif" font-size="24" font-weight="700">${repositories}</text>
  <text x="238" y="114" fill="#8b949e" font-family="-apple-system,BlinkMacSystemFont,Segoe UI,sans-serif" font-size="13">${repositoryLabel}</text>
  <text x="238" y="139" fill="#7ee787" font-family="-apple-system,BlinkMacSystemFont,Segoe UI,sans-serif" font-size="13">Building since ${startYear}</text>
</svg>
`;

await writeFile(outputPath, svg, "utf8");
console.log(`Updated ${outputPath} with ${formattedContributions} contributions.`);
