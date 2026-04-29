import { fetchAll } from './asc-client';
import type { CustomerReview } from './types';

export async function fetchCustomerReviews(appId: string): Promise<CustomerReview[]> {
  const rawReviews = await fetchAll(
    `/apps/${appId}/customerReviews?sort=-createdDate&limit=200`
  );

  const reviews: CustomerReview[] = [];

  for (const r of rawReviews) {
    const attrs = r.attributes;
    reviews.push({
      reviewId: r.id,
      appId,
      rating: attrs.rating,
      title: attrs.title || '',
      body: attrs.body || '',
      reviewerNickname: attrs.reviewerNickname || '',
      territory: attrs.territory || '',
      createdDate: attrs.createdDate || '',
      responseBody: null,
      responseDate: null,
    });
  }

  // Fetch developer responses
  for (const review of reviews) {
    try {
      const respData = await fetchAll(`/customerReviews/${review.reviewId}/response`);
      if (respData.length > 0) {
        review.responseBody = respData[0].attributes?.responseBody || null;
        review.responseDate = respData[0].attributes?.lastModifiedDate || null;
      }
    } catch {
      // No response exists
    }
  }

  return reviews;
}
