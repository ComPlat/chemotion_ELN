import ApiClient from 'src/api_clients/ChemotionApiClient';
import expect from 'expect';
import sinon from 'sinon';
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

describe('ChemotionApiClient bodyless write requests', () => {
  let fetchStub;

  beforeEach(() => {
    fetchStub = sinon.stub(global, 'fetch');
    fetchStub.resolves(new Response(JSON.stringify({ success: true })));
  });

  afterEach(() => {
    fetchStub.restore();
  });

  // Regression: putJson('/api/v1/users/two_factor') with no options argument
  // threw "Cannot read properties of undefined (reading 'body')"
  ['putJson', 'postJson', 'patchJson'].forEach((verb) => {
    it(`${verb} works without an options argument`, async () => {
      const result = await ApiClient[verb]('/api/v1/users/two_factor');

      sinon.assert.calledOnce(fetchStub);
      const [, options] = fetchStub.firstCall.args;
      expect(options.body).toBe(undefined);
      expect(result).toEqual({ success: true });
    });
  });
});

describe('ChemotionApiClient 204 No Content handling', () => {
  let fetchStub;

  beforeEach(() => {
    fetchStub = sinon.stub(global, 'fetch');
  });

  afterEach(() => {
    fetchStub.restore();
  });

  it('resolves null (does not throw) when the response is 204 with an empty body', async () => {
    // A real 204 has no body; response.json() would throw "Unexpected end of JSON input".
    fetchStub.resolves(new Response(null, { status: 204 }));

    const result = await ApiClient.deleteRequest('/api/v1/collection_shares/1');

    expect(result).toBe(null);
  });

  it('still parses the JSON body for a normal 200 response', async () => {
    fetchStub.resolves(new Response(JSON.stringify({ hello: 'world' }), { status: 200 }));

    const result = await ApiClient.getJson('/api/v1/anything');

    expect(result).toEqual({ hello: 'world' });
  });
});
