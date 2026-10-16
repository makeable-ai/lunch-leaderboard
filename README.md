# Lunch Roll

A small, mobile-first referral leaderboard for an adult lunch class. A trial class is worth 1 point and a signup is worth 2 more.

## How it works

- A private Google Sheet holds the members and the event log. It is never shared publicly.
- A Google Apps Script web app (`apps-script/Code.gs`) reads only the two Board tabs and returns JSON with an explicit allowlist of fields: nickname, avatar, points, trials, signups, rank, lastUpdated.
- This static page (`index.html`, `css/`, `js/`) fetches that JSON with a plain GET and renders it with `textContent` only.

## What is public

The page and the JSON feed. That is nicknames, emoji avatars and point totals. Nothing else leaves the Sheet.

## Changing things

- Page title: edit `index.html`.
- Feed URL: the `ENDPOINT` constant at the top of `js/app.js`.
- Script changes: paste `apps-script/Code.gs` into the Sheet's Apps Script project, then Deploy > Manage deployments > edit the one deployment > New version.

## Tests

```
node --test tests/code.test.js tests/logic.test.js
```

## Fonts

Jersey 10 and Pixelify Sans from Google Fonts, both under the SIL Open Font License 1.1, self-hosted in `fonts/`.
