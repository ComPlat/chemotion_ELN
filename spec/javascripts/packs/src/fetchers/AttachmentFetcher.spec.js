import AttachmentFetcher from 'src/fetchers/AttachmentFetcher';
import { decamelizeKeys } from 'src/utilities/FetcherHelper';
import expect from 'expect';
import sinon from 'sinon';
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
