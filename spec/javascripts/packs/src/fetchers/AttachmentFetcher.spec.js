import AttachmentFetcher from 'src/fetchers/AttachmentFetcher';
import expect from 'expect';
import sinon from 'sinon';
import {
  describe, it, beforeEach, afterEach
} from 'mocha';

describe('AttachmentFetcher.bulkDeleteAttachments', () => {
  let fetchStub;

  beforeEach(() => {
    fetchStub = sinon.stub(global, 'fetch');
    fetchStub.resolves(new Response(JSON.stringify({ deleted_attachments: [] })));
  });

  afterEach(() => {
    fetchStub.restore();
  });

  it('sends a DELETE with a JSON { ids: [...] } body the server can read', async () => {
    await AttachmentFetcher.bulkDeleteAttachments([1, 2, 3]);

    sinon.assert.calledOnce(fetchStub);
    const [url, options] = fetchStub.firstCall.args;
    expect(url).toEqual('/api/v1/attachments/bulk_delete');
    expect(options.method).toEqual('DELETE');
    // Regression guard: must be {"ids":[1,2,3]}, NOT the lossy CSV "1,2,3"
    expect(options.body).toEqual(JSON.stringify({ ids: [1, 2, 3] }));
    expect(JSON.parse(options.body)).toEqual({ ids: [1, 2, 3] });
  });
});
