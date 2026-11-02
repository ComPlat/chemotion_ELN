import expect from 'expect';
import sinon from 'sinon';
import UsersFetcher from 'src/fetchers/UsersFetcher';

describe('UsersFetcher.updateUserKetcherOptions', () => {
  let fetchStub;

  beforeEach(() => { fetchStub = sinon.stub(global, 'fetch'); });
  afterEach(() => { fetchStub.restore(); });

  // The endpoint declares `requires :data`; a bare settings object is refused with 400.
  it('sends the settings wrapped in data', async () => {
    fetchStub.resolves(new Response(JSON.stringify({ status: true }), { status: 200 }));
    const settings = { rotationStep: 15, atomColoring: true };

    await UsersFetcher.updateUserKetcherOptions(JSON.stringify(settings));

    const [url, options] = fetchStub.firstCall.args;
    expect(url).toEqual('/api/v1/profiles/editors/ketcher-options');
    expect(options.method).toEqual('PUT');
    expect(JSON.parse(options.body)).toEqual({ data: settings });
  });
});
