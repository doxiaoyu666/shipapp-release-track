import { useState, useEffect } from 'react';
import { DownloadChart } from '../components/DownloadChart';
import { EngagementChart } from '../components/EngagementChart';
import { SourceChart } from '../components/SourceChart';
import { SessionChart } from '../components/SessionChart';
import { RevenueChart } from '../components/RevenueChart';
import { RetentionChart } from '../components/RetentionChart';
import { ReviewList } from '../components/ReviewList';

interface Props {
  appId: string;
  appName: string;
}

interface Review {
  reviewId: string;
  rating: number;
  title: string;
  body: string;
  reviewerNickname: string;
  territory: string;
  createdDate: string;
  responseBody: string | null;
}

interface ReviewStats {
  rating: number;
  count: number;
}

export function AppDetail({ appId, appName }: Props) {
  const [days, setDays] = useState(30);
  const [downloadTrend, setDownloadTrend] = useState<any[]>([]);
  const [sources, setSources] = useState<{ name: string; value: number }[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [reviewStats, setReviewStats] = useState<ReviewStats[]>([]);

  useEffect(() => {
    fetch(`/api/apps/${appId}/downloads/trend?days=${days}`)
      .then((r) => r.json())
      .then((d) => setDownloadTrend((d.data || []).reverse()));

    fetch(`/api/apps/${appId}/sources?days=${days}`)
      .then((r) => r.json())
      .then((d) => setSources(d.data?.bySource || []));

    fetch(`/api/apps/${appId}/reviews`)
      .then((r) => r.json())
      .then((d) => {
        setReviews(d.data?.reviews || []);
        setReviewStats(d.data?.stats || []);
      });
  }, [appId, days]);

  return (
    <div>
      <div className="page-header">
        <h2>{appName}</h2>
        <div className="time-picker">
          {[7, 14, 30, 90].map((d) => (
            <button
              key={d}
              className={`time-btn ${days === d ? 'active' : ''}`}
              onClick={() => setDays(d)}
            >
              {d}d
            </button>
          ))}
        </div>
      </div>

      {/* Reviews section */}
      <ReviewList reviews={reviews} />

      {/* Charts row 1: Engagement + Sources */}
      <div className="charts-grid">
        <div className="chart-card">
          <h3>App Store Engagement ({days} days)</h3>
          <EngagementChart data={downloadTrend} />
        </div>
        <div className="chart-card">
          <h3>Traffic Sources ({days} days)</h3>
          <SourceChart data={sources} />
        </div>
      </div>

      {/* Charts row 2: Downloads + Sessions */}
      <div className="charts-grid">
        <div className="chart-card">
          <h3>Downloads ({days} days)</h3>
          <DownloadChart data={downloadTrend} />
        </div>
        <div className="chart-card">
          <h3>Sessions ({days} days)</h3>
          <SessionChart data={downloadTrend} />
        </div>
      </div>

      {/* Charts row 3: Revenue + Retention */}
      <div className="charts-grid">
        <div className="chart-card">
          <h3>Revenue ({days} days)</h3>
          <RevenueChart data={downloadTrend} />
        </div>
        <div className="chart-card">
          <h3>Retention ({days} days)</h3>
          <RetentionChart data={downloadTrend} />
        </div>
      </div>
    </div>
  );
}
