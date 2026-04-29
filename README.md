# @shipapp/release-track

Post-release tracking dashboard — crashes, downloads, customer reviews, and version health for iOS apps.

发版后追踪看板——crash 签名、下载量、用户评论、版本健康状态。

## How It Works | 工作原理

```
App Store Connect API    →    SQLite DB    →    Local Dashboard
  (crash + analytics       (历史数据)        (图表 + 评论)
   + sales + reviews)
```

## Setup | 安装

### 1. Install | 安装依赖

```bash
git clone https://github.com/doxiaoyu666/shipapp-release-track.git
cd shipapp-release-track
npm install
cd src/dashboard && npm install && cd ../..
npm run build
```

### 2. Create ASC API Key | 创建 API 密钥

1. Go to [App Store Connect → Users and Access → Integrations → Keys](https://appstoreconnect.apple.com/access/integrations/api)
2. Click **Generate API Key**
3. Select **Admin** or **App Manager** role
4. Download the `.p8` file and note your **Key ID** and **Issuer ID**

### 3. Configure Credentials | 配置凭证

Create `~/.shipapp/credentials.json`:

```json
{
  "keyId": "YOUR_KEY_ID",
  "issuerId": "YOUR_ISSUER_ID",
  "privateKeyPath": "/path/to/AuthKey_XXXXXXXX.p8"
}
```

### 4. (Optional) Add Vendor Number for Precise Sales Data | 添加 Vendor Number

The Sales & Trends API provides precise download and revenue data (transaction-level accuracy).

1. Go to [App Store Connect](https://appstoreconnect.apple.com) → **Payments and Financial Reports**
2. Your **Vendor Number** is displayed on the page (8-digit number)
3. Add it to your credentials:

```json
{
  "keyId": "YOUR_KEY_ID",
  "issuerId": "YOUR_ISSUER_ID",
  "privateKeyPath": "/path/to/AuthKey_XXXXXXXX.p8",
  "vendorNumber": "12345678"
}
```

## Usage | 使用方式

### Collect Data | 采集数据

```bash
# Collect all data for an app (crashes, analytics, sales, reviews)
npx shipapp-release-track collect --app "Your App Name"

# Specify collection period
npx shipapp-release-track collect --app "Your App Name" --days 30
```

### View Dashboard | 查看看板

```bash
npx shipapp-release-track serve
# Open http://localhost:3457
```

### Claude Code Skill

```
/release-track FoTime
```

AI will collect data, analyze crash/download trends, and generate an actionable report.

## Data Sources | 数据来源

| Data | Source | Accuracy | API |
|------|--------|----------|-----|
| Customer Reviews | ASC Customer Reviews API | Exact | `/apps/{id}/customerReviews` |
| Crash Signatures | ASC Diagnostic Signatures | Exact | `/builds/{id}/diagnosticSignatures` |
| Downloads (Sales) | Sales & Trends API | Exact (requires vendorNumber) | `/salesReports` |
| Downloads (Analytics) | ASC Analytics Reports | Sampled, ~2 week delay | `/analyticsReportRequests` |
| Impressions / Sessions | ASC Analytics Reports | Sampled, ~2 week delay | `/analyticsReportRequests` |

All data stored locally in `~/.shipapp/release-track.db` (SQLite). No data is sent to any third-party service.

## Dashboard Features | 看板功能

- **Customer Reviews** — All reviews with ratings, text, territory, and developer responses
- **Crash Trends** — Crash signature tracking by build
- **Download Trends** — First-time downloads, redownloads, updates
- **App Store Engagement** — Impressions, page views (sampled)
- **Traffic Sources** — Download source breakdown
- **Sessions & Retention** — Active devices, installations vs deletions

## Part of ShipApp | ShipApp 工具套件

- [@shipapp/metadata](https://github.com/doxiaoyu666/shipapp-metadata) — App Store metadata
- [@shipapp/changelog](https://github.com/doxiaoyu666/shipapp-changelog) — What's New from git
- [@shipapp/localize](https://github.com/doxiaoyu666/shipapp-localize) — Localization (36 languages)
- **@shipapp/release-track** — This tool

## License

MIT
