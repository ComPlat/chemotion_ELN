/* global describe, it, beforeEach, afterEach */
import expect from 'expect';
import sinon from 'sinon';
import ElementActionDispatcher, { ElementActions } from 'src/stores/alt/actions/ElementActions';
import SampleDetails from 'src/apps/mydb/elements/details/samples/SampleDetails';
import UIStore from 'src/stores/alt/stores/UIStore';
import ElementStore from 'src/stores/alt/stores/ElementStore';
import ReactionDetailsScheme from 'src/apps/mydb/elements/details/reactions/schemeTab/ReactionDetailsScheme';
import { SampleComponent } from 'src/apps/mydb/elements/details/samples/propertiesTab/SampleComponent';
import SampleDetailsComponents from 'src/apps/mydb/elements/details/samples/propertiesTab/SampleDetailsComponents';
import SamplesFetcher from 'src/fetchers/SamplesFetcher';
import ComponentsFetcher from 'src/fetchers/ComponentsFetcher';
import ReactionsFetcher from 'src/fetchers/ReactionsFetcher';
import LoadingActions from 'src/stores/alt/actions/LoadingActions';
import Sample from 'src/models/Sample';
import Component from 'src/models/Component';
import Reaction from 'src/models/Reaction';
// The spec package uses dependencies installed in the repository root.
// eslint-disable-next-line import/no-extraneous-dependencies
import { addMiddleware } from 'mobx-state-tree';
import { rootStore } from 'src/stores/mobx/RootStore';

describe('ElementActions.updateSampleForReaction mixture equivalent', () => {
  const massG = 0.006 * 182.22 + 0.012 * 94.11;
  const sampleData = (id, value, unit, extra = {}) => ({
    id, amountType: 'target', target_amount_value: value, target_amount_unit: unit,
    molecule: { molecular_weight: 100 }, purity: 1, density: 0, molarity_value: 0,
    gas_type: 'off', coefficient: 1, ...extra,
  });
  const build = () => {
    const reaction = new Reaction({
      id: 101, type: 'reaction', name: 'Unsaved reaction name',
      starting_materials: [
        sampleData(10, 0.01, 'mol', { reference: true, equivalent: 1 }),
        sampleData(1315, massG, 'g', {
          sample_type: 'Mixture', equivalent: 0.6,
          sample_details: { reference_component_changed: false },
          tag: { taggable_data: { reaction_id: 101 } },
        }),
      ],
      reactants: [], products: [],
      solvents: [sampleData(20, 0.01, 'l', { density: 1 })],
    });
    const mixture = reaction.sampleById(1315);
    mixture.initialComponents([
      new Component({
        id: 1, position: 0, reference: true, amount_mol: 0.006,
        relative_molecular_weight: massG / 0.006,
        molecule: { molecular_weight: 182.22 }, material_group: 'solid', purity: 1,
      }),
      new Component({
        id: 2, position: 1, reference: false, amount_mol: 0.012,
        relative_molecular_weight: massG / 0.012,
        molecule: { molecular_weight: 94.11 }, material_group: 'solid', purity: 1,
      }),
    ]);
    return { reaction, mixture };
  };

  let sandbox;
  let fetchStub;
  let persistedEquivalent;
  let fullReactionSave;

  beforeEach(() => {
    sandbox = sinon.createSandbox();
    persistedEquivalent = 0.6;
    sandbox.stub(ComponentsFetcher, 'saveOrUpdateComponents').resolves([]);
    sandbox.stub(SamplesFetcher, 'update').callsFake(async (sample) => new Sample(sample));
    fullReactionSave = sandbox.spy(ReactionsFetcher, 'update');
    fetchStub = sandbox.stub(global, 'fetch').callsFake(async (url, options) => {
      expect(url).toBe('/api/v1/reactions/101/materials/1315/equivalent');
      expect(options.method).toBe('PUT');
      const body = JSON.parse(options.body);
      expect(Object.keys(body)).toEqual(['equivalent']);
      persistedEquivalent = body.equivalent;
      return new Response(JSON.stringify({ equivalent: persistedEquivalent }));
    });
  });

  afterEach(() => { sandbox.restore(); });

  it('edits a cloned mixture component mass without changing the reaction component', () => {
    const { reaction, mixture } = build();
    let draft;
    new ElementActions().showReactionMaterial({ sample: mixture, reaction })(({ sample }) => { draft = sample; });
    const component = draft.components[1];
    const source = mixture.components[1];
    const originalMass = source.amount_g;

    component.handleVolumeChange({ value: component.molecule_molecular_weight * 0.02125, unit: 'g' }, 0);

    expect(component.amount_mol).toBeCloseTo(0.02125, 12);
    expect(source.amount_mol).toBeCloseTo(0.012, 12);
    expect(source.amount_g).toBe(originalMass);
  });

  ['mass', 'reference'].forEach((edit) => {
    [false, true].forEach((dirtyDraft) => {
      it(`synchronizes a reaction ${edit} edit with a mixture tab, unsaved draft=${dirtyDraft}`, async () => {
        const { reaction, mixture } = build();
        let draft;
        new ElementActions().showReactionMaterial({ sample: mixture, reaction })(({ sample }) => { draft = sample; });
        draft.belongTo = reaction;
        const originalMass = draft.amount_g;
        expect(draft.isEdited).toBe(false);
        if (dirtyDraft) draft.name = 'Unsaved composition note';
        const draftBefore = draft.checksum();
        if (edit === 'mass') mixture.setAmount({ value: massG * 2, unit: 'g' });
        else mixture.setReferenceComponent(1, { preserveRatios: true });
        const reactionBefore = reaction.checksum();
        const store = Object.create(ElementStore.StoreModel.prototype);
        store.state = { selecteds: [reaction, draft], refreshCoefficient: [] };

        store.synchronizeElements(reaction);

        expect(reaction.checksum()).toBe(reactionBefore);
        if (dirtyDraft) {
          expect(draft.checksum()).toBe(draftBefore);
          expect(draft.amount_g).toBeCloseTo(originalMass, 12);
          expect(draft.hasReactionMixtureConflict()).toBe(true);
          const notifications = [];
          const dispose = addMiddleware(rootStore.notificationsStore, (call, next) => {
            if (call.name === 'add') notifications.push(call.args[0]);
            return next(call);
          });
          const dispatch = sinon.spy();
          try {
            await new ElementActions().updateSampleForReaction(draft, reaction)(dispatch);
          } finally {
            dispose();
          }
          expect(notifications[0].title).toBe('Mixture changed in the reaction');
          sinon.assert.notCalled(dispatch);
          sinon.assert.notCalled(SamplesFetcher.update);
          sinon.assert.notCalled(ComponentsFetcher.saveOrUpdateComponents);
          sinon.assert.notCalled(fetchStub);
          expect(draft.isEdited).toBe(true);
          expect(reaction.checksum()).toBe(reactionBefore);
        } else {
          expect(draft.amount_g).toBeCloseTo(mixture.amount_g, 12);
          expect(draft.amount_mol).toBeCloseTo(mixture.amount_mol, 12);
          expect(draft.reference_component.id).toBe(mixture.reference_component.id);
          expect(draft.components[0]).not.toBe(mixture.components[0]);
          expect(draft.isEdited).toBe(false);
          expect(draft.hasReactionMixtureConflict()).toBe(false);
          await new ElementActions().updateSampleForReaction(draft, reaction)(sinon.spy());
          expect(reaction.sampleById(mixture.id).amount_g).toBeCloseTo(mixture.amount_g, 12);
          expect(reaction.sampleById(mixture.id).amount_mol).toBeCloseTo(mixture.amount_mol, 12);
        }
      });
    });
  });

  it('refreshes a clean saved mixture tab opened independently of the reaction', () => {
    const { reaction, mixture } = build();
    const tab = new Sample(JSON.parse(JSON.stringify(mixture.serializeMaterial())));
    tab.initialComponents(tab.components.map(Component.deserializeData));
    expect(tab.isEdited).toBe(false);
    mixture.setAmount({ value: massG * 2, unit: 'g' });
    mixture.setReferenceComponent(1, { preserveRatios: true });
    const store = Object.create(ElementStore.StoreModel.prototype);
    store.state = { selecteds: [reaction, tab], refreshCoefficient: [] };

    store.synchronizeElements(reaction);

    expect(tab.amount_g).toBeCloseTo(massG * 2, 12);
    expect(tab.amount_mol).toBeCloseTo(0.024, 12);
    expect(tab.reference_component.id).toBe(2);
    expect(tab.isEdited).toBe(false);
    expect(tab.hasReactionMixtureConflict()).toBe(false);
  });

  it('updates the draft baseline after saving so a second editor save is allowed', async () => {
    const { reaction, mixture } = build();
    let draft;
    new ElementActions().showReactionMaterial({ sample: mixture, reaction })(({ sample }) => { draft = sample; });
    draft.belongTo = reaction;
    draft.name = 'First edit';
    const dispatch = sinon.spy(({ sample }) => { draft = sample; });

    await new ElementActions().updateSampleForReaction(draft, reaction, false)(dispatch);
    expect(draft.hasReactionMixtureConflict()).toBe(false);
    expect(draft.isEdited).toBe(false);
    draft.name = 'Second edit';
    await new ElementActions().updateSampleForReaction(draft, reaction, false)(dispatch);

    sinon.assert.calledTwice(dispatch);
    expect(reaction.sampleById(mixture.id).name).toBe('Second edit');
    expect(draft.hasReactionMixtureConflict()).toBe(false);
  });

  it('keeps loaded editor components when the reaction row has not loaded them', () => {
    const { reaction, mixture } = build();
    let draft;
    new ElementActions().showReactionMaterial({ sample: mixture, reaction })(({ sample }) => { draft = sample; });
    draft.belongTo = reaction;
    mixture.components = [];
    mixture.setAmount({ value: massG * 2, unit: 'g' });
    const store = Object.create(ElementStore.StoreModel.prototype);
    store.state = { selecteds: [reaction, draft], refreshCoefficient: [] };

    store.synchronizeElements(reaction);

    expect(draft.components.length).toBe(2);
    expect(draft.components[0].amount_mol).toBeCloseTo(0.012, 12);
    expect(draft.components[1].amount_mol).toBeCloseTo(0.024, 12);
    expect(draft.hasReactionMixtureConflict()).toBe(false);
    expect(draft.isEdited).toBe(false);
  });

  it('does not report a conflict when raw reaction components are initialized without edits', () => {
    const { reaction, mixture } = build();
    mixture.components = mixture.components.map((component) => component.serializeComponent());
    let draft;
    new ElementActions().showReactionMaterial({ sample: mixture, reaction })(({ sample }) => { draft = sample; });
    draft.belongTo = reaction;
    draft.name = 'Unsaved editor change';

    mixture.initialComponents(mixture.components.map(Component.deserializeData));

    expect(draft.hasReactionMixtureConflict()).toBe(false);
  });

  [false, true].forEach((closeView) => {
    it(`keeps a conflicting draft open on Save, close view=${closeView}`, () => {
      const { reaction, mixture } = build();
      let draft;
      new ElementActions().showReactionMaterial({ sample: mixture, reaction })(({ sample }) => { draft = sample; });
      draft.belongTo = reaction;
      draft.name = 'Unsaved edits';
      mixture.setAmount({ value: massG * 2, unit: 'g' });
      const details = Object.create(SampleDetails.prototype);
      details.state = { sample: draft };
      details.context = { notifications: { add: sinon.spy() } };
      const save = sandbox.spy(ElementActionDispatcher, 'updateSampleForReaction');

      details.handleSubmit(closeView);

      sinon.assert.calledOnce(details.context.notifications.add);
      sinon.assert.notCalled(save);
      sinon.assert.notCalled(SamplesFetcher.update);
      expect(draft.isEdited).toBe(true);
    });
  });

  [['g', true], ['g', false], ['mol', true], ['mol', false]].forEach(([unit, closeView]) => {
    it(`persists both ${unit} reference switches before dispatch with closeView=${closeView}`, async () => {
      const { reaction, mixture } = build();
      mixture.amount_unit = unit;
      mixture.amount_value = unit === 'mol' ? 0.006 : massG;
      const action = new ElementActions();
      const dispatch = sinon.spy(() => {
        expect(persistedEquivalent).toBeCloseTo(reaction.sampleById(1315).equivalent, 12);
      });
      mixture.setReferenceComponent(1);

      await action.updateSampleForReaction(mixture, reaction, closeView)(dispatch);

      expect(SamplesFetcher.update.firstCall.args[0].serialize().target_amount_value).toBeCloseTo(
        unit === 'mol' ? 0.012 : massG, 12
      );
      expect(reaction.sampleById(1315).amount_g).toBeCloseTo(massG, 12);
      expect(persistedEquivalent).toBeCloseTo(1.2, 12);
      expect(reaction.sampleById(1315).concn).toBeCloseTo(1.2, 12);
      const updated = reaction.sampleById(1315);
      updated.setReferenceComponent(0);

      await action.updateSampleForReaction(updated, reaction, closeView)(dispatch);

      expect(SamplesFetcher.update.secondCall.args[0].serialize().target_amount_value).toBeCloseTo(
        unit === 'mol' ? 0.006 : massG, 12
      );
      expect(reaction.sampleById(1315).amount_g).toBeCloseTo(massG, 12);
      expect(persistedEquivalent).toBeCloseTo(0.6, 12);
      expect(reaction.sampleById(1315).concn).toBeCloseTo(0.6, 12);
      expect(reaction.name).toBe('Unsaved reaction name');
      expect(reaction.changed).toBe(true);
      expect(reaction.referenceMaterial.amount_mol).toBeCloseTo(0.01, 12);
      expect(reaction.solventVolume).toBeCloseTo(0.01, 12);
      sinon.assert.calledTwice(dispatch);
      sinon.assert.notCalled(fullReactionSave);
    });
  });

  it('keeps successive editor saves on the reaction path after an API response replaces the sample', async () => {
    const { reaction, mixture } = build();
    reaction.type = 'reaction';
    mixture.amountType = 'real';
    mixture.real_amount_value = massG;
    mixture.real_amount_unit = 'g';
    mixture.target_amount_value = 0;
    const editorSample = new Sample({ ...mixture.serialize(), tag: mixture.tag });
    editorSample.initialComponents(mixture.components);
    editorSample.belongTo = reaction;
    const editor = {
      state: { sample: editorSample, validCas: true },
      context: { notifications: { add: sinon.spy() } },
      matchSelectedCollection: () => false,
      checkMolfileChange: () => {},
      setState(update) { this.state = { ...this.state, ...update }; },
    };
    // The real sample API returns serialized data without the UI's belongTo link.
    SamplesFetcher.update.callsFake(async (sample) => (
      new Sample(JSON.parse(JSON.stringify({
        ...sample.serialize(), molecule: { ...sample.molecule }, tag: sample.tag,
      })))
    ));
    ComponentsFetcher.saveOrUpdateComponents.callsFake(async (sample, components) => (
      JSON.parse(JSON.stringify(components.map((component) => ({
        ...component.serializeComponent(),
        component_properties: {
          ...component.serializeComponent().component_properties,
          molecule: { ...component.molecule },
        },
      }))))
    ));
    sandbox.stub(UIStore, 'getState').returns({ currentCollection: {} });
    sandbox.stub(LoadingActions.start, 'defer');
    let pendingSave;
    const reactionSave = sandbox.stub(ElementActionDispatcher, 'updateSampleForReaction').callsFake(
      (sample, openedReaction, closeView) => {
        pendingSave = new ElementActions().updateSampleForReaction(sample, openedReaction, closeView)(
          ({ sample: savedSample }) => editor.setState({ sample: savedSample })
        );
      }
    );
    const standaloneSave = sandbox.stub(ElementActionDispatcher, 'updateSample');

    // Save benzophenone without closing the editor, then switch back to phenol there.
    editor.state.sample.setReferenceComponent(0);
    SampleDetails.prototype.handleSubmit.call(editor, false);
    await pendingSave;
    expect(persistedEquivalent).toBeCloseTo(0.6, 12);

    editor.state.sample.setReferenceComponent(1);
    SampleDetails.prototype.handleSubmit.call(editor, false);
    await pendingSave;

    expect(reactionSave.callCount).toBe(2);
    sinon.assert.notCalled(standaloneSave);
    sinon.assert.calledTwice(fetchStub);
    expect(persistedEquivalent).toBeCloseTo(1.2, 12);
    expect(editor.state.sample.belongTo).toBe(reaction);
    sinon.assert.notCalled(fullReactionSave);
  });

  [0, 1].forEach((referenceIndex) => {
    it(`preserves the unsaved component ${referenceIndex} selection when opening and returning from the editor`, async () => {
      const { reaction, mixture } = build();
      reaction.type = 'reaction';
      mixture.setReferenceComponent(1 - referenceIndex);
      const persistedComponents = JSON.parse(JSON.stringify(mixture.components.map((component) => ({
        ...component.serializeComponent(),
        component_properties: {
          ...component.serializeComponent().component_properties,
          molecule: { ...component.molecule },
        },
      }))));
      const persistedSample = new Sample(JSON.parse(JSON.stringify({
        ...mixture.serialize(), tag: mixture.tag, components: persistedComponents,
      })));
      const fetchSample = sandbox.stub(SamplesFetcher, 'fetchById').resolves(persistedSample);
      const fetchComponents = sandbox.stub(ComponentsFetcher, 'fetchComponentsBySampleId').resolves(persistedComponents);
      const scheme = Object.create(ReactionDetailsScheme.prototype);
      scheme.props = { reaction };
      scheme.state = { lockEquivColumn: false };
      scheme.getReactionEquivLockState = () => false;
      scheme.updatedReactionForComponentReferenceChange({
        sampleID: mixture.id, componentId: mixture.components[referenceIndex].id,
      });
      const expectedMol = mixture.amount_mol;
      const expectedEquivalent = mixture.equivalent;
      let opened;
      await new Promise((resolve) => {
        new ElementActions().showReactionMaterial({ sample: mixture, reaction })((params) => {
          opened = params;
          resolve();
        });
      });

      expect(opened.sample.reference_component.id).toBe(referenceIndex + 1);
      expect(opened.sample.amount_mol).toBeCloseTo(expectedMol, 12);
      expect(opened.sample.amount_g).toBeCloseTo(massG, 12);
      expect(opened.sample.components[0]).not.toBe(mixture.components[0]);
      expect(opened.sample.components[0].molecule).not.toBe(mixture.components[0].molecule);
      expect(opened.sample.sample_details).not.toBe(mixture.sample_details);

      const store = {
        state: { selecteds: [reaction], refreshCoefficient: [] },
        setState(update) { this.state = { ...this.state, ...update(this.state) }; },
        changeCurrentElement: sinon.spy(),
      };
      ElementStore.StoreModel.prototype.handleShowReactionMaterial.call(store, opened);
      await Promise.resolve();
      await Promise.resolve();
      expect(opened.sample.reference_component.id).toBe(referenceIndex + 1);
      expect(opened.sample.belongTo).toBe(reaction);
      // Returning to the reaction preserves its pending row selection.
      ElementStore.StoreModel.prototype.synchronizeElements.call(store, opened.sample);
      const returned = reaction.sampleById(mixture.id);
      expect(returned.reference_component.id).toBe(referenceIndex + 1);
      expect(returned.amount_mol).toBeCloseTo(expectedMol, 12);
      expect(returned.equivalent).toBeCloseTo(expectedEquivalent, 12);
      sinon.assert.notCalled(fetchSample);
      sinon.assert.notCalled(fetchComponents);
      sinon.assert.notCalled(SamplesFetcher.update);
      sinon.assert.notCalled(ComponentsFetcher.saveOrUpdateComponents);
      sinon.assert.notCalled(fetchStub);
    });
  });

  ['ratio', 'reference'].forEach((edit) => {
    [false, true].forEach((returnBeforeDiscard) => {
      it(`discards an unsaved mixture ${edit} edit${returnBeforeDiscard ? ' after switching tabs' : ''}`, async () => {
        const { reaction, mixture } = build();
        reaction.type = 'reaction';
        reaction.updateChecksum();
        const original = reaction.checksum();
        let editorSample;
        await new Promise((resolve) => {
          new ElementActions().showReactionMaterial({ sample: mixture, reaction })(({ sample }) => {
            editorSample = sample;
            resolve();
          });
        });
        editorSample.belongTo = reaction;
        if (edit === 'ratio') {
          editorSample.updateComponentRatio(editorSample.components[1], 0, 'solid');
        } else {
          editorSample.setReferenceComponent(1);
        }
        editorSample.changed = true;
        const draft = editorSample.checksum();
        const store = Object.create(ElementStore.StoreModel.prototype);
        store.state = {
          selecteds: [reaction, editorSample], currentElement: editorSample,
          activeKey: 1, refreshCoefficient: [],
        };
        store.setState = (update) => {
          store.state = { ...store.state, ...update };
        };
        // Exercise the real close/tab handlers without browser navigation.
        store.resetCurrentElement = (key, selecteds) => store.changeCurrentElement(selecteds[key]);

        if (returnBeforeDiscard) {
          store.changeCurrentElement(reaction);
          expect(reaction.checksum()).toBe(original);
          store.changeCurrentElement(editorSample);
          expect(editorSample.checksum()).toBe(draft);
        }
        store.handleClose({ deleteEl: editorSample, force: true });

        expect(store.state.currentElement).toBe(reaction);
        expect(store.state.selecteds).toEqual([reaction]);
        expect(reaction.sampleById(mixture.id)).toBe(mixture);
        expect(reaction.checksum()).toBe(original);
        expect(reaction.isPendingToSave).toBe(false);
        sinon.assert.notCalled(SamplesFetcher.update);
        sinon.assert.notCalled(ComponentsFetcher.saveOrUpdateComponents);
        sinon.assert.notCalled(fetchStub);
      });
    });
  });

  [false, true].forEach((discardBeforeUnmount) => {
    it(`discards a pending component edit flushed on unmount, discard first=${discardBeforeUnmount}`, async () => {
      const { reaction, mixture } = build();
      reaction.type = 'reaction';
      reaction.updateChecksum();
      const original = reaction.checksum();
      let draft;
      await new Promise((resolve) => {
        new ElementActions().showReactionMaterial({ sample: mixture, reaction })(({ sample }) => {
          draft = sample;
          resolve();
        });
      });
      draft.belongTo = reaction;
      const editor = Object.create(SampleDetailsComponents.prototype);
      editor.props = { sample: draft, onChange: () => { draft.changed = true; } };
      const row = new SampleComponent({
        sample: draft, material: draft.components[1], materialGroup: 'solid',
        onChange: (event) => editor.onChangeComponent(event),
      });
      const clock = sandbox.useFakeTimers();
      row.debounceHandleAmountChange({ value: 0.018, unit: 'mol' }, 0.012, '', false);
      clock.tick(100);
      const store = Object.create(ElementStore.StoreModel.prototype);
      store.state = {
        selecteds: [reaction, draft], currentElement: draft, activeKey: 1, refreshCoefficient: [],
      };
      store.setState = (update) => { store.state = { ...store.state, ...update }; };
      store.resetCurrentElement = (key, selecteds) => store.changeCurrentElement(selecteds[key]);

      if (!discardBeforeUnmount) row.componentWillUnmount();
      store.handleClose({ deleteEl: draft, force: true });
      if (discardBeforeUnmount) row.componentWillUnmount();
      clock.tick(1000);

      expect(draft.components[1].amount_mol).toBeCloseTo(0.018, 12);
      expect(mixture.components[1].amount_mol).toBeCloseTo(0.012, 12);
      expect(store.state.selecteds).toEqual([reaction]);
      expect(store.state.currentElement).toBe(reaction);
      expect(reaction.checksum()).toBe(original);
      sinon.assert.notCalled(SamplesFetcher.update);
      sinon.assert.notCalled(ComponentsFetcher.saveOrUpdateComponents);
      sinon.assert.notCalled(fullReactionSave);
      sinon.assert.notCalled(fetchStub);
    });
  });

  it('still fetches an ordinary sample when opening its editor', async () => {
    const { reaction } = build();
    const current = reaction.referenceMaterial;
    const fetched = new Sample({ ...current, name: 'Fetched full sample' });
    const fetchSample = sandbox.stub(SamplesFetcher, 'fetchById').resolves(fetched);
    const dispatch = sinon.spy();

    new ElementActions().showReactionMaterial({ sample: current, reaction })(dispatch);
    await Promise.resolve();

    expect(fetchSample.calledOnceWithExactly(current.id)).toBe(true);
    expect(dispatch.firstCall.args[0].sample).toBe(fetched);
    expect(dispatch.firstCall.args[0].coefficient).toBe(current.coefficient);
  });

  it('keeps the reaction reference amount fixed when the copied editor switches components with Eq locked', async () => {
    const { reaction, mixture } = build();
    reaction.type = 'reaction';
    mixture.amountType = 'real';
    mixture.real_amount_value = massG;
    mixture.real_amount_unit = 'g';
    mixture.target_amount_value = 0;
    const scheme = Object.create(ReactionDetailsScheme.prototype);
    scheme.props = { reaction };
    scheme.state = { lockEquivColumn: true };
    scheme.getReactionEquivLockState = () => true;
    scheme.updatedReactionForComponentReferenceChange({ sampleID: mixture.id, componentId: 2 });
    let opened;
    await new Promise((resolve) => {
      new ElementActions().showReactionMaterial({ sample: mixture, reaction })((params) => {
        opened = params;
        resolve();
      });
    });
    opened.sample.belongTo = reaction;
    opened.sample.setReferenceComponent(0);
    opened.sample.prepareMixtureForSave();
    // This is the reaction scheme's existing editedSample processing during save.
    Reaction.materialGroups.forEach((group) => {
      reaction[group] = scheme.updatedSamplesForAmountChange(reaction[group] || [], opened.sample, group);
    });

    expect(reaction.referenceMaterial.amount_mol).toBeCloseTo(0.01, 12);
    await new ElementActions().updateSampleForReaction(opened.sample, reaction, false)(sinon.spy());
    expect(persistedEquivalent).toBeCloseTo(0.6, 12);
    expect(reaction.sampleById(mixture.id).amount_g).toBeCloseTo(massG, 12);
  });

  it('still loads components when the mixture editor starts without initialized component data', async () => {
    const { reaction, mixture } = build();
    const rawComponents = JSON.parse(JSON.stringify(mixture.components.map((component) => ({
      ...component.serializeComponent(),
      component_properties: {
        ...component.serializeComponent().component_properties,
        molecule: { ...component.molecule },
      },
    }))));
    const fetchedSample = new Sample({ ...mixture.serialize(), components: rawComponents });
    mixture.components = [];
    const fetchSample = sandbox.stub(SamplesFetcher, 'fetchById').resolves(fetchedSample);
    const fetchComponents = sandbox.stub(ComponentsFetcher, 'fetchComponentsBySampleId').resolves(rawComponents);
    let opened;
    await new Promise((resolve) => {
      new ElementActions().showReactionMaterial({ sample: mixture, reaction })((params) => {
        opened = params;
        resolve();
      });
    });
    const store = {
      state: { selecteds: [reaction], refreshCoefficient: [] },
      setState(update) { this.state = { ...this.state, ...update(this.state) }; },
      changeCurrentElement: sinon.spy(),
    };

    ElementStore.StoreModel.prototype.handleShowReactionMaterial.call(store, opened);
    await Promise.resolve();
    await Promise.resolve();

    expect(fetchSample.calledOnceWithExactly(mixture.id)).toBe(true);
    expect(fetchComponents.calledOnceWithExactly(mixture.id)).toBe(true);
    expect(opened.sample.reference_component).toBeInstanceOf(Component);
    expect(opened.sample.reference_component.id).toBe(1);
    expect(opened.sample.amount_mol).toBeCloseTo(0.006, 12);
  });

  it('leaves associations pending for a new unsaved reaction', async () => {
    const { reaction, mixture } = build();
    reaction.isNew = true;
    mixture.setReferenceComponent(1);
    const dispatch = sinon.spy();

    await new ElementActions().updateSampleForReaction(mixture, reaction)(dispatch);

    sinon.assert.notCalled(fetchStub);
    sinon.assert.calledOnce(dispatch);
    expect(reaction.sampleById(1315).equivalent).toBeCloseTo(1.2, 12);
  });

  it('does not create an association for a material added only to the unsaved reaction state', async () => {
    const { reaction, mixture } = build();
    mixture.tag = { taggable_data: {} };
    mixture.setReferenceComponent(1);
    const dispatch = sinon.spy();

    await new ElementActions().updateSampleForReaction(mixture, reaction)(dispatch);

    sinon.assert.notCalled(fetchStub);
    sinon.assert.calledOnce(dispatch);
  });

  it('keeps ordinary sample saves on the existing path', async () => {
    const { reaction } = build();
    const dispatch = sinon.spy();

    await new ElementActions().updateSampleForReaction(reaction.referenceMaterial, reaction)(dispatch);

    sinon.assert.notCalled(fetchStub);
    sinon.assert.calledOnce(dispatch);
  });

  it('does not dispatch a successful save when equivalent persistence fails', async () => {
    const { reaction, mixture } = build();
    mixture.setReferenceComponent(1);
    fetchStub.resolves(new Response('{}', { status: 401 }));
    const dispatch = sinon.spy();
    const stopLoading = sandbox.stub(LoadingActions, 'stop');
    const logError = sandbox.stub(console, 'log');

    await new ElementActions().updateSampleForReaction(mixture, reaction)(dispatch);

    sinon.assert.notCalled(dispatch);
    sinon.assert.calledOnce(stopLoading);
    sinon.assert.calledOnce(logError);
  });
});
