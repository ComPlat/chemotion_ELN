import expect from 'expect';
import sinon from 'sinon';
import ComponentsFetcher from 'src/fetchers/ComponentsFetcher';

const mockSample = { id: 42 };

function okResponse(body = []) {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}

describe('ComponentsFetcher.saveOrUpdateComponents', () => {
  afterEach(() => {
    sinon.restore();
  });

  it('returns empty array immediately when components is null — never calls fetch', async () => {
    const fetchStub = sinon.stub(global, 'fetch');

    const result = await ComponentsFetcher.saveOrUpdateComponents(mockSample, null);

    expect(result).toEqual([]);
    expect(fetchStub.called).toBe(false);
  });

  it('returns empty array immediately when components is undefined — never calls fetch', async () => {
    const fetchStub = sinon.stub(global, 'fetch');

    const result = await ComponentsFetcher.saveOrUpdateComponents(mockSample, undefined);

    expect(result).toEqual([]);
    expect(fetchStub.called).toBe(false);
  });

  it('sends PUT with empty array when components is [] — explicit user deletion', async () => {
    sinon.stub(global, 'fetch').resolves(okResponse([]));

    await ComponentsFetcher.saveOrUpdateComponents(mockSample, []);

    const [url, opts] = global.fetch.firstCall.args;
    expect(url).toBe('/api/v1/components');
    expect(opts.method).toBe('PUT');
    const body = JSON.parse(opts.body);
    expect(body.sample_id).toBe(42);
    expect(body.components).toEqual([]);
  });

  it('serializes plain component objects and sends PUT', async () => {
    const component = {
      id: 1,
      name: 'PEG',
      position: 0,
      component_properties: { amount_mol: 0.5, material_group: 'polymer' },
    };
    sinon.stub(global, 'fetch').resolves(okResponse([component]));

    await ComponentsFetcher.saveOrUpdateComponents(mockSample, [component]);

    const body = JSON.parse(global.fetch.firstCall.args[1].body);
    expect(body.components).toHaveLength(1);
    expect(body.components[0].id).toBe(1);
    expect(body.components[0].name).toBe('PEG');
    expect(body.components[0].component_properties.amount_mol).toBe(0.5);
  });

  it('calls serializeComponent() when available instead of plain serialization', async () => {
    const serialized = { id: 7, name: 'custom', position: 1, component_properties: {} };
    const component = { serializeComponent: sinon.stub().returns(serialized) };
    sinon.stub(global, 'fetch').resolves(okResponse([serialized]));

    await ComponentsFetcher.saveOrUpdateComponents(mockSample, [component]);

    expect(component.serializeComponent.calledOnce).toBe(true);
    const body = JSON.parse(global.fetch.firstCall.args[1].body);
    expect(body.components[0]).toEqual(serialized);
  });
});
