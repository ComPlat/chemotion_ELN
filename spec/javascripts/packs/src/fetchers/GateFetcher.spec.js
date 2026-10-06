import GateFetcher from 'src/fetchers/GateFetcher';
import 'whatwg-fetch';
import expect from 'expect';
import sinon from 'sinon';

describe('GateFetcher', () => {
  let fetchStub;
  const reference = { id: 'gate-button' };
  const target = 'https://www.chemotion-repository.net/';

  beforeEach(() => {
    fetchStub = sinon.stub(global, 'fetch');
  });

  afterEach(() => {
    fetchStub.restore();
  });

  describe('.transmittingByCollectionId()', () => {
    it('checks the transfer with a GET and anchors the confirmation to the button', async () => {
      fetchStub.resolves(new Response(JSON.stringify({ target }), { status: 200 }));

      const state = await GateFetcher.transmittingByCollectionId('GET', 5, reference);

      sinon.assert.calledOnce(fetchStub);
      const [url, options] = fetchStub.firstCall.args;
      expect(url).toEqual('/api/v1/gate/transmitting/5');
      expect(options.method).toEqual('GET');
      expect(state).toEqual({ overlayTarget: reference, status: 'confirm', target });
    });

    it('starts the transfer with a POST on confirmation', async () => {
      fetchStub.resolves(new Response(JSON.stringify(202), { status: 202 }));

      const state = await GateFetcher.transmittingByCollectionId('POST', 5, reference);

      sinon.assert.calledOnce(fetchStub);
      const [url, options] = fetchStub.firstCall.args;
      expect(url).toEqual('/api/v1/gate/transmitting/5');
      expect(options.method).toEqual('POST');
      expect(state).toEqual({ overlayTarget: null, status: 'queued', target: undefined });
    });

    it('does not report a failed POST as queued', async () => {
      fetchStub.resolves(new Response(JSON.stringify({ target, error: 'down' }), { status: 503 }));

      const state = await GateFetcher.transmittingByCollectionId('POST', 5, reference);

      expect(state.status).toEqual('unavailable');
    });

    it('accepts the method in lower case', async () => {
      fetchStub.resolves(new Response(JSON.stringify(202), { status: 202 }));

      await GateFetcher.transmittingByCollectionId('post', 5, reference);

      expect(fetchStub.firstCall.args[1].method).toEqual('POST');
    });

    it('offers to retrieve a token when none is set', async () => {
      fetchStub.resolves(new Response(JSON.stringify({ target }), { status: 404 }));

      const state = await GateFetcher.transmittingByCollectionId('GET', 5, reference);

      expect(state.status).toEqual('redirect');
      expect(state.target).toEqual(target);
      expect(state.message).toMatch(/not set/);
    });

    it('offers to renew an expired token', async () => {
      fetchStub.resolves(new Response(
        JSON.stringify({ target, error: 'Signature has expired' }),
        { status: 401 },
      ));

      const state = await GateFetcher.transmittingByCollectionId('GET', 5, reference);

      expect(state.status).toEqual('redirect');
      expect(state.message).toMatch(/expired/);
    });

    it('reports the repository as unavailable on other errors', async () => {
      fetchStub.resolves(new Response(JSON.stringify({ target, error: 'down' }), { status: 503 }));

      const state = await GateFetcher.transmittingByCollectionId('GET', 5, reference);

      expect(state.status).toEqual('unavailable');
    });
  });
});
