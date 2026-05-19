import expect from 'expect';
import { describe, it } from 'mocha';

import {
  LcmsPageCache,
  formatLcmsErrorMessage,
  lcmsRequestKey,
  LCMS_CACHE_DEFAULT_LIMIT,
} from 'src/utilities/lcmsRuntime';

describe('lcmsRequestKey', () => {
  it('normalises retention time and falls back to a neutral polarity', () => {
    expect(lcmsRequestKey({ attachmentId: 1, retentionTime: '1.2300049', polarity: '' }))
      .toEqual('1::1.23000::neutral');
  });

  it('treats numerically equal retention times as the same key', () => {
    const a = lcmsRequestKey({ attachmentId: 5, retentionTime: 2.5, polarity: 'positive' });
    const b = lcmsRequestKey({ attachmentId: 5, retentionTime: '2.50000', polarity: 'positive' });
    expect(a).toEqual(b);
  });

  it('produces an empty rt segment for non-finite values', () => {
    expect(lcmsRequestKey({ attachmentId: 9, retentionTime: NaN, polarity: 'positive' }))
      .toEqual('9::::positive');
  });
});

describe('LcmsPageCache', () => {
  it('uses the default limit when an invalid one is provided', () => {
    expect(new LcmsPageCache(0).limit).toEqual(LCMS_CACHE_DEFAULT_LIMIT);
  });

  it('returns null on miss and the stored value on hit', () => {
    const cache = new LcmsPageCache();
    expect(cache.get('missing')).toBeNull();
    cache.set('a', { id: 1 });
    expect(cache.get('a')).toEqual({ id: 1 });
  });

  it('evicts the least-recently-used entry once the limit is reached', () => {
    const cache = new LcmsPageCache(2);
    cache.set('a', 1);
    cache.set('b', 2);
    cache.get('a');
    cache.set('c', 3);

    expect(cache.get('b')).toBeNull();
    expect(cache.get('a')).toEqual(1);
    expect(cache.get('c')).toEqual(3);
    expect(cache.size()).toEqual(2);
  });

  it('clears all stored entries', () => {
    const cache = new LcmsPageCache();
    cache.set('a', 1);
    cache.clear();
    expect(cache.size()).toEqual(0);
    expect(cache.get('a')).toBeNull();
  });
});

describe('formatLcmsErrorMessage', () => {
  it('returns the generic fallback for a missing error', () => {
    expect(formatLcmsErrorMessage(null)).toEqual('Unable to load requested LC/MS page.');
  });

  it('maps known server-side codes to user-readable messages', () => {
    expect(formatLcmsErrorMessage({ code: 'page_not_found' }))
      .toEqual('No LC/MS page matches this retention time and polarity.');
    expect(formatLcmsErrorMessage({ code: 'attachment_not_found' }))
      .toEqual('Source LC/MS attachment not found.');
  });

  it('handles client-side timeouts', () => {
    expect(formatLcmsErrorMessage({ name: 'TimeoutError' }))
      .toEqual('LC/MS page request timed out. Please retry.');
  });
});
