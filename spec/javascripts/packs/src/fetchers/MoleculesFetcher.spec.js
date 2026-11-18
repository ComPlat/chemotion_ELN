import MoleculesFetcher from 'src/fetchers/MoleculesFetcher';
import expect from 'expect';
import sinon from 'sinon';
describe('MoleculesFetcher.updateNames', () => {
  let fetchStub;

  beforeEach(() => {
    fetchStub = sinon.stub(global, 'fetch');
    fetchStub.resolves(new Response(JSON.stringify({ molecules: [] }), { status: 200 }));
  });

  afterEach(() => {
    fetchStub.restore();
  });

  it('encodes the new name exactly once (no escape() double-encoding)', async () => {
    await MoleculesFetcher.updateNames(42, 'a b,c');

    sinon.assert.calledOnce(fetchStub);
    const url = fetchStub.firstCall.args[0];
    // URLSearchParams encodes once: space -> '+', comma -> %2C.
    expect(url).toContain('new_name=a+b%2Cc');
    // Regression guard: escape() + URLSearchParams produced the doubly-encoded %2520.
    expect(url).not.toContain('%2520');
  });

  it('UTF-8 percent-encodes Unicode names so the server can decode them', async () => {
    await MoleculesFetcher.updateNames(7, '中');

    sinon.assert.calledOnce(fetchStub);
    const url = fetchStub.firstCall.args[0];
    // URLSearchParams emits valid UTF-8 (%E4%B8%AD); escape() emitted the
    // non-standard %u4E2D that Rack cannot decode.
    expect(url).toContain('new_name=%E4%B8%AD');
    expect(url).not.toContain('%u');
  });
});
