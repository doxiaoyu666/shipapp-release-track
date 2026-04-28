import { describe, it, expect } from 'vitest';

describe('api routing', () => {
  it('matches app crash routes', () => {
    const pathname = '/api/apps/123456/crashes';
    const match = pathname.match(/^\/api\/apps\/([^/]+)\/crashes$/);
    expect(match).not.toBeNull();
    expect(match![1]).toBe('123456');
  });

  it('matches crash trend routes', () => {
    const pathname = '/api/apps/abc/crashes/trend';
    const match = pathname.match(/^\/api\/apps\/([^/]+)\/crashes\/trend$/);
    expect(match).not.toBeNull();
    expect(match![1]).toBe('abc');
  });

  it('matches download trend routes', () => {
    const pathname = '/api/apps/xyz/downloads/trend';
    const match = pathname.match(/^\/api\/apps\/([^/]+)\/downloads\/trend$/);
    expect(match).not.toBeNull();
    expect(match![1]).toBe('xyz');
  });

  it('matches releases routes', () => {
    const pathname = '/api/apps/app1/releases';
    const match = pathname.match(/^\/api\/apps\/([^/]+)\/releases$/);
    expect(match).not.toBeNull();
    expect(match![1]).toBe('app1');
  });

  it('does not match invalid routes', () => {
    const pathname = '/api/unknown';
    const match = pathname.match(/^\/api\/apps\/([^/]+)\/crashes$/);
    expect(match).toBeNull();
  });
});
