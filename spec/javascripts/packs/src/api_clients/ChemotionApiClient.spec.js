import ApiClient from 'src/api_clients/ChemotionApiClient';
import expect from 'expect';
import sinon from 'sinon';
import {
  describe, it, beforeEach, afterEach
} from 'mocha';

describe('ChemotionApiClient.deleteRequest', () => {
  let fetchStub;

  beforeEach(() => {
    fetchStub = sinon.stub(global, 'fetch');
    fetchStub.resolves(new Response(JSON.stringify({ ok: true })));
  });

  afterEach(() => {
    fetchStub.restore();
  });

  it('JSON-encodes a non-string body (symmetry with postJson/putJson)', async () => {
    await ApiClient.deleteRequest('/api/v1/attachments/bulk_delete', { body: { ids: [1, 2, 3] } });

    sinon.assert.calledOnce(fetchStub);
    const [url, options] = fetchStub.firstCall.args;
    expect(url).toEqual('/api/v1/attachments/bulk_delete');
    expect(options.method).toEqual('DELETE');
    // The body must be the serialized JSON string, not a coerced "[object Object]"
    expect(options.body).toEqual(JSON.stringify({ ids: [1, 2, 3] }));
    expect(JSON.parse(options.body)).toEqual({ ids: [1, 2, 3] });
  });

  it('does not double-encode a body that is already a string', async () => {
    const preSerialized = JSON.stringify({ ids: [4, 5] });
    await ApiClient.deleteRequest('/api/v1/some/endpoint', { body: preSerialized });

    const [, options] = fetchStub.firstCall.args;
    expect(options.body).toEqual(preSerialized);
  });

  it('leaves a bodyless DELETE untouched', async () => {
    await ApiClient.deleteRequest('/api/v1/attachments/link/1');

    const [, options] = fetchStub.firstCall.args;
    expect(options.method).toEqual('DELETE');
    expect(options.body).toBe(undefined);
  });
});
