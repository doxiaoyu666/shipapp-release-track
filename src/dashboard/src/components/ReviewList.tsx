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

interface Props {
  reviews: Review[];
}

function Stars({ rating }: { rating: number }) {
  return (
    <span className="review-stars">
      {[1, 2, 3, 4, 5].map((i) => (
        <span key={i} style={{ color: i <= rating ? '#ff9500' : '#d1d1d6' }}>
          ★
        </span>
      ))}
    </span>
  );
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export function ReviewList({ reviews }: Props) {
  if (reviews.length === 0) {
    return null;
  }

  return (
    <div className="reviews-section">
      <div className="chart-card">
        <h3>Customer Reviews ({reviews.length})</h3>
        <div className="review-list">
          {reviews.map((r) => (
            <div key={r.reviewId} className="review-item">
              <div className="review-header">
                <Stars rating={r.rating} />
                <span className="review-meta">
                  {r.reviewerNickname} · {r.territory} · {formatDate(r.createdDate)}
                </span>
              </div>
              {r.title && <div className="review-title">{r.title}</div>}
              <div className="review-body">{r.body}</div>
              {r.responseBody && (
                <div className="review-response">
                  <strong>Developer Response:</strong> {r.responseBody}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
