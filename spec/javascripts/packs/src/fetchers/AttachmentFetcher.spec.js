import 'whatwg-fetch';
import {
  describe, it, beforeEach, afterEach
} from 'mocha';
import expect from 'expect';
import sinon from 'sinon';
import AttachmentFetcher from 'src/fetchers/AttachmentFetcher';
import { decamelizeKeys } from 'src/utilities/FetcherHelper';

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

describe('AttachmentFetcher.combineSpectra', () => {
  let fetchStub;

  beforeEach(() => {
    fetchStub = sinon.stub(global, 'fetch');
    fetchStub.resolves(new Response(JSON.stringify({}), { status: 200 }));
  });

  afterEach(() => {
    fetchStub.restore();
  });

  it('serializes extras as a JSON string the type:String endpoint can relay', async () => {
    const extraParams = { shiftRef: 1, integration: { peakA: 2 } };
    await AttachmentFetcher.combineSpectra([10, 11], 0, extraParams);

    sinon.assert.calledOnce(fetchStub);
    const [url, options] = fetchStub.firstCall.args;
    expect(url).toEqual('/api/v1/chemspectra/file/combine_spectra');
    const body = JSON.parse(options.body);
    // Regression guard: extras must be a JSON *string*, not a nested object,
    // because the endpoint declares `optional :extras, type: String` and relays
    // it as a multipart form field to an external service that json.loads() it.
    expect(typeof body.extras).toEqual('string');
    expect(body.extras).toEqual(JSON.stringify(decamelizeKeys(extraParams)));
    expect(JSON.parse(body.extras)).toEqual({ shift_ref: 1, integration: { peak_a: 2 } });
  });

  it('omits extras when no extra params are provided', async () => {
    await AttachmentFetcher.combineSpectra([10, 11], 0);

    sinon.assert.calledOnce(fetchStub);
    const [, options] = fetchStub.firstCall.args;
    const body = JSON.parse(options.body);
    expect(body).toEqual({ spectra_ids: [10, 11], front_spectra_idx: 0 });
    expect(Object.prototype.hasOwnProperty.call(body, 'extras')).toEqual(false);
  });
});

describe('AttachmentFetcher.fetchAttachmentText', () => {
  let fetchStub;

  beforeEach(() => {
    fetchStub = sinon.stub(global, 'fetch');
  });

  afterEach(() => {
    fetchStub.restore();
  });

  it('fetches the attachment by id and resolves with its raw text', async () => {
    fetchStub.resolves(new Response('{"Output":[]}'));

    const text = await AttachmentFetcher.fetchAttachmentText(42);

    sinon.assert.calledOnce(fetchStub);
    sinon.assert.calledWithExactly(fetchStub, '/api/v1/attachments/42', { credentials: 'same-origin' });
    expect(text).toEqual('{"Output":[]}');
  });

  it('rejects with a descriptive error on a non-ok response', async () => {
    fetchStub.resolves(new Response('nope', { status: 404 }));

    let caught;
    try {
      await AttachmentFetcher.fetchAttachmentText(42);
    } catch (error) {
      caught = error;
    }

    expect(caught).toBeTruthy();
    expect(caught.message).toContain('Failed to fetch attachment 42');
    expect(caught.message).toContain('404');
  });
});
