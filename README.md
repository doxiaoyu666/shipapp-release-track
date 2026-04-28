# @shipapp/release-track

Post-release tracking dashboard — crash signatures, downloads, and version health for iOS apps.

发版后追踪看板——crash 签名、下载量、版本健康状态。

## How It Works | 工作原理

```
App Store Connect API    →    SQLite DB    →    Local Dashboard
  (crash + downloads)        (历史数据)        (图表 + 分析)
```

## Prerequisites | 前提条件

- Node.js 18+
- ASC API credentials (`~/.shipapp/credentials.json`, shared with @shipapp/metadata)

## Setup | 安装

```bash
git clone https://github.com/doxiaoyu666/shipapp-release-track.git ~/git/shipapp-release-track
cd ~/git/shipapp-release-track
npm install
cd src/dashboard && npm install && cd ../..
npm run build
```

## Usage | 使用方式

### CLI

```bash
# Collect crash + download data
shipapp-release-track collect --app FoTime

# Open dashboard
shipapp-release-track serve

# Record release baseline
shipapp-release-track snapshot --app FoTime --version 1.3.0
```

### Claude Code Skill

```
/release-track FoTime
```

AI will collect data, analyze crash/download trends, and generate an actionable report.

### Dashboard

After running `collect`, open the dashboard with `serve`:

- **Overview**: All tracked apps with 7-day crash summary
- **App Detail**: Crash trend chart, download trend chart, crash signature table

## Data Sources | 数据来源

| Data | Source | API |
|------|--------|-----|
| Crash Signatures | ASC Diagnostic Signatures | `/builds/{id}/diagnosticSignatures` |
| Downloads | ASC Analytics Reports | `/analyticsReportRequests` |
| Impressions | ASC Analytics Reports | `/analyticsReportRequests` |

All data stored locally in `~/.shipapp/release-track.db` (SQLite).

## Part of ShipApp | ShipApp 工具套件

- [@shipapp/metadata](https://github.com/doxiaoyu666/shipapp-metadata) — App Store metadata
- [@shipapp/changelog](https://github.com/doxiaoyu666/shipapp-changelog) — What's New from git
- [@shipapp/localize](https://github.com/doxiaoyu666/shipapp-localize) — Localization (36 languages)
- **@shipapp/release-track** — This tool

## License

MIT
