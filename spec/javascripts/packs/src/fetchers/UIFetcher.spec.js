import expect from 'expect';
import sinon from 'sinon';
import UIFetcher from 'src/fetchers/UIFetcher';
import { SectionReaction } from 'src/apps/mydb/elements/details/reports/SectionReaction';

describe('UIFetcher.loadReport mixture preview', () => {
  const massG = 2.2226292649454065;
  const amounts = [0.006, 0.011999861705630556];
  const relativeWeights = [370.43821082423443, 185.22124];
  const reportData = (referenceIndex = 1, unit = 'g') => ({
    samples: [],
    reactions: [{
      id: 101, type: 'reaction', starting_materials: [{
        id: 1315, sample_type: 'Mixture', name: 'QA mixture', parent_id: 1310,
        target_amount_value: 0, target_amount_unit: 'g',
        real_amount_value: unit === 'g' ? massG : amounts[referenceIndex], real_amount_unit: unit,
        equivalent: referenceIndex === 1 ? 1.2 : 0.6,
        density: 0, molarity_value: 0, purity: 1,
        sample_details: { total_mixture_mass_g: 1.8522124, reference_component_changed: false },
        components: amounts.map((amount_mol, index) => ({
          id: 17 + index, position: index,
          component_properties: {
            reference: index === referenceIndex, amount_mol,
            relative_molecular_weight: relativeWeights[index],
            amount_g: index === 0 ? 1.0933074 : 1.1293218649454067,
            molecule: { molecular_weight: index === 0 ? 182.2179 : 94.11124 },
          },
        })),
      }], reactants: [], products: [], solvents: [],
    }],
  });
  const materialText = (reaction) => {
    const section = SectionReaction({ reaction, settings: { material: true }, configs: {} });
    const content = section.props.children.find((child) => child?.type?.name === 'MaterialContent');
    const texts = [];
    const collect = (node) => {
      if (typeof node === 'string') texts.push(node);
      else if (Array.isArray(node)) node.forEach(collect);
      else if (node?.props) collect(node.props.children);
    };
    collect(content.type(content.props));
    return texts;
  };
  let fetchStub;
  beforeEach(() => { fetchStub = sinon.stub(global, 'fetch'); });
  afterEach(() => { fetchStub.restore(); });

  [0, 1].forEach((referenceIndex) => {
    ['g', 'mol'].forEach((unit) => {
      it(`renders the saved component ${referenceIndex} amount from a ${unit} mixture`, async () => {
        const data = reportData(referenceIndex, unit);
        fetchStub.resolves(new Response(JSON.stringify(data)));

        const { reactions } = await UIFetcher.loadReport({ currentCollection: { id: 22 } }, 'elements');
        const mixture = reactions[0].starting_materials[0];
        const text = materialText(reactions[0]);

        expect(mixture.amount_mol).toBeCloseTo(amounts[referenceIndex], 12);
        expect(mixture.amount_g).toBeCloseTo(massG, 12);
        expect(mixture.components.map((component) => component.amount_mol)).toEqual(amounts);
        expect(mixture.components.map((component) => component.relative_molecular_weight)).toEqual(relativeWeights);
        expect(mixture.sample_details.total_mixture_mass_g).toBe(1.8522124);
        expect(mixture.isEdited).toBe(false);
        expect(reactions[0].isEdited).toBe(false);
        expect(text).toContain(referenceIndex === 1 ? '12.000' : '6.000');
        expect(text).toContain('2.223');
        expect(text).toContain(referenceIndex === 1 ? '1.200' : '0.600');
        expect(text.join(' ')).not.toContain('NaN');
        sinon.assert.calledOnce(fetchStub);
        expect(fetchStub.firstCall.args[0]).toBe('/api/v1/ui_state/load_report');
      });
    });
  });

  it('shows an unavailable amount instead of NaN when components are missing', async () => {
    const data = reportData();
    data.reactions[0].starting_materials[0].components = [];
    fetchStub.resolves(new Response(JSON.stringify(data)));

    const { reactions } = await UIFetcher.loadReport({}, 'elements');
    const text = materialText(reactions[0]);

    expect(text).toContain(' - ');
    expect(text.join(' ')).not.toContain('NaN');
  });

  it('preserves ordinary sample amounts in the report', async () => {
    const data = reportData();
    data.reactions[0].starting_materials = [{
      id: 1316, sample_type: 'Micromolecule', name: 'Ordinary reference',
      target_amount_value: 0, real_amount_value: 0.01, real_amount_unit: 'mol',
      molecule: { molecular_weight: 466.5675 }, purity: 1, equivalent: 1,
    }];
    fetchStub.resolves(new Response(JSON.stringify(data)));

    const { reactions } = await UIFetcher.loadReport({}, 'elements');
    const text = materialText(reactions[0]);

    expect(text).toContain('10.000');
    expect(text).toContain('4.666');
    expect(text).toContain('1.000');
  });

  it('accepts report list entries without material data', async () => {
    fetchStub.resolves(new Response(JSON.stringify({
      samples: [], reactions: [{ id: 101, type: 'reaction', in_browser_memory: true }],
    })));

    const { reactions } = await UIFetcher.loadReport({}, 'lists');

    expect(reactions[0].id).toBe(101);
    expect(reactions[0].in_browser_memory).toBe(true);
    expect(reactions[0].samples).toEqual([]);
  });
});
