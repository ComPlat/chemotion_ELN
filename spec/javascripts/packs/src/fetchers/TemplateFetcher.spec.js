import expect from 'expect';
import sinon from 'sinon';
import TemplateFetcher from 'src/fetchers/TemplateFetcher';

describe('TemplateFetcher.commonTemplates', () => {
  let fetchStub;
  let consoleStub;

  beforeEach(() => {
    fetchStub = sinon.stub(global, 'fetch');
    consoleStub = sinon.stub(console, 'error');
  });
  afterEach(() => {
    fetchStub.restore();
    consoleStub.restore();
  });

  it('loads the static templates file, extension included', async () => {
    const templates = [{ name: 'Benzene', molfile: 'M  END' }];
    fetchStub.resolves(new Response(JSON.stringify(templates), { status: 200 }));

    const result = await TemplateFetcher.commonTemplates();

    expect(fetchStub.firstCall.args[0]).toEqual('/json/ketcher_common_templates.json');
    expect(result).toEqual(templates);
  });

  it('resolves to an empty list when the file is missing', async () => {
    fetchStub.resolves(new Response('<html></html>', { status: 404 }));

    expect(await TemplateFetcher.commonTemplates()).toEqual([]);
  });

  it('resolves to an empty list on a network failure', async () => {
    fetchStub.rejects(new TypeError('Failed to fetch'));

    expect(await TemplateFetcher.commonTemplates()).toEqual([]);
  });
});
