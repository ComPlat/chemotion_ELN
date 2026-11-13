import expect from 'expect';
import sinon from 'sinon';
import ReactionSvgFetcher from 'src/fetchers/ReactionSvgFetcher';

describe('ReactionSvgFetcher.fetchByReaction', () => {
  let fetchStub;

  beforeEach(() => {
    fetchStub = sinon.stub(global, 'fetch');
    fetchStub.resolves(new Response(JSON.stringify({ reaction_svg: '<svg />' })));
  });

  afterEach(() => {
    fetchStub.restore();
  });

  it('passes the scheme request object through to the API body', async () => {
    const request = {
      showYield: false,
      conditions: 'under nitrogen',
      materialsSvgPaths: {
        starting_materials: ['starting-material.svg'],
        reactants: ['reactant.svg'],
        products: [['product.svg', 0.8]],
      },
      productsOnly: true,
      duration: '2 h',
      solvents: ['THF'],
      temperature: '21 ~ 25 °C',
    };
    const reaction = { schemeSvgRequest: sinon.stub().returns(request) };

    await ReactionSvgFetcher.fetchByReaction(reaction);

    sinon.assert.calledOnceWithExactly(reaction.schemeSvgRequest);
    sinon.assert.calledOnce(fetchStub);
    const [url, options] = fetchStub.firstCall.args;
    expect(url).toEqual('/api/v1/reaction_svg');
    expect(JSON.parse(options.body)).toEqual({
      materials_svg_paths: request.materialsSvgPaths,
      temperature: request.temperature,
      duration: request.duration,
      solvents: request.solvents,
      conditions: request.conditions,
      products_only: request.productsOnly,
      show_yield: request.showYield,
    });
  });
});
