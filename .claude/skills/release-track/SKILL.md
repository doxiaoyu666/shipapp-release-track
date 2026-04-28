---
name: release-track
description: Post-release tracking — collect crash signatures and download metrics, analyze trends, open dashboard.
argument-hint: [app name, e.g. FoTime or PhotoTimeX]
---

# /release-track — Post-Release Tracking

Collect crash and download data from App Store Connect, analyze trends, and open a visual dashboard.

## Prerequisites

- ASC API credentials configured (`~/.shipapp/credentials.json`)
- `@shipapp/release-track` built: `cd ~/git/shipapp-release-track && npm run build`

## Workflow

### Step 1: Collect data

```bash
node ~/git/shipapp-release-track/dist/cli.js collect --app <app_name>
```

This fetches crash signatures from recent builds and download/engagement metrics from ASC Analytics API.

### Step 2: Analyze

Read the SQLite database at `~/.shipapp/release-track.db` and analyze:

- **New crash signatures**: Any new crashes since last collection?
- **Crash trend**: Increasing or decreasing?
- **Download trend**: Post-release impact on downloads?
- **Anomalies**: Sudden spikes in crashes or drops in downloads?

### Step 3: Report

Generate a concise summary:

```
📊 Release Health — [App Name]

🔴 Crashes
- 3 new crash signatures since last check
- Top: EXC_BAD_ACCESS in Build 42 (weight: 2.5)
- Trend: ↑ increasing (was 1.2, now 3.8)

🟢 Downloads
- 7-day avg: 150/day (↑ 12% vs previous week)
- Impressions stable at ~2000/day

💡 Recommendation: Investigate EXC_BAD_ACCESS in latest build.
```

### Step 4: Dashboard (optional)

```bash
node ~/git/shipapp-release-track/dist/cli.js serve
```

Opens a local web dashboard with interactive charts.

## Key Principle

**Focus on actionable insights.** Don't dump raw data — highlight what changed, what's concerning, and what to do about it.
