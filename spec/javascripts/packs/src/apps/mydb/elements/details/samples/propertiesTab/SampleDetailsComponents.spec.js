import expect from 'expect';
import sinon from 'sinon';
import { addMiddleware } from 'mobx-state-tree';
import SampleDetailsComponents from 'src/apps/mydb/elements/details/samples/propertiesTab/SampleDetailsComponents';
import Sample from 'src/models/Sample';
import Component from 'src/models/Component';
import ComponentStore from 'src/stores/alt/stores/ComponentStore';
import { rootStore } from 'src/stores/mobx/RootStore';

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
