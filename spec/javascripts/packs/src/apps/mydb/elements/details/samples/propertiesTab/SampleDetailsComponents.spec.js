/* global describe, it, beforeEach, afterEach */
import expect from 'expect';
import sinon from 'sinon';
import { addMiddleware } from 'mobx-state-tree';
import SampleDetailsComponents from 'src/apps/mydb/elements/details/samples/propertiesTab/SampleDetailsComponents';
import Sample from 'src/models/Sample';
import Reaction from 'src/models/Reaction';
import Component from 'src/models/Component';
import ComponentStore from 'src/stores/alt/stores/ComponentStore';
import alt from 'src/stores/alt/alt';
import { rootStore } from 'src/stores/mobx/RootStore';
import MoleculesFetcher from 'src/fetchers/MoleculesFetcher';
import SampleForm from 'src/apps/mydb/elements/details/samples/propertiesTab/SampleForm';

describe('SampleDetailsComponents unallocated mass after conversion', () => {
  let sandbox;
  beforeEach(() => {
    sandbox = sinon.createSandbox();
    sandbox.stub(ComponentStore, 'getState').returns({
      ...ComponentStore.getState(), lockedComponents: [], lockAmountColumnSolidsBySample: {},
    });
    sandbox.stub(MoleculesFetcher, 'fetchBySmi').callsFake(async (smiles) => ({
      id: smiles === 'CCO' ? 501 : 502, cano_smiles: smiles, molecular_weight: smiles === 'CCO' ? 46 : 58,
    }));
  });
  afterEach(() => { sandbox.restore(); });

  const convert = async (amountType) => {
    const sample = new Sample({
      sample_type: 'Micromolecule', amountType, amount_value: 3, amount_unit: 'g', purity: 1,
      density: 0.8, molecule: { cano_smiles: 'CCO.CCCC', molecular_weight: 104 }, molfile: 'source',
    });
    const conversion = sandbox.spy(sample, 'createComponentsFromCurrentSample');
    const form = Object.create(SampleForm.prototype);
    form.props = { sample, handleSampleChanged: () => {} };
    form.setState = () => {};
    form.handleSampleTypeChanged({ value: 'Mixture', label: 'Mixture' });
    await conversion.firstCall.returnValue;
    return sample;
  };
  const editorFor = (sample) => new SampleDetailsComponents({ sample, onChange: () => {} });

  ['target', 'real'].forEach((amountType) => {
    [0, 1].forEach((index) => {
      ['density', 'purity', 'stock concentration'].forEach((property) => {
        it(`keeps unallocated ${amountType} mass after a ${property} edit on component ${index}`, async () => {
          let sample = await convert(amountType);
          const sampleID = sample.components[index].id;
          const event = property === 'density'
            ? { type: 'densityChanged', amount: { value: 0.8, unit: 'g/ml' } }
            : property === 'purity'
              ? { type: 'purityChanged', amount: { value: 0.5 } }
              : { type: 'amountChanged', amount: { value: 2, unit: 'mol/l' }, concType: 'startingConc' };
          editorFor(sample).onChangeComponent({ ...event, sampleID, materialGroup: 'liquid', lockColumn: false });
          expect(sample.amount_g).toBe(3);
          expect(sample.total_mixture_mass_g).toBe(3);
          expect(sample.components.map((component) => component.amount_mol)).toEqual([0, 0]);

          const payload = JSON.parse(JSON.stringify(sample.serializeMaterial()));
          payload.components.forEach((entry, position) => {
            entry.component_properties.molecule = sample.components[position].molecule;
          });
          sample = new Sample(payload);
          sample.amountType = amountType;
          sample.initialComponents(payload.components.map(Component.deserializeData));
          const editor = editorFor(sample);
          editor.onChangeComponent({ ...event, sampleID, materialGroup: 'liquid', lockColumn: false });
          expect(sample.amount_g).toBe(3);
          expect(sample.hasUnallocatedMixtureMass()).toBe(true);

          editor.onChangeComponent({
            type: 'amountChanged', sampleID, amount: { value: 0.01, unit: 'mol' }, materialGroup: 'liquid',
          });
          expect(sample.amount_g).toBeGreaterThan(0);
          expect(sample.hasUnallocatedMixtureMass()).toBe(false);
          editor.onChangeComponent({
            type: 'amountChanged', sampleID, amount: { value: 0, unit: 'mol' }, materialGroup: 'liquid',
          });
          expect(sample.amount_g).toBe(0);
          expect(sample.total_mixture_mass_g).toBe(0);
        });
      });
    });
  });
});

describe('SampleDetailsComponents reaction product ratios', () => {
  let sandbox;
  beforeEach(() => { sandbox = sinon.createSandbox(); });
  afterEach(() => { sandbox.restore(); });

  const build = (groups, { group = 'products', unit = 'g', amountType = 'real' } = {}) => {
    const sample = new Sample({
      id: 'mixture-product', sample_type: 'Mixture', amountType,
      amount_value: unit === 'mol' ? 0.01 : 10, amount_unit: unit,
      sample_details: { total_mixture_volume_l: 0 },
    });
    sample.initialComponents(groups.map((materialGroup, index) => new Component({
      id: `component-${index}`, position: index, reference: index === 0,
      material_group: materialGroup, equivalent: [1, 1, 2][index],
      amount_mol: [0.01, 0.01, 0.02][index], density: materialGroup === 'liquid' ? 0.8 : 0,
      purity: 1, molecule: { molecular_weight: [100, 200, 300][index] },
    })));
    sample.components.forEach((component) => component.updatePhysicalAmounts());
    sample.total_mixture_mass_g = 10;
    sample.calculateRelativeMolecularWeightsForComponents();
    if (group) {
      const reaction = new Reaction({ type: 'reaction', [group]: [sample] });
      sample.belongTo = reaction;
    }
    const editor = new SampleDetailsComponents({ sample, onChange: () => {} });
    return { sample, editor };
  };
  const editRatio = (editor, ratio) => editor.onChangeComponent({
    type: 'ratioChanged', sampleID: 'component-1', newRatio: ratio,
    materialGroup: editor.props.sample.components[1].material_group,
  });

  describe('density and purity edits with unresolved product ratios', () => {
    let notifications;
    let dispose;

    beforeEach(() => {
      notifications = [];
      dispose = addMiddleware(rootStore.notificationsStore, (call, next) => {
        if (call.name === 'add') notifications.push(call.args[0]);
        return next(call);
      });
    });
    afterEach(() => { dispose(); });

    ['target', 'real'].forEach((amountType) => {
      ['density', 'purity'].forEach((property) => {
        [1, 2].forEach((unresolvedIndex) => {
          it(`keeps ${amountType} data on ${property} edits with n.d on component ${unresolvedIndex}`, () => {
            const { sample, editor } = build(['solid', 'liquid', 'solid'], { amountType });
            sample.components[unresolvedIndex].equivalent = 'n.d';
            const before = JSON.parse(JSON.stringify(sample.serializeMaterial()));

            editor.onChangeComponent({
              type: `${property}Changed`, sampleID: 'component-1', materialGroup: 'liquid',
              amount: property === 'density' ? { value: 1.2, unit: 'g/ml' } : { value: 0.5 },
              lockColumn: false,
            });

            expect(JSON.parse(JSON.stringify(sample.serializeMaterial()))).toEqual(before);
            expect(notifications).toEqual([expect.objectContaining({
              level: 'warning',
              message: 'Set a numeric ratio for every component before changing density or purity.',
            })]);
          });
        });
      });
    });

    ['density', 'purity'].forEach((property) => {
      it(`allows a ${property} edit with a valid zero ratio`, () => {
        const { sample, editor } = build(['solid', 'liquid', 'solid']);
        editRatio(editor, 0);

        editor.onChangeComponent({
          type: `${property}Changed`, sampleID: 'component-1', materialGroup: 'liquid',
          amount: property === 'density' ? { value: 1.2, unit: 'g/ml' } : { value: 0.5 },
          lockColumn: false,
        });

        expect(sample.components[1][property]).toBe(property === 'density' ? 1.2 : 0.5);
        expect(sample.amount_g).toBe(10);
        expect(notifications).toEqual([]);
      });
    });

    it('allows a density edit to repair a missing liquid mass basis', () => {
      const { sample, editor } = build(['solid', 'liquid', 'solid']);
      sample.components[1].density = 0;
      sample.components[1].starting_molarity_value = 0;
      expect(sample.getProductMixtureComposition()).toBe(null);

      editor.onChangeComponent({
        type: 'densityChanged', sampleID: 'component-1',
        amount: { value: 1.2, unit: 'g/ml' }, lockColumn: false,
      });

      expect(sample.components[1].density).toBe(1.2);
      expect(sample.getProductMixtureComposition()).not.toBe(null);
      expect(sample.components.reduce((sum, component) => sum + component.amount_g, 0)).toBeCloseTo(10, 12);
      expect(notifications).toEqual([]);
    });

    it('allows multiple missing liquid densities to be repaired one at a time', () => {
      const { sample, editor } = build(['solid', 'liquid', 'liquid']);
      sample.components.slice(1).forEach((component) => {
        component.density = 0;
        component.starting_molarity_value = 0;
      });
      const amounts = sample.components.map((component) => component.amount_mol);
      editor.onChangeComponent({
        type: 'densityChanged', sampleID: 'component-1',
        amount: { value: 1.2, unit: 'g/ml' }, lockColumn: false,
      });
      expect(sample.components[1].density).toBe(1.2);
      expect(sample.amount_g).toBe(10);
      expect(sample.components.map((component) => component.amount_mol)).toEqual(amounts);
      expect(notifications).toEqual([expect.objectContaining({ title: 'Density updated', level: 'info' })]);

      editor.onChangeComponent({
        type: 'densityChanged', sampleID: 'component-2',
        amount: { value: 1.05, unit: 'g/ml' }, lockColumn: false,
      });
      expect(sample.components[2].density).toBe(1.05);
      expect(sample.amount_g).toBe(10);
      expect(sample.components.reduce((sum, component) => sum + component.amount_g, 0)).toBeCloseTo(10, 12);
      expect(notifications).toHaveLength(1);
    });

    it('shows only the edit notice when an existing volume mismatch remains after rollback', () => {
      const { sample, editor } = build(['solid', 'liquid', 'liquid']);
      sample.density = 2;
      sample.components[2].density = 0;
      sample.components[2].starting_molarity_value = 0;
      const before = JSON.parse(JSON.stringify(sample.serializeMaterial()));

      editor.onChangeComponent({
        type: 'purityChanged', sampleID: 'component-1', materialGroup: 'liquid', amount: { value: 0.5 },
      });

      expect(JSON.parse(JSON.stringify(sample.serializeMaterial()))).toEqual(before);
      expect(notifications).toEqual([expect.objectContaining({
        title: 'Component edit not applied', level: 'warning',
      })]);
    });

    ['target', 'real'].forEach((amountType) => {
      ['density', 'purity'].forEach((property) => {
        ['liquid mass', 'molecular weight'].forEach((missing) => {
          it(`keeps ${amountType} mass during a ${property} edit with unknown ${missing}`, () => {
            const { sample, editor } = build(['solid', 'liquid', 'liquid'], { amountType });
            if (missing === 'liquid mass') {
              sample.components[2].density = 0;
              sample.components[2].starting_molarity_value = 0;
            } else {
              sample.components[2].molecule.molecular_weight = null;
            }
            sample.updateChecksum();
            const before = JSON.parse(JSON.stringify(sample.serializeMaterial()));
            const detailsBefore = { ...sample.sample_details };
            const amounts = sample.components.map((component) => [component.amount_mol, component.amount_g]);

            editor.onChangeComponent({
              type: `${property}Changed`, sampleID: 'component-1', materialGroup: 'liquid',
              amount: property === 'density' ? { value: 1.2, unit: 'g/ml' } : { value: 0.5 },
              lockColumn: false,
            });

            if (property === 'density') {
              expect(sample.components[1].density).toBe(1.2);
              expect(sample.components[1].amount_l).toBeCloseTo((0.01 * 200) / (1.2 * 1000), 12);
              expect(sample.components.map((component) => [component.amount_mol, component.amount_g])).toEqual(amounts);
              expect(sample.amount_g).toBe(10);
              expect(sample.sample_details).toEqual(detailsBefore);
              expect(sample.isPendingToSave).toBe(true);
              expect(notifications).toEqual([expect.objectContaining({ title: 'Density updated', level: 'info' })]);
            } else {
              expect(JSON.parse(JSON.stringify(sample.serializeMaterial()))).toEqual(before);
              expect(sample.isPendingToSave).toBe(false);
              expect(notifications).toEqual([expect.objectContaining({
                title: 'Component edit not applied', level: 'warning',
              })]);
            }

            // Completing the other component resumes redistribution without another notice.
            sample.components[2].density = 0.8;
            sample.components[2].molecule.molecular_weight = 300;
            editor.onChangeComponent({
              type: `${property}Changed`, sampleID: 'component-1', materialGroup: 'liquid',
              amount: property === 'density' ? { value: 1.2, unit: 'g/ml' } : { value: 0.5 },
              lockColumn: false,
            });
            expect(sample.components[1][property]).toBe(property === 'density' ? 1.2 : 0.5);
            expect(sample.amount_g).toBe(10);
            expect(sample.components.reduce((sum, component) => sum + component.amount_g, 0)).toBeCloseTo(10, 12);
            expect(notifications).toHaveLength(1);
          });
        });
      });

      it(`rolls back a ${amountType} density edit that invalidates a previously usable stock composition`, () => {
        const { sample, editor } = build(['solid', 'liquid', 'solid'], { amountType });
        sample.components[1].density = 0;
        sample.components[1].starting_molarity_value = 2;
        sample.components[1].molecule.molecular_weight = null;
        expect(sample.getProductMixtureComposition()).not.toBe(null);
        sample.updateChecksum();
        const before = JSON.parse(JSON.stringify(sample.serializeMaterial()));

        editor.onChangeComponent({
          type: 'densityChanged', sampleID: 'component-1',
          amount: { value: 1.2, unit: 'g/ml' }, lockColumn: false,
        });

        expect(JSON.parse(JSON.stringify(sample.serializeMaterial()))).toEqual(before);
        expect(sample.isPendingToSave).toBe(false);
        expect(notifications).toEqual([expect.objectContaining({
          title: 'Component edit not applied', level: 'warning',
        })]);
      });

      ['density', 'purity'].forEach((property) => {
        it(`restores ${amountType} stock and portion volume when a ${property} edit cannot fit the mass`, () => {
          const { sample, editor } = build(['liquid', 'liquid', 'liquid'], { amountType });
          sample.parent_id = 99;
          sample.amount_value = 5;
          sample.sample_details.total_mixture_volume_l = 0.02;
          sample.components[1].density = 0;
          sample.components[1].starting_molarity_value = 2;
          sample.components[1].updatePhysicalAmounts();
          sample.updateChecksum();
          const details = sample.sample_details;
          const before = JSON.parse(JSON.stringify(sample.serializeMaterial()));

          editor.onChangeComponent({
            type: `${property}Changed`, sampleID: 'component-1', materialGroup: 'liquid',
            amount: property === 'density' ? { value: 1.2, unit: 'g/ml' } : { value: 0.5 },
            lockColumn: false,
          });

          expect(JSON.parse(JSON.stringify(sample.serializeMaterial()))).toEqual(before);
          expect(sample.sample_details).toBe(details);
          expect(details.total_mixture_volume_l).toBe(0.02);
          expect(sample.isPendingToSave).toBe(false);
          expect(notifications).toEqual([expect.objectContaining({
            title: 'Component edit not applied', level: 'warning',
          })]);
        });
      });
    });

    ['density', 'purity'].forEach((property) => {
      it(`allows the ${property} edit after the unresolved ratio is corrected`, () => {
        const { sample, editor } = build(['solid', 'liquid', 'solid']);
        sample.components[2].equivalent = 'n.d';
        const event = {
          type: `${property}Changed`, sampleID: 'component-1', materialGroup: 'liquid',
          amount: property === 'density' ? { value: 1.2, unit: 'g/ml' } : { value: 0.5 },
          lockColumn: false,
        };
        editor.onChangeComponent(event);
        expect(notifications).toHaveLength(1);

        editor.onChangeComponent({
          type: 'ratioChanged', sampleID: 'component-2', materialGroup: 'solid', newRatio: 2,
        });
        editor.onChangeComponent(event);

        expect(sample.components[1][property]).toBe(property === 'density' ? 1.2 : 0.5);
        expect(sample.components.reduce((sum, component) => sum + component.amount_g, 0)).toBeCloseTo(10, 12);
        expect(sample.amount_g).toBe(10);
        expect(notifications).toHaveLength(1);
      });
    });

    [
      { name: 'standalone mixture', group: null },
      { name: 'reactant', group: 'reactants' },
      { name: 'mol-entered product', group: 'products', unit: 'mol' },
    ].forEach(({ name, group, unit = 'g' }) => {
      ['density', 'purity'].forEach((property) => {
        it(`keeps ${property} edits available for a ${name} with unresolved ratios`, () => {
          const { sample, editor } = build(['solid', 'liquid', 'solid'], { group, unit });
          sample.components[2].equivalent = 'n.d';

          editor.onChangeComponent({
            type: `${property}Changed`, sampleID: 'component-1', materialGroup: 'liquid',
            amount: property === 'density' ? { value: 1.2, unit: 'g/ml' } : { value: 0.5 },
            lockColumn: false,
          });

          expect(sample.components[1][property]).toBe(property === 'density' ? 1.2 : 0.5);
          expect(notifications).toEqual([]);
        });
      });
    });
  });

  [['solid', 'solid', 'solid'], ['liquid', 'liquid', 'liquid'], ['solid', 'liquid', 'solid']]
    .forEach((groups) => {
      ['target', 'real'].forEach((amountType) => {
        it(`keeps the ${amountType} product mass for ${groups.join('/')} through repeated ratio edits`, () => {
          const { sample, editor } = build(groups, { amountType });

          [3, 0, 2, 1].forEach((ratio) => {
            editRatio(editor, ratio);

            const denominator = 100 + ratio * 200 + 2 * 300;
            [1, ratio, 2].forEach((componentRatio, index) => {
              expect(sample.components[index].amount_mol).toBeCloseTo(10 * componentRatio / denominator, 12);
              expect(sample.components[index].equivalent).toBe(componentRatio);
            });
            expect(sample.amount_g).toBe(10);
            expect(sample.amount_unit).toBe('g');
            expect(sample.total_mixture_mass_g).toBe(10);
            expect(sample.components.reduce((sum, component) => sum + component.amount_g, 0)).toBeCloseTo(10, 12);
            expect(sample.amount_mol).toBeCloseTo(10 / denominator, 12);
            sample.prepareMixtureForSave();
            const payload = JSON.parse(JSON.stringify(sample.serializeMaterial()));
            payload.components.forEach((entry, index) => {
              entry.component_properties.molecule = sample.components[index].molecule;
            });
            const reopened = new Sample(payload);
            reopened.initialComponents(payload.components.map(Component.deserializeData));
            expect(reopened.amount_g).toBe(10);
            expect(reopened.components.map((component) => component.amount_mol))
              .toEqual(sample.components.map((component) => component.amount_mol));
            expect(reopened.amount_mol).toBeCloseTo(10 / denominator, 12);
          });
        });
      });
    });

  ['starting_materials', 'reactants', 'solvents', null].forEach((group) => {
    it(`keeps reference moles fixed for ${group || 'standalone mixtures'}`, () => {
      const { sample, editor } = build(['solid', 'solid', 'solid'], { group });
      editRatio(editor, 3);
      expect(sample.components[0].amount_mol).toBe(0.01);
      expect(sample.components[1].amount_mol).toBe(0.03);
      expect(sample.amount_g).toBeCloseTo(13, 12);
    });
  });

  it('retains reference-driven ratio edits for a product entered in moles', () => {
    const { sample, editor } = build(['solid', 'solid', 'solid'], { unit: 'mol' });
    editRatio(editor, 3);
    expect(sample.components[0].amount_mol).toBe(0.01);
    expect(sample.components[1].amount_mol).toBe(0.03);
    expect(sample.amount_g).toBeCloseTo(13, 12);
  });

  it('conserves physical mass and purity when a product component contains impurities', () => {
    const { sample, editor } = build(['solid', 'liquid', 'solid']);
    sample.components[1].purity = 0.5;
    editRatio(editor, 3);
    expect(sample.components[1].amount_mol).toBeCloseTo(30 / 1900, 12);
    expect(sample.components[1].purity).toBe(0.5);
    expect(sample.components.reduce((sum, component) => sum + component.amount_g, 0)).toBeCloseTo(10, 12);
    expect(sample.amount_g).toBe(10);
  });

  [NaN, Infinity, -1].forEach((ratio) => {
    it(`ignores invalid product ratio ${ratio}`, () => {
      const { sample, editor } = build(['solid', 'solid', 'solid']);
      const amounts = sample.components.map((component) => component.amount_mol);
      editRatio(editor, ratio);
      expect(sample.amount_g).toBe(10);
      expect(sample.components.map((component) => component.amount_mol)).toEqual(amounts);
      expect(sample.components[1].equivalent).toBe(1);
    });
  });

  [1, 0.5].forEach((purity) => {
    it(`uses solution mass for a 2 M stock liquid at purity ${purity}, including round trips`, () => {
      const { sample, editor } = build(['solid', 'liquid', 'liquid']);
      const weights = [180.16, 46.07, 1000 / (2 * purity)];
      sample.components.forEach((component, index) => {
        component.molecule.molecular_weight = [180.16, 46.07, 60.05][index];
        component.equivalent = 1;
        if (index === 2) {
          component.density = 0;
          component.starting_molarity_value = 2;
          component.purity = purity;
        }
        component.amount_mol = 10 / weights.reduce((sum, weight) => sum + weight, 0);
        component.updatePhysicalAmounts();
      });
      const originalAmount = sample.components[0].amount_mol;

      [3, 1, 2, 1].forEach((ratio) => {
        editRatio(editor, ratio);
        const expected = 10 / (weights[0] + ratio * weights[1] + weights[2]);
        expect(sample.components[0].amount_mol).toBeCloseTo(expected, 12);
        expect(sample.components[2].amount_l).toBeCloseTo(expected / (2 * purity), 12);
        sample.calculateTotalMixtureMass();
        expect(sample.amount_g).toBeCloseTo(10, 12);
      });
      expect(sample.components[0].amount_mol).toBeCloseTo(originalAmount, 12);

      editor.onChangeComponent({
        type: 'densityChanged', sampleID: 'component-1', amount: { value: 0.8, unit: 'g/ml' }, lockColumn: false,
      });
      expect(sample.amount_g).toBeCloseTo(10, 12);
      editor.onChangeComponent({
        type: 'purityChanged', sampleID: 'component-2', amount: { value: 0.5 }, materialGroup: 'liquid',
      });
      sample.calculateTotalMixtureMass();
      expect(sample.components[0].amount_mol).toBeCloseTo(10 / (180.16 + 46.07 + 1000), 12);
      expect(sample.amount_g).toBeCloseTo(10, 12);
    });
  });

  [0, 0.005].forEach((totalVolume) => {
    it(`reserves internal solvent/remainder mass with total volume ${totalVolume}`, () => {
      const { sample, editor } = build(['solid', 'liquid', 'solid']);
      sample.solvent = [{ density: 1, amount_l: 0.005, ratio: 1 }];
      sample.sample_details.total_mixture_volume_l = totalVolume;

      [1, 3, 4, 0.5, 1].forEach((ratio) => {
        editRatio(editor, ratio);
        const scale = totalVolume > 0
          ? Math.min(5 / 700, 10 / (700 + ratio * 200))
          : 5 / (700 + ratio * 200);
        expect(sample.components[0].amount_mol).toBeCloseTo(scale, 12);
        expect(sample.solvent[0].amount_l).toBe(0.005);
        expect(sample.total_mixture_volume_l).toBe(totalVolume);
        sample.calculateTotalMixtureMass();
        expect(sample.amount_g).toBeCloseTo(10, 12);
        editor.onChangeComponent({
          type: 'purityChanged', sampleID: 'component-0', amount: { value: 1 }, materialGroup: 'solid',
        });
        expect(sample.amount_g).toBeCloseTo(10, 12);
      });
    });
  });

  [true, false].forEach((locked) => {
    [0, 1].forEach((index) => {
      it(`redistributes purity edits on component ${index} with the Mass lock ${locked}`, () => {
        const { sample, editor } = build(['solid', 'solid', 'solid']);
        sandbox.stub(ComponentStore, 'getState').returns({
          ...ComponentStore.getState(), lockAmountColumnSolidsBySample: { [sample.id]: locked }, lockedComponents: [],
        });
        editRatio(editor, 3);
        editor.onChangeComponent({
          type: 'purityChanged', sampleID: `component-${index}`,
          amount: { value: 0.5 }, materialGroup: 'solid',
        });
        const denominator = index === 0 ? 200 + 600 + 600 : 100 + 1200 + 600;
        expect(sample.components[0].amount_mol).toBeCloseTo(10 / denominator, 12);
        expect(sample.components[index].purity).toBe(0.5);
        expect(sample.components.map((component) => component.equivalent)).toEqual([1, 3, 2]);
        sample.calculateTotalMixtureMass();
        expect(sample.amount_g).toBeCloseTo(10, 12);
        editRatio(editor, 1);
        expect(sample.amount_g).toBeCloseTo(10, 12);
      });
    });
  });

  ['products', 'reactants'].forEach((group) => {
    it(`resolves a sample-list mixture's ${group} role through resource tags`, () => {
      const { sample, editor } = build(['solid', 'solid', 'solid'], { group });
      const reaction = sample.belongTo;
      sample.tag = { taggable_data: { resources: [
        { resource_context_type: 'Reaction', resource_context_id: reaction.id },
      ] } };
      sample.belongTo = undefined;
      sandbox.stub(alt, 'getStore').withArgs('ElementStore').returns({ getState: () => ({ selecteds: [reaction] }) });
      editRatio(editor, 3);
      expect(sample.amount_g).toBeCloseTo(group === 'products' ? 10 : 13, 12);
      expect(sample.hasFixedProductMass()).toBe(group === 'products');
      expect(sample.belongTo).toBeUndefined();
    });
  });

  it('keeps a liquid-only product mass when Total volume already accounts for its entire mass', () => {
    const { sample, editor } = build(['liquid', 'liquid', 'liquid']);
    sample.sample_details.total_mixture_volume_l = 0.01;
    [3, 1, 2, 1].forEach((ratio) => {
      editRatio(editor, ratio);
      expect(sample.components.reduce((sum, component) => sum + Sample.componentMassInMixture(component), 0))
        .toBeCloseTo(9, 12);
      sample.calculateTotalMixtureMass();
      expect(sample.amount_g).toBeCloseTo(10, 12);
    });
    expect(sample.components[0].amount_mol).toBeCloseTo(0.01, 12);
  });

  it('balances a concentration-locked product volume and internal solvent through a zero ratio', () => {
    const { sample, editor } = build(['solid', 'liquid', 'solid']);
    sample.solvent = [{ density: 1, amount_l: 0.001 }];
    sample.components[1].concn = 2;
    sandbox.stub(ComponentStore, 'getState').returns({
      ...ComponentStore.getState(), lockedComponents: [sample.components[1].id],
    });
    [3, 0, 1].forEach((ratio) => {
      editRatio(editor, ratio);
      expect(sample.components[1].concn).toBe(2);
      expect(sample.total_mixture_volume_l).toBeCloseTo(sample.components[1].amount_mol / 2, 12);
      sample.calculateTotalMixtureMass();
      expect(sample.amount_g).toBeCloseTo(10, 12);
    });
  });

  ['mol', 'l'].forEach((unit) => {
    ['target', 'real'].forEach((amountType) => {
      it(`keeps legacy ${amountType} ${unit} products out of fixed-mass edits before and after reopening`, () => {
        const { sample, editor } = build(['solid', 'liquid', 'solid'], { unit, amountType });
        sample.components.forEach((component) => {
          component.amount_mol = 0.02;
          component.equivalent = 1;
        });
        // Litre quantities keep their saved basis until the stock liquid has a known density.
        sample.components[1].density = 0;
        sample.components[1].starting_molarity_value = 2;
        sample.components.forEach((component) => component.updatePhysicalAmounts());
        sample.total_mixture_mass_g = 18;
        sample.density = 1.2;
        sample.amount_value = unit === 'mol' ? 0.02 : 0.015;
        sample.calculateRelativeMolecularWeightsForComponents();
        sandbox.stub(ComponentStore, 'getState').returns({
          ...ComponentStore.getState(), lockedComponents: [], lockAmountColumnSolidsBySample: { [sample.id]: false },
        });

        editor.onChangeComponent({
          type: 'purityChanged', sampleID: 'component-0', materialGroup: 'solid', amount: { value: 0.5 },
        });
        expect(sample.amount_unit).toBe(unit === 'l' ? 'l' : 'g');
        expect(sample.hasFixedProductMass()).toBe(false);
        expect(sample.amount_g).toBeCloseTo(unit === 'l' ? 18 : 20, 12);
        editor.onChangeComponent({
          type: 'densityChanged', sampleID: 'component-1', amount: { value: 1.05, unit: 'g/ml' }, lockColumn: false,
        });
        sample.components.forEach((component) => expect(component.amount_mol).toBeCloseTo(0.02, 12));
        expect(sample.amount_g).toBeCloseTo(14, 12);

        sample.prepareMixtureForSave();
        const payload = JSON.parse(JSON.stringify(sample.serializeMaterial()));
        expect(payload.sample_details.reaction_amount_input_units[amountType]).toBe(unit);
        payload.components.forEach((component, index) => {
          component.component_properties.molecule = sample.components[index].molecule;
        });
        const reopened = new Sample(payload);
        reopened.amountType = amountType;
        reopened.initialComponents(payload.components.map(Component.deserializeData));
        reopened.belongTo = new Reaction({ type: 'reaction', products: [reopened] });
        const reopenedEditor = new SampleDetailsComponents({ sample: reopened, onChange: () => {} });
        reopenedEditor.onChangeComponent({
          type: 'purityChanged', sampleID: 'component-0', materialGroup: 'solid', amount: { value: 0.25 },
        });
        reopenedEditor.onChangeComponent({
          type: 'densityChanged', sampleID: 'component-1', amount: { value: 0.9, unit: 'g/ml' }, lockColumn: false,
        });
        reopened.components.forEach((component) => expect(component.amount_mol).toBeCloseTo(0.02, 12));
        expect(reopened.hasFixedProductMass()).toBe(false);
        expect(reopened.amount_g).toBeCloseTo(18, 12);
      });
    });

    it(`does not fix mass after a ${unit} input has been normalized to grams`, () => {
      const { sample, editor } = build(['solid', 'solid', 'solid']);
      sample.sample_details.reaction_amount_input_units = { real: unit };
      editRatio(editor, 3);
      expect(sample.components[0].amount_mol).toBe(0.01);
      expect(sample.amount_g).toBeCloseTo(13, 12);
    });
  });
});

describe('legacy litre product quantities', () => {
  const amountMol = 0.0390907;
  const massG = amountMol * (46.07 + 18.015);
  const build = (litreType = 'real') => {
    const sample = new Sample({
      id: 245, sample_type: 'Mixture', amountType: litreType, can_update: true, parent_id: 99,
      real_amount_value: litreType === 'real' ? 0.003 : 2, real_amount_unit: litreType === 'real' ? 'l' : 'g',
      target_amount_value: litreType === 'target' ? 0.003 : 2, target_amount_unit: litreType === 'target' ? 'l' : 'g',
      density: 0, sample_details: { total_mixture_mass_g: 7.26 },
    });
    sample.initialComponents([46.07, 18.015].map((weight, index) => new Component({
      id: index + 1, position: index, reference: index === 0, equivalent: 1,
      material_group: 'liquid', molecule: { molecular_weight: weight }, density: index === 0 ? 0.8 : 1,
      purity: 1, amount_mol: amountMol, relative_molecular_weight: 64.085,
    })));
    sample.components.forEach((component) => component.updatePhysicalAmounts());
    sample.belongTo = new Reaction({ type: 'reaction', products: [sample] });
    const editor = new SampleDetailsComponents({ sample, onChange: () => {} });
    return { sample, editor };
  };
  const reload = (sample) => {
    const payload = JSON.parse(JSON.stringify(sample.serializeMaterial()));
    payload.can_update = sample.can_update;
    payload.components.forEach((component, index) => {
      component.component_properties.molecule = sample.components[index].molecule;
    });
    const loaded = new Sample(payload);
    loaded.initialComponents(payload.components.map(Component.deserializeData));
    loaded.belongTo = new Reaction({ type: 'reaction', products: [loaded] });
    return loaded;
  };
  const densityEdit = (editor) => editor.onChangeComponent({
    type: 'densityChanged', sampleID: 2, amount: { value: 0.9, unit: 'g/ml' }, lockColumn: false,
  });

  const buildWithMissingDensity = () => {
    const { sample } = build();
    sample.real_amount_value = 0.005;
    sample.sample_details.reaction_amount_volumes_l.real = 0.005;
    sample.initialComponents([180.16, 46.07, 60.052].map((weight, index) => new Component({
      id: index + 1, position: index, reference: index === 0, equivalent: 1,
      material_group: index === 0 ? 'solid' : 'liquid', molecule: { molecular_weight: weight },
      density: index === 1 ? 0.8 : 0, starting_molarity_value: index === 2 ? 2 : 0,
      purity: 1, amount_mol: 0.01377, relative_molecular_weight: 286.282,
    })));
    sample.components.forEach((component) => component.updatePhysicalAmounts());
    return sample;
  };

  it('keeps an unknown-density litre quantity through unrelated edits, saves and reopening', () => {
    let sample = buildWithMissingDensity();
    const form = Object.create(SampleForm.prototype);
    expect(sample.components[2].amount_l).toBeCloseTo(0.006885, 12);
    for (let cycle = 0; cycle < 2; cycle += 1) {
      const editor = new SampleDetailsComponents({ sample, onChange: () => {} });
      densityEdit(editor);
      expect(sample.components[1].density).toBe(0.9);
      sample.components.forEach((component) => expect(component.amount_mol).toBeCloseTo(0.01377, 12));
      expect(sample.amount_unit).toBe('l');
      expect(sample.amount_value).toBe(0.005);
      expect(sample.density).toBe(0);
      expect(sample.sample_details.total_mixture_mass_g).toBe(7.26);
      expect(form.totalMixtureDensity(sample).props.children.props.value).toBe(null);
      sample = reload(sample);
    }
    const editor = new SampleDetailsComponents({ sample, onChange: () => {} });
    editor.onChangeComponent({
      type: 'densityChanged', sampleID: 3, amount: { value: 1.05, unit: 'g/ml' }, lockColumn: false,
    });
    const expectedMass = 0.01377 * (180.16 + 46.07 + 60.052);
    expect(sample.amount_unit).toBe('g');
    expect(sample.amount_g).toBeCloseTo(expectedMass, 12);
    expect(sample.density).toBeCloseTo(expectedMass / 5, 12);
    expect(sample.sample_details.reaction_amount_volumes_l.real).toBe(0.005);
    sample.components.forEach((component) => expect(component.amount_mol).toBeCloseTo(0.01377, 12));
    sample = reload(sample);
    expect(sample.amount_g).toBeCloseTo(expectedMass, 12);
    expect(sample.mixtureAmountDensity()).toBeCloseTo(expectedMass / 5, 12);
  });

  it('preserves a saved mass when a litre-based mixture has a missing liquid density', () => {
    const sample = buildWithMissingDensity();
    sample.amount_unit = 'g';
    sample.amount_value = 3.942;
    sample.sample_details.total_mixture_mass_g = 3.942;
    const editor = new SampleDetailsComponents({ sample, onChange: () => {} });
    densityEdit(editor);
    expect(sample.amount_g).toBe(3.942);
    expect(sample.sample_details.total_mixture_mass_g).toBe(3.942);
    expect(sample.sample_details.reaction_amount_volumes_l.real).toBe(0.005);
    sample.components.forEach((component) => expect(component.amount_mol).toBeCloseTo(0.01377, 12));
  });

  it('keeps a litre quantity separate from entered Total volume through edits and reopening', () => {
    let { sample, editor } = build();
    for (let cycle = 0; cycle < 3; cycle += 1) {
      densityEdit(editor);
      expect(sample.amount_g).toBeCloseTo(massG, 12);
      expect(sample.density).toBeCloseTo(massG / 3, 12);
      expect(sample.sample_details.total_mixture_volume_l).toBeUndefined();
      sample.components.forEach((component) => expect(component.amount_mol).toBeCloseTo(amountMol, 12));
      const form = Object.create(SampleForm.prototype);
      expect(form.totalMixtureVolume(sample).props.value).toBeCloseTo(0.003, 12);
      sample = reload(sample);
      editor = new SampleDetailsComponents({ sample, onChange: () => {} });
    }
  });

  ['real', 'target'].forEach((litreType) => {
    it(`keeps ${litreType} litre volume independent of the other amount type's grams after saving`, () => {
      const { sample, editor } = build(litreType);
      const gramType = litreType === 'real' ? 'target' : 'real';
      densityEdit(editor);
      const litreMassG = sample[`${litreType}_amount_value`];
      sample.amountType = gramType;
      const form = Object.create(SampleForm.prototype);
      expect(form.totalMixtureVolume(sample).props.value).toBe(0);
      editor.onChangeComponent({
        type: 'purityChanged', sampleID: 2, materialGroup: 'liquid', amount: { value: 0.8 },
      });
      expect(sample.amount_g).toBe(2);
      expect(sample.components[1].purity).toBe(0.8);
      expect(sample.components.reduce((sum, component) => sum + component.amount_g, 0)).toBeCloseTo(2, 12);
      expect(sample[`${litreType}_amount_value`]).toBe(litreMassG);
      expect(sample.density).toBeCloseTo(massG / 3, 12);

      const reopened = reload(sample);
      reopened.amountType = litreType;
      expect(form.totalMixtureVolume(reopened).props.value).toBeCloseTo(0.003, 12);
      expect(form.totalMixtureDensity(reopened).props.children.props.value).toBeCloseTo(massG / 3, 12);
      reopened.amountType = gramType;
      expect(form.totalMixtureVolume(reopened).props.value).toBe(0);
    });
  });

  it('rescales the recorded litre quantity when its reaction amount is changed', () => {
    const { sample, editor } = build();
    densityEdit(editor);
    const form = Object.create(SampleForm.prototype);
    sample.setAmountAndNormalizeToGram({ value: massG * 2, unit: 'g' });
    expect(form.totalMixtureVolume(sample).props.value).toBeCloseTo(0.006, 12);
    expect(sample.mixtureAmountDensity()).toBeCloseTo(massG / 3, 12);
    sample.components.forEach((component) => expect(component.amount_mol).toBeCloseTo(amountMol * 2, 12));
    sample.setAmount({ value: massG, unit: 'g' });
    expect(form.totalMixtureVolume(sample).props.value).toBeCloseTo(0.003, 12);
    sample.setAmount({ value: 0.006, unit: 'l' });
    expect(sample.amount_g).toBeCloseTo(massG * 2, 12);
    sample.setAmountAndNormalizeToGram({ value: 0.003, unit: 'l' });
    expect(form.totalMixtureVolume(sample).props.value).toBeCloseTo(0.003, 12);
    expect(sample.amount_g).toBeCloseTo(massG, 12);
  });

  it('retains a known litre quantity even when all component amounts are cleared', () => {
    const { sample, editor } = build();
    densityEdit(editor);
    sample.components.forEach((component) => {
      component.amount_mol = 0;
      component.updatePhysicalAmounts();
    });
    sample.calculateTotalMixtureMass();
    const reopened = reload(sample);
    reopened.amountType = 'real';
    expect(reopened.amount_g).toBe(0);
    expect(reopened.enteredMixtureTotalVolume()).toBe(0.003);
    reopened.setAmount({ value: 0, unit: 'l' });
    expect(reopened.enteredMixtureTotalVolume()).toBe(0);
  });
});

describe('SampleDetailsComponents solid ratio edits', () => {
  let sandbox;
  let notifications;
  let dispose;

  beforeEach(() => {
    sandbox = sinon.createSandbox();
    notifications = [];
    dispose = addMiddleware(rootStore.notificationsStore, (call, next) => {
      if (call.name === 'add') notifications.push(call.args[0]);
      return next(call);
    });
  });

  afterEach(() => {
    dispose();
    sandbox.restore();
  });

  const build = (locked, referenceMol = 0.012) => {
    const sample = new Sample({ id: 'ratio-sample', sample_type: 'Mixture' });
    const reference = new Component({
      id: 'reference', parent_id: sample.id, position: 0, reference: true,
      material_group: 'solid', amount_mol: referenceMol, amount_g: referenceMol ? referenceMol * 100 : 1,
      purity: 1, molecule: { molecular_weight: 100 },
    });
    const other = new Component({
      // A real dropped component's parent_id is its source sample, not the mixture id
      // where the Mass lock is stored; the editor must still resolve the lock correctly.
      id: 'other', parent_id: 'other-source-sample', position: 1, reference: false,
      material_group: 'solid', amount_mol: 0, amount_g: 0,
      purity: 0.4, molecule: { molecular_weight: 330.38 },
    });
    sample.initialComponents([reference, other]);
    sandbox.stub(ComponentStore, 'getState').returns({
      ...ComponentStore.getState(), lockAmountColumnSolidsBySample: { [sample.id]: locked }, lockedComponents: [],
    });
    const editor = Object.create(SampleDetailsComponents.prototype);
    editor.props = { sample };
    return { editor, sample, reference, other };
  };

  [true, false].forEach((locked) => {
    it(`preserves entered purity when typing a solid ratio with Mass locked=${locked}`, () => {
      const { editor, sample, other } = build(locked);

      editor.updateRatio({ sampleID: other.id, newRatio: 2, materialGroup: 'solid' });

      expect(other.amount_mol).toBeCloseTo(0.024, 12);
      expect(other.amount_g).toBeCloseTo(19.8228, 10);
      expect(other.purity).toBe(0.4);
      expect(sample.serializeMaterial().components[1].component_properties.purity).toBe(0.4);
      expect(notifications).toEqual([]);
    });

    it(`honors the Mass lock when changing a ratio on a solid with an existing mass, locked=${locked}`, () => {
      const { editor, sample, other } = build(locked);
      other.amount_mol = 0.006;
      other.amount_g = 4.9557;
      other.equivalent = 0.5;

      editor.updateRatio({ sampleID: other.id, newRatio: 1, materialGroup: 'solid' });

      expect(other.amount_mol).toBeCloseTo(0.012, 12);
      expect(other.amount_g).toBeCloseTo(locked ? 4.9557 : 9.9114, 10);
      expect(other.purity).toBeCloseTo(locked ? 0.8 : 0.4, 6);
      expect(other.equivalent).toBe(1);
      const saved = sample.serializeMaterial().components[1].component_properties;
      expect(saved.amount_g).toBeCloseTo(locked ? 4.9557 : 9.9114, 10);
      expect(saved.purity).toBeCloseTo(locked ? 0.8 : 0.4, 6);
      expect(notifications).toEqual([]);
    });
  });

  it('preserves purity when a ratio is typed before the reference amount, then filled with Mass locked', () => {
    const { editor, other, reference } = build(true, 0);
    editor.updateRatio({ sampleID: other.id, newRatio: 2, materialGroup: 'solid' });
    expect(other.purity).toBe(0.4);
    expect(other.amount_g).toBe(0);

    editor.updatedSampleForAmountUnitChange({ sampleID: reference.id, amount: { value: 0.01, unit: 'mol' } });

    expect(other.amount_mol).toBeCloseTo(0.02, 12);
    expect(other.amount_g).toBeCloseTo(16.519, 10);
    expect(other.purity).toBe(0.4);
    expect(notifications).toEqual([]);
  });

  it('keeps purity when an amount is cleared with Mass locked', () => {
    const { editor, sample, other } = build(true);
    other.amount_mol = 0.024;
    other.amount_g = 19.8228;

    editor.updatedSampleForAmountUnitChange({ sampleID: other.id, amount: { value: 0, unit: 'mol' } });

    expect(other.amount_mol).toBe(0);
    expect(other.amount_g).toBeCloseTo(19.8228, 10);
    expect(other.purity).toBe(0.4);
    expect(other.equivalent).toBe('n.d');
    sample.updateMixtureComponentEquivalent();
    expect(other.equivalent).toBe('n.d');
    expect(sample.serializeMaterial().components[1].component_properties.equivalent).toBe('n.d');
    expect(notifications).toEqual([]);
  });

  it('includes a newly filled solid mass in the mixture total and relative weights with Mass locked', () => {
    const { editor, sample, reference, other } = build(true);

    editor.updatedSampleForAmountUnitChange({ sampleID: other.id, amount: { value: 0.01, unit: 'mol' } });

    const expectedMass = (0.01 * 330.38) / 0.4;
    expect(other.amount_g).toBeCloseTo(expectedMass, 10);
    expect(other.purity).toBe(0.4);
    expect(sample.amount_g).toBeCloseTo(reference.amount_g + expectedMass, 10);
    expect(other.relative_molecular_weight).toBeCloseTo((reference.amount_g + expectedMass) / 0.01, 8);
    expect(notifications).toEqual([]);
  });
});

describe('SampleDetailsComponents liquid ratio round trips', () => {
  let sandbox;

  beforeEach(() => {
    sandbox = sinon.createSandbox();
    sandbox.stub(ComponentStore, 'getState').returns({ ...ComponentStore.getState(), lockedComponents: [] });
  });
  afterEach(() => { sandbox.restore(); });

  [false, true].forEach((isPortion) => {
    [false, true].forEach((hasSolvent) => {
      [0.8, 1.2].forEach((density) => {
        it(`reverses liquid ratios, portion=${isPortion}, solvent=${hasSolvent}, density=${density}`, () => {
          const initialMass = hasSolvent ? 4 : 3;
          const initialVolume = 2 / density / 1000 + (hasSolvent ? 0.001 : 0);
          let sample = new Sample({
            id: 'liquid-ratio', parent_id: isPortion ? 'stock' : null,
            sample_type: 'Mixture', amount_value: initialMass, amount_unit: 'g',
            density: initialMass / (initialVolume * 1000),
            sample_details: { total_mixture_mass_g: initialMass },
            solvent: hasSolvent ? [{ amount_l: 0.001, density: 1 }] : [],
          });
          sample.initialComponents([
            new Component({
              id: 'reference', position: 0, reference: true, material_group: 'solid',
              amount_mol: 0.01, amount_g: 1, purity: 1, molecule: { molecular_weight: 100 },
            }),
            new Component({
              id: 'liquid', position: 1, reference: false, material_group: 'liquid',
              amount_mol: 0.01, amount_g: 2, amount_l: 2 / density / 1000,
              purity: 1, density, starting_molarity_value: 0, molecule: { molecular_weight: 200 },
            }),
          ]);
          const editor = Object.create(SampleDetailsComponents.prototype);
          editor.props = { sample, onChange: sinon.spy() };

          [2, 1, 3, 1, 2, 1].forEach((ratio) => {
            editor.onChangeComponent({
              type: 'ratioChanged', sampleID: 'liquid', newRatio: ratio, materialGroup: 'liquid',
            });

            const expectedMass = 1 + ratio * 2 + (hasSolvent ? 1 : 0);
            expect(sample.amount_g).toBeCloseTo(expectedMass, 12);
            expect(sample.components[0].amount_mol).toBeCloseTo(0.01, 12);
            expect(sample.components[1].amount_mol).toBeCloseTo(0.01 * ratio, 12);
            expect(sample.components[1].amount_l).toBeCloseTo(2 * ratio / density / 1000, 12);
            expect(sample.density).toBe(0);
            expect(sample.total_mixture_volume_l).toBe(0);
            if (hasSolvent) expect(sample.solvent[0].amount_l).toBeCloseTo(0.001, 12);
            sample.calculateTotalMixtureMass();
            expect(sample.amount_g).toBeCloseTo(expectedMass, 12);

            // Reopening between edits must not turn a derived volume into an entered total volume.
            const payload = JSON.parse(JSON.stringify(sample.serializeMaterial()));
            payload.components.forEach((entry, index) => {
              entry.component_properties.molecule = sample.components[index].molecule;
            });
            sample = new Sample(payload);
            sample.initialComponents(payload.components.map(Component.deserializeData));
            editor.props.sample = sample;
            sample.calculateTotalMixtureMass();
            expect(sample.amount_g).toBeCloseTo(expectedMass, 12);
          });
        });
      });
    });
  });
});

describe('SampleDetailsComponents ratio fill after a reference amount is entered', () => {
  let sandbox;

  beforeEach(() => { sandbox = sinon.createSandbox(); });
  afterEach(() => { sandbox.restore(); });

  const setupEditor = (sample, { lockAmountColumnSolids = false, lockedComponents = [] } = {}) => {
    sandbox.stub(ComponentStore, 'getState').returns({
      ...ComponentStore.getState(),
      lockAmountColumnSolidsBySample: { [sample.id]: lockAmountColumnSolids },
      lockedComponents,
    });
    const editor = Object.create(SampleDetailsComponents.prototype);
    editor.props = { sample };
    return editor;
  };

  // S16: a ratio typed before the reference had an amount must survive a purity edit and then
  // fill into a real amount once the reference gets one.
  it('keeps a typed ratio through a purity edit, then fills the amount (liquid)', () => {
    const sample = new Sample({ id: 'ratio-sample', sample_type: 'Mixture' });
    const reference = new Component({
      id: 'reference', parent_id: sample.id, position: 0, reference: true,
      material_group: 'liquid', amount_mol: 0, density: 1, purity: 1, molecule: { molecular_weight: 100 },
    });
    const b = new Component({
      id: 'b', parent_id: 'b-source-sample', position: 1, reference: false,
      material_group: 'liquid', amount_mol: 0, density: 1, purity: 0.5, molecule: { molecular_weight: 100 },
    });
    sample.initialComponents([reference, b]);
    const editor = setupEditor(sample);

    editor.updateRatio({ sampleID: b.id, newRatio: 2, materialGroup: 'liquid' });
    expect(b.equivalent).toBe(2);
    expect(b.amount_mol).toBe(0);

    // Before S16 this wiped the ratio to 'n.d'.
    editor.updatePurity({ sampleID: b.id, amount: { value: 0.9 }, materialGroup: 'liquid' });
    expect(b.equivalent).toBe(2);

    editor.updatedSampleForAmountUnitChange({ sampleID: reference.id, amount: { value: 0.01, unit: 'mol' } });
    expect(b.amount_mol).toBeCloseTo(0.02, 12);
  });

  // S17: filling a Mass-locked solid from its ratio must keep the entered mass and derive purity,
  // not overwrite the mass.
  it('keeps a locked solid mass and derives purity when filling from a ratio', () => {
    const sample = new Sample({ id: 'ratio-sample', sample_type: 'Mixture' });
    const reference = new Component({
      id: 'reference', parent_id: sample.id, position: 0, reference: true,
      material_group: 'solid', amount_mol: 0, amount_g: 0, purity: 1, molecule: { molecular_weight: 100 },
    });
    const b = new Component({
      id: 'b', parent_id: 'b-source-sample', position: 1, reference: false,
      material_group: 'solid', amount_mol: 0, amount_g: 4.9557, purity: 0.4, molecule: { molecular_weight: 330.38 },
    });
    b.equivalent = 1;
    sample.initialComponents([reference, b]);
    const editor = setupEditor(sample, { lockAmountColumnSolids: true });

    editor.updatedSampleForAmountUnitChange({ sampleID: reference.id, amount: { value: 0.012, unit: 'mol' } });

    expect(b.amount_mol).toBeCloseTo(0.012, 12);
    // Mass preserved (would be overwritten to 9.9114 before S17); purity derived: 0.012*330.38/4.9557 = 0.8.
    expect(b.amount_g).toBeCloseTo(4.9557, 10);
    expect(b.purity).toBeCloseTo(0.8, 6);
  });

  // S17: the fill path must apply the concentration lock's total-volume update, as the
  // direct ratio-change path (updateComponentRatio) already does.
  it('updates the mixture total volume when filling a concentration-locked component', () => {
    const sample = new Sample({ id: 'ratio-sample', sample_type: 'Mixture' });
    const reference = new Component({
      id: 'reference', parent_id: sample.id, position: 0, reference: true,
      material_group: 'liquid', amount_mol: 0, density: 1, purity: 1, molecule: { molecular_weight: 100 },
    });
    const b = new Component({
      id: 'b', parent_id: 'b-source-sample', position: 1, reference: false,
      material_group: 'liquid', amount_mol: 0, density: 1, purity: 1, concn: 2, molecule: { molecular_weight: 100 },
    });
    b.equivalent = 3;
    sample.initialComponents([reference, b]);
    const editor = setupEditor(sample, { lockedComponents: ['b'] });
    // Stub so the assertion targets the call, not setTotalMixtureVolume's downstream work.
    const volStub = sandbox.stub(sample, 'updateTotalVolume');

    editor.updatedSampleForAmountUnitChange({ sampleID: reference.id, amount: { value: 0.01, unit: 'mol' } });

    expect(b.amount_mol).toBeCloseTo(0.03, 12);
    // volume = filled amount / locked concentration = 0.03 / 2.
    sinon.assert.calledWith(volStub, 0.03, 2);
  });
});

describe('SampleDetailsComponents protected reference deletion and merging', () => {
  let sandbox;

  beforeEach(() => { sandbox = sinon.createSandbox(); });
  afterEach(() => { sandbox.restore(); });

  const build = (link = {}) => {
    const sample = new Sample({
      id: 1341, sample_type: 'Mixture', amount_value: 1.7, amount_unit: 'g', ...link,
    });
    sample.initialComponents([0.01, 0.005, 0.002].map((amount, index) => new Component({
      id: index + 1, position: index, reference: index === 0, material_group: 'solid', purity: 1,
      amount_mol: amount, amount_g: amount * 100, relative_molecular_weight: 1.7 / amount,
      molecule: { id: index === 0 ? 101 : 102, molecular_weight: 100 },
    })));
    const editor = Object.create(SampleDetailsComponents.prototype);
    editor.props = {
      sample, onChange: sinon.spy(), setMoleculeLoading: sinon.spy(), setComponentDeletionLoading: sinon.spy(),
    };
    editor.state = { showModal: true };
    editor.pendingMoleculeRequests = 0;
    editor.moleculeUpdateSequence = 0;
    sandbox.stub(sample, 'updateMixtureMolecule').resolves();
    return { sample, editor };
  };

  const mergeThroughEditor = async (editor, source, target) => {
    const changed = new Promise((resolve) => { editor.props.onChange = sinon.spy(resolve); });
    editor.dropMaterial(source, 'solid', target, 'solid', 'merge');
    await changed;
  };

  [
    ['open reaction', { belongTo: { type: 'reaction', id: 110, samples: [{ id: 1341 }] } }],
    ['saved reaction tag', {
      tag: { taggable_data: { reaction_id: 110, resources: [{ resource_context_type: 'Reaction' }] } },
    }],
  ].forEach(([context, link]) => {
    it(`rejects direct deletion of the reference without changing data or loading state: ${context}`, async () => {
      const { sample, editor } = build(link);
      const before = sample.serializeMaterial();
      const remove = sandbox.spy(sample, 'deleteMixtureComponent');

      await editor.deleteMixtureComponent(sample.reference_component);

      sinon.assert.notCalled(remove);
      sinon.assert.notCalled(editor.props.onChange);
      sinon.assert.notCalled(editor.props.setMoleculeLoading);
      sinon.assert.notCalled(editor.props.setComponentDeletionLoading);
      expect(sample.serializeMaterial()).toEqual(before);
    });

    [true, false].forEach((sameMolecule) => {
      ['source', 'target'].forEach((referenceRole) => {
        it(`rejects merging a reference ${referenceRole}, same molecule=${sameMolecule}: ${context}`, () => {
          const { sample, editor } = build(link);
          const [reference, other] = sample.components;
          if (sameMolecule) other.molecule = reference.molecule;
          const before = sample.serializeMaterial();
          const merge = sandbox.spy(sample, 'mergeComponents');
          const [source, target] = referenceRole === 'source' ? [reference, other] : [other, reference];

          editor.dropMaterial(source, 'solid', target, 'solid', 'merge');

          sinon.assert.notCalled(merge);
          sinon.assert.notCalled(editor.props.onChange);
          sinon.assert.notCalled(editor.props.setMoleculeLoading);
          expect(sample.serializeMaterial()).toEqual(before);
          editor.state.droppedMaterial = { srcMat: source, tagMat: target };
          const modal = editor.renderModal();
          expect(modal.props.extendedFooter.props.disabled).toBe(true);
          expect(modal.props.children[1].props.children).toBe(
            'Select another reference component in the reaction’s material row before deleting or merging this component.'
          );
        });
      });
    });

    it(`still allows deleting a non-reference component: ${context}`, async () => {
      const { sample, editor } = build(link);
      const other = sample.components[1];

      await editor.deleteMixtureComponent(other);

      expect(sample.components.includes(other)).toBe(false);
      expect(sample.reference_component.id).toBe(1);
      expect(sample.reference_component.amount_mol).toBe(0.01);
      sinon.assert.calledOnce(editor.props.onChange);
    });

    it(`still allows merging non-reference components: ${context}`, async () => {
      const { sample, editor } = build(link);
      const [reference, source, target] = sample.components;
      editor.state.droppedMaterial = { srcMat: source, tagMat: target };
      expect(editor.renderModal().props.extendedFooter.props.disabled).toBe(false);

      await mergeThroughEditor(editor, source, target);

      expect(sample.components.includes(source)).toBe(false);
      expect(sample.reference_component).toBe(reference);
      expect(reference.amount_mol).toBe(0.01);
    });

    it(`still allows moving the reference component: ${context}`, () => {
      const { sample, editor } = build(link);
      const [reference, other] = sample.components;

      editor.dropMaterial(reference, 'solid', other, 'solid', 'move');

      expect(sample.reference_component).toBe(reference);
      expect(reference.amount_mol).toBe(0.01);
      sinon.assert.calledOnce(editor.props.onChange);
    });
  });

  it('allows a standalone mixture to delete its reference', async () => {
    const { sample, editor } = build();

    await editor.deleteMixtureComponent(sample.reference_component);

    expect(sample.components).toHaveLength(2);
    expect(sample.reference_component.id).toBe(2);
    sinon.assert.calledOnce(editor.props.onChange);
  });

  it('allows a standalone mixture to merge its reference', async () => {
    const { sample, editor } = build();
    const [reference, other] = sample.components;
    other.molecule = reference.molecule;

    await mergeThroughEditor(editor, reference, other);

    expect(sample.components.includes(reference)).toBe(false);
    expect(sample.reference_component).toBe(other);
  });
});
