/* global describe, it, beforeEach, afterEach, global */
import expect from 'expect';
import sinon from 'sinon';
import AttachmentFetcher from 'src/fetchers/AttachmentFetcher';
import {
  getInlineImagePreview,
  invalidateInlineImagePreview,
  invalidateInlineImagePreviewBatch,
} from 'src/utilities/attachmentPreviewCache';

describe('attachmentPreviewCache', () => {
  let sandbox;
  let fetchStub;
  let revokedUrls;

  beforeEach(() => {
    sandbox = sinon.createSandbox();
    fetchStub = sandbox.stub(AttachmentFetcher, 'fetchImageAttachment');
    revokedUrls = [];
    if (typeof global.URL === 'undefined') global.URL = {};
    global.URL.revokeObjectURL = (url) => { revokedUrls.push(url); };
  });

  afterEach(() => {
    sandbox.restore();
    // Ensure test isolation — clear any keys we touched
    invalidateInlineImagePreviewBatch(
      Array.from({ length: 200 }, (_, i) => `id-${i}`),
    );
  });

  describe('getInlineImagePreview', () => {
    it('returns null-resolving promise for a falsy identifier', async () => {
      const result = await getInlineImagePreview(null);
      expect(result).toBe(null);
      expect(fetchStub.called).toBe(false);
    });

    it('fetches on cache miss', async () => {
      fetchStub.returns(Promise.resolve({ data: 'blob:abc', type: 'image/png' }));
      await getInlineImagePreview('id-1');
      expect(fetchStub.calledOnce).toBe(true);
      expect(fetchStub.firstCall.args[0]).toEqual({ identifier: 'id-1' });
    });

    it('memoises across repeated calls for the same identifier', async () => {
      fetchStub.returns(Promise.resolve({ data: 'blob:abc', type: 'image/png' }));
      await getInlineImagePreview('id-1');
      await getInlineImagePreview('id-1');
      await getInlineImagePreview('id-1');
      expect(fetchStub.calledOnce).toBe(true);
    });
  });

  describe('invalidateInlineImagePreview', () => {
    it('re-fetches after invalidation', async () => {
      fetchStub.returns(Promise.resolve({ data: 'blob:abc', type: 'image/png' }));
      await getInlineImagePreview('id-1');
      invalidateInlineImagePreview('id-1');
      await getInlineImagePreview('id-1');
      expect(fetchStub.calledTwice).toBe(true);
    });

    it('revokes the blob URL of the invalidated entry', async () => {
      fetchStub.returns(Promise.resolve({ data: 'blob:abc-1', type: 'image/png' }));
      await getInlineImagePreview('id-1');
      invalidateInlineImagePreview('id-1');
      // Give the .then() a tick to run
      await new Promise((r) => setTimeout(r, 0));
      expect(revokedUrls).toContain('blob:abc-1');
    });

    it('is a no-op on a miss', () => {
      expect(() => invalidateInlineImagePreview('never-cached')).not.toThrow();
    });
  });

  describe('rejected fetch self-evicts', () => {
    it('does not poison the cache on rejection', async () => {
      fetchStub.onFirstCall().returns(Promise.reject(new Error('boom')));
      fetchStub.onSecondCall().returns(Promise.resolve({ data: 'blob:ok', type: 'image/png' }));
      // First call rejects
      await getInlineImagePreview('id-x').catch(() => {});
      // Give the .catch() a tick to self-evict
      await new Promise((r) => setTimeout(r, 0));
      // Second call re-fetches (would return the rejected Promise if not evicted)
      const result = await getInlineImagePreview('id-x');
      expect(result).toEqual({ data: 'blob:ok', type: 'image/png' });
      expect(fetchStub.calledTwice).toBe(true);
    });
  });

  describe('LRU eviction', () => {
    it('evicts the oldest entry once past the 100-entry bound', async () => {
      fetchStub.callsFake(({ identifier }) => Promise.resolve({ data: `blob:${identifier}`, type: 'image/png' }));
      // Fill cache with 100
      for (let i = 0; i < 100; i += 1) {
        // eslint-disable-next-line no-await-in-loop
        await getInlineImagePreview(`id-${i}`);
      }
      expect(fetchStub.callCount).toBe(100);
      // 101st unique identifier — evicts id-0
      await getInlineImagePreview('id-100');
      await new Promise((r) => setTimeout(r, 0));
      expect(revokedUrls).toContain('blob:id-0');
      // Re-fetching id-0 now triggers a network call (evicted)
      await getInlineImagePreview('id-0');
      expect(fetchStub.callCount).toBe(102);
    });

    it('re-touches an entry on hit so it is not the next eviction victim', async () => {
      fetchStub.callsFake(({ identifier }) => Promise.resolve({ data: `blob:${identifier}`, type: 'image/png' }));
      for (let i = 0; i < 100; i += 1) {
        // eslint-disable-next-line no-await-in-loop
        await getInlineImagePreview(`id-${i}`);
      }
      // Touch id-0 to promote it to newest
      await getInlineImagePreview('id-0');
      // Insert a new one — should evict id-1 (now oldest), not id-0
      await getInlineImagePreview('id-100');
      await new Promise((r) => setTimeout(r, 0));
      expect(revokedUrls).toContain('blob:id-1');
      expect(revokedUrls).not.toContain('blob:id-0');
    });
  });
});
