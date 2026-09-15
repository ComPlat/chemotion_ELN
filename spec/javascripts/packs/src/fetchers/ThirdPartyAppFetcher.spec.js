import 'whatwg-fetch';
import expect from 'expect';
import sinon from 'sinon';
import {
  describe, it, beforeEach, afterEach
} from 'mocha';
import ThirdPartyAppFetcher from 'src/fetchers/ThirdPartyAppFetcher';

describe('ThirdPartyAppFetcher.fetchVariationsToken', () => {
  let fetchStub;

  beforeEach(() => {
    fetchStub = sinon.stub(global, 'fetch');
  });

  afterEach(() => {
    fetchStub.restore();
  });

  it('builds the request URL with repeated array params and returns the parsed body', async () => {
    fetchStub.resolves(new Response(JSON.stringify('https://openstats?url=encoded&method=VariationStatistics')));

    const result = await ThirdPartyAppFetcher.fetchVariationsToken(7, 3, ['u1', 'u2'], ['colA', 'colB']);

    sinon.assert.calledOnce(fetchStub);
    const [calledUrl, calledOpts] = fetchStub.firstCall.args;
    const parsed = new URL(calledUrl, 'http://localhost');

    expect(parsed.pathname).toEqual('/api/v1/third_party_apps/variations_token');
    expect(parsed.searchParams.get('reactionID')).toEqual('7');
    expect(parsed.searchParams.get('appID')).toEqual('3');
    expect(parsed.searchParams.getAll('variationUuids[]')).toEqual(['u1', 'u2']);
    expect(parsed.searchParams.getAll('columnOrder[]')).toEqual(['colA', 'colB']);
    expect(calledOpts).toEqual({ credentials: 'same-origin' });
    expect(result).toEqual('https://openstats?url=encoded&method=VariationStatistics');
  });

  it('omits columnOrder params when none are given', async () => {
    fetchStub.resolves(new Response(JSON.stringify('https://openstats')));

    await ThirdPartyAppFetcher.fetchVariationsToken(1, 2, ['only-one']);

    const parsed = new URL(fetchStub.firstCall.args[0], 'http://localhost');
    expect(parsed.searchParams.getAll('variationUuids[]')).toEqual(['only-one']);
    expect(parsed.searchParams.getAll('columnOrder[]')).toEqual([]);
  });
});
