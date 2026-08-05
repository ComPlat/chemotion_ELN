import AdminFetcher from 'src/fetchers/AdminFetcher';
import expect from 'expect';
import sinon from 'sinon';
describe('AdminFetcher.olsTermDisableEnable', () => {
  let fetchStub;
  const params = { owl_name: 'chebi', enableIds: ['1|x'], disableIds: [] };

  beforeEach(() => {
    fetchStub = sinon.stub(global, 'fetch');
  });

  afterEach(() => {
    fetchStub.restore();
  });

  it('sends the params as a JSON body to the enable/disable endpoint', async () => {
    fetchStub.resolves(new Response(null, { status: 204 }));

    await AdminFetcher.olsTermDisableEnable(params);

    sinon.assert.calledOnce(fetchStub);
    const [url, options] = fetchStub.firstCall.args;
    expect(url).toEqual('/api/v1/admin/olsEnableDisable/');
    expect(options.method).toEqual('POST');
    expect(JSON.parse(options.body)).toEqual(params);
  });

  it('resolves true on a 204 (success), reading the HTTP status not the parsed body', async () => {
    // A 204 has an empty body; the fix reads response.ok, never response.json().
    fetchStub.resolves(new Response(null, { status: 204 }));

    const result = await AdminFetcher.olsTermDisableEnable(params);

    expect(result).toBe(true);
  });

  it('resolves true for any 2xx success (response.ok), not strictly 204', async () => {
    fetchStub.resolves(new Response(JSON.stringify({ ok: true }), { status: 200 }));

    const result = await AdminFetcher.olsTermDisableEnable(params);

    expect(result).toBe(true);
  });

  it('resolves false on a non-2xx response', async () => {
    fetchStub.resolves(new Response(JSON.stringify({ error: 'boom' }), { status: 422 }));

    const result = await AdminFetcher.olsTermDisableEnable(params);

    expect(result).toBe(false);
  });
});
