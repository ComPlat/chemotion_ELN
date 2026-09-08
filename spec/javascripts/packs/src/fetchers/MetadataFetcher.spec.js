import expect from 'expect';
import sinon from 'sinon';
// RootStore first: Metadata pulls in a module chain that reaches src/models/Component.js, and
// loading that before RootStore trips a pre-existing circular-import crash ("Super expression must
// either be null or a function"). Same ordering CollectionsStore.spec.js relies on.
import 'src/stores/mobx/RootStore';
import MetadataFetcher from 'src/fetchers/MetadataFetcher';
import Metadata from 'src/models/Metadata';

// A refused save used to resolve like a successful one: the client's default handlers skip the
// status check and swallow rejections, so MetadataContainer cleared its dirty flag and the user
// believed the edit had been written.
describe('MetadataFetcher.store', () => {
  let fetchStub;
  const metadata = () => new Metadata({ collection_id: 1, type: 'metadata', metadata: { title: 'x' } });

  beforeEach(() => { fetchStub = sinon.stub(global, 'fetch'); });
  afterEach(() => { fetchStub.restore(); });

  it('resolves a Metadata when the write is accepted', async () => {
    fetchStub.resolves(new Response(
      JSON.stringify({ id: 7, collection_id: 1, metadata: { title: 'x' } }),
      { status: 201 }
    ));

    const result = await MetadataFetcher.store(metadata());

    expect(result).toBeInstanceOf(Metadata);
    expect(result.id).toEqual(7);
  });

  it('rejects with the server message when the write is refused', async () => {
    fetchStub.resolves(new Response(
      JSON.stringify({ error: 'Collection not found' }),
      { status: 404 }
    ));

    await expect(MetadataFetcher.store(metadata())).rejects.toThrow('Collection not found');
  });

  it('rejects with the status when the body carries no message', async () => {
    fetchStub.resolves(new Response('', { status: 500 }));

    await expect(MetadataFetcher.store(metadata())).rejects.toThrow('Request failed (500)');
  });
});
