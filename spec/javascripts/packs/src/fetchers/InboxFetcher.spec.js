import expect from 'expect';
import sinon from 'sinon';
import InboxFetcher from 'src/fetchers/InboxFetcher';
import UserStore from 'src/stores/alt/stores/UserStore';

describe('InboxFetcher', () => {
  let fetchStub;

  const lastRequest = () => {
    const [url, options] = fetchStub.lastCall.args;
    return { url, options };
  };

  const queryOf = (url) => Object.fromEntries(new URL(url, 'http://localhost').searchParams);

  beforeEach(() => {
    fetchStub = sinon.stub(global, 'fetch');
    fetchStub.callsFake(() => Promise.resolve(new Response(JSON.stringify({}), { status: 200 })));
  });

  afterEach(() => {
    sinon.restore();
  });

  describe('fetchInbox', () => {
    it('uses default paging and sorts by name when the profile has no inbox filter', async () => {
      sinon.stub(UserStore, 'getState').returns({});

      await InboxFetcher.fetchInbox();

      const { url, options } = lastRequest();
      expect(url.split('?')[0]).toEqual('/api/v1/inbox');
      expect(options.method).toEqual('GET');
      expect(queryOf(url)).toEqual({
        cnt_only: 'false', page: '1', per_page: '20', sort_column: 'name'
      });
    });

    it('forwards count-only, paging and the sort column from the user profile', async () => {
      sinon.stub(UserStore, 'getState').returns({
        profile: { data: { filters: { inbox: { sort: 'created_at' } } } }
      });

      await InboxFetcher.fetchInbox(true, { currentPage: 3, itemsPerPage: 50 });

      expect(queryOf(lastRequest().url)).toEqual({
        cnt_only: 'true', page: '3', per_page: '50', sort_column: 'created_at'
      });
    });
  });

  describe('fetchInboxByContainer', () => {
    it('requests the container page with the profile sort column', async () => {
      sinon.stub(UserStore, 'getState').returns({
        profile: { data: { filters: { inbox: { sort: 'created_at' } } } }
      });

      await InboxFetcher.fetchInboxByContainer(42, 2);

      const { url } = lastRequest();
      expect(url.split('?')[0]).toEqual('/api/v1/inbox/containers/42');
      expect(queryOf(url)).toEqual({ dataset_page: '2', sort_column: 'created_at' });
    });

    it('defaults to the first page sorted by name', async () => {
      sinon.stub(UserStore, 'getState').returns({});

      await InboxFetcher.fetchInboxByContainer(42);

      expect(queryOf(lastRequest().url)).toEqual({ dataset_page: '1', sort_column: 'name' });
    });

    it('resolves to an empty list without a request for a negative container id', async () => {
      const result = await InboxFetcher.fetchInboxByContainer(-1, 1);

      expect(result).toEqual([]);
      sinon.assert.notCalled(fetchStub);
    });
  });

  describe('fetchInboxUnsorted', () => {
    it('requests the unlinked attachments', async () => {
      await InboxFetcher.fetchInboxUnsorted();

      expect(lastRequest().url).toEqual('/api/v1/inbox/unlinked_attachments');
    });
  });

  describe('fetchMatchingSamples / fetchMatchingReactions', () => {
    it('passes the search string to the sample search', async () => {
      await InboxFetcher.fetchMatchingSamples('CH-1');

      expect(lastRequest().url).toEqual('/api/v1/inbox/samples?search_string=CH-1');
    });

    it('passes the search string to the reaction search', async () => {
      await InboxFetcher.fetchMatchingReactions('CH-R1');

      expect(lastRequest().url).toEqual('/api/v1/inbox/reactions?search_string=CH-R1');
    });
  });

  describe('assignToSampleAnalysis', () => {
    it('posts the attachment id to the sample given as first argument', async () => {
      await InboxFetcher.assignToSampleAnalysis(7, 99);

      const { url, options } = lastRequest();
      // Regression guard: swapped parameters sent the attachment id in the path
      // and the sample id in the body, so the assignment never persisted.
      expect(url).toEqual('/api/v1/inbox/samples/7');
      expect(options.method).toEqual('POST');
      expect(JSON.parse(options.body)).toEqual({ attachment_id: 99 });
    });

    it('resolves with the created container', async () => {
      const container = { id: 5, container_type: 'dataset' };
      fetchStub.callsFake(() => Promise.resolve(new Response(JSON.stringify({ container }), { status: 201 })));

      const result = await InboxFetcher.assignToSampleAnalysis(7, 99);

      expect(result).toEqual({ container });
    });
  });

  describe('assignToReactionAnalysis', () => {
    it('posts the attachment id and variation to the reaction given as first argument', async () => {
      await InboxFetcher.assignToReactionAnalysis(8, 99, 2);

      const { url, options } = lastRequest();
      expect(url).toEqual('/api/v1/inbox/reactions/8');
      expect(options.method).toEqual('POST');
      expect(JSON.parse(options.body)).toEqual({ attachment_id: 99, variation: 2 });
    });
  });
});
