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
// eslint-disable-next-line import/no-extraneous-dependencies
import MoleculesFetcher from 'src/fetchers/MoleculesFetcher';
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
    reaction.recordPersistedMaterials();
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
    sandbox.stub(SamplesFetcher, 'fetchById').callsFake(async (id) => build().reaction.sampleById(id));
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

  ['products', 'reactants'].forEach((group) => {
    it(`retains a list-opened mixture's ${group} role after saving with the reaction tab closed`, async () => {
      const { reaction, mixture } = build();
      reaction.starting_materials = reaction.starting_materials.filter((sample) => sample.id !== mixture.id);
      reaction[group] = [mixture];
      const listed = new Sample(mixture);
      listed.initialComponents(mixture.components.map((component) => new Component({ ...component })));
      listed.components.forEach((component) => component.updatePhysicalAmounts());
      listed.tag = { taggable_data: { resources: [
        { resource_context_type: 'Reaction', resource_context_id: reaction.id },
      ] } };
      SamplesFetcher.fetchById.resolves(listed);
      sandbox.stub(ElementStore, 'getState').returns({ selecteds: [] });
      const fetchReaction = sandbox.stub(ReactionsFetcher, 'fetchById').resolves(reaction);
      let opened;
      await new ElementActions().fetchSampleById(listed.id)((sample) => { opened = sample; });
      sinon.assert.calledOnceWithExactly(fetchReaction, reaction.id);
      expect(opened.hasFixedProductMass()).toBe(group === 'products');
      expect(opened.belongTo).toBeUndefined();
      expect(JSON.stringify(opened)).not.toContain('_mixtureReactionContext');

      const editor = new SampleDetailsComponents({ sample: opened, onChange: () => {} });
      editor.onChangeComponent({ type: 'ratioChanged', sampleID: 2, newRatio: 3, materialGroup: 'solid' });
      const expectedMass = group === 'products' ? massG : 0.006 * (182.22 + 3 * 94.11);
      expect(opened.amount_g).toBeCloseTo(expectedMass, 12);
      const saved = await new Promise((resolve) => {
        new ElementActions().updateSample(opened)(({ element }) => resolve(element));
      });
      expect(saved.hasFixedProductMass()).toBe(group === 'products');
      expect(saved.amount_g).toBeCloseTo(expectedMass, 12);
      if (group === 'products') {
        saved.updateProductComponentRatio(saved.components[1], 1);
        expect(saved.amount_g).toBeCloseTo(massG, 12);
      }
    });
  });

  it('saves and reopens a product ratio edit with its entered mass and redistributed moles', async () => {
    const { reaction, mixture } = build();
    reaction.starting_materials = reaction.starting_materials.filter((sample) => sample.id !== mixture.id);
    reaction.products = [mixture];
    mixture.belongTo = reaction;
    let draft;
    await new ElementActions().showReactionMaterial({ sample: mixture, reaction })(({ sample }) => {
      draft = sample;
    });
    draft.belongTo = reaction;
    const editor = new SampleDetailsComponents({ sample: draft, onChange: () => {} });
    editor.onChangeComponent({
      type: 'ratioChanged', sampleID: 2, newRatio: 3, materialGroup: 'solid',
    });
    const expectedMol = massG / (182.22 + 3 * 94.11);
    expect(draft.amount_g).toBeCloseTo(massG, 12);
    expect(draft.components[0].amount_mol).toBeCloseTo(expectedMol, 12);
    expect(draft.components[1].amount_mol).toBeCloseTo(3 * expectedMol, 12);
    // Editing a draft leaves the reaction row untouched until it is saved.
    expect(mixture.components[0].amount_mol).toBe(0.006);

    await new ElementActions().updateSampleForReaction(draft, reaction)(() => {});
    expect(reaction.products[0].amount_g).toBeCloseTo(massG, 12);
    expect(reaction.products[0].amount_mol).toBeCloseTo(expectedMol, 12);
    expect(persistedEquivalent).toBeCloseTo(expectedMol / 0.01, 12);

    let reopened;
    await new ElementActions().showReactionMaterial({ sample: reaction.products[0], reaction })(({ sample }) => {
      reopened = sample;
    });
    expect(reopened.amount_g).toBeCloseTo(massG, 12);
    expect(reopened.amount_mol).toBeCloseTo(expectedMol, 12);
    expect(reopened.components[1].amount_mol).toBeCloseTo(3 * expectedMol, 12);
  });

  [false, true].forEach((hasComponents) => {
    it(`opens an unsaved reaction mixture without fetching its temporary ID, components=${hasComponents}`, async () => {
      const { reaction, mixture } = build();
      const child = mixture.buildChildWithoutCounter();
      if (!hasComponents) child.components = [];
      child.setAmount({ value: massG / 2, unit: 'g' });
      reaction.reactants = [child];
      child.belongTo = reaction;
      const fetchComponents = sandbox.stub(ComponentsFetcher, 'fetchComponentsBySampleId');
      let draft;

      await new ElementActions().showReactionMaterial({ sample: child, reaction })(({ sample }) => {
        draft = sample;
      });

      sinon.assert.notCalled(SamplesFetcher.fetchById);
      sinon.assert.notCalled(fetchComponents);
      expect(draft.id).toBe(child.id);
      expect(draft.isNew).toBe(true);
      expect(draft.parent_id).toBe(mixture.id);
      expect(draft.amount_g).toBeCloseTo(massG / 2, 12);
      expect(draft.isDetachedMixtureDraft).toBe(true);
      if (hasComponents) {
        expect(draft.components[0]).not.toBe(child.components[0]);
        expect(draft.components[0].amount_mol).toBeCloseTo(0.003, 12);
        draft.components[0].purity = 0.5;
        expect(child.components[0].purity).toBe(1);
      }
    });
  });

  ['mg', 'mol', 'rounding'].forEach((representation) => {
    it(`accepts an equivalent reaction quantity expressed as ${representation} while keeping draft edits`, async () => {
      const { reaction, mixture } = build();
      let draft;
      await new ElementActions().showReactionMaterial({ sample: mixture, reaction })(({ sample }) => {
        draft = sample;
      });
      draft.belongTo = reaction;
      draft.purity = 0.5;
      draft.changed = true;
      if (representation === 'mg') { mixture.amount_value = massG * 1000; mixture.amount_unit = 'mg'; }
      else if (representation === 'mol') { mixture.amount_value = 0.006; mixture.amount_unit = 'mol'; }
      else mixture.amount_value = massG * (1 + 2e-10);
      expect(draft.hasReactionMixtureConflict()).toBe(false);
      await new ElementActions().updateSampleForReaction(draft, reaction, false)(sinon.spy());
      sinon.assert.calledOnce(SamplesFetcher.update);
    });
  });

  it('detaches an edited draft when its reaction row is removed and saves through the standalone action', async () => {
    const { reaction, mixture } = build();
    let draft;
    await new ElementActions().showReactionMaterial({ sample: mixture, reaction })(({ sample }) => {
      draft = sample;
    });
    draft.belongTo = reaction;
    draft.name = 'Keep this edit';
    draft.purity = 0.5;
    draft.changed = true;
    reaction.starting_materials = reaction.starting_materials.filter((sample) => sample.id !== mixture.id);
    const save = sandbox.stub(ElementActionDispatcher, 'updateSample');

    await new ElementActions().updateSampleForReaction(draft, reaction, false)(sinon.spy());

    sinon.assert.calledOnceWithExactly(save, draft, false);
    expect(draft.name).toBe('Keep this edit');
    expect(draft.purity).toBe(0.5);
    expect(draft.belongTo).toBeUndefined();
    expect(draft.isDetachedMixtureDraft).toBeUndefined();
    expect(draft.hasReactionMixtureConflict()).toBe(false);
    sinon.assert.notCalled(fetchStub);
  });

  [false, true].forEach((leaveReactionBeforeSave) => {
    it(`preserves a removed draft sample on toolbar save, detach first=${leaveReactionBeforeSave}`, async () => {
      const { reaction, mixture } = build();
      reaction.purification_solvents = [];
      reaction.segments = [];
      let draft;
      await new ElementActions().showReactionMaterial({ sample: mixture, reaction })(({ sample }) => {
        draft = sample;
      });
      draft.belongTo = reaction;
      draft.purity = 0.5;
      draft.changed = true;
      reaction.starting_materials = reaction.starting_materials.filter((sample) => sample.id !== draft.id);
      const store = Object.create(ElementStore.StoreModel.prototype);
      store.state = { selecteds: [reaction, draft], refreshCoefficient: [] };
      sandbox.stub(ElementStore, 'getState').callsFake(() => store.state);
      if (leaveReactionBeforeSave) store.synchronizeElements(reaction);

      const payload = ReactionsFetcher.reactionSavePayload(reaction);

      expect(payload.preserve_removed_sample_ids).toEqual([draft.id]);
      expect(payload.materials.starting_materials.map((sample) => sample.id)).not.toContain(draft.id);
      expect(draft.purity).toBe(0.5);
    });
  });

  [false, true].forEach((dirty) => {
    it(`rekeys a newly persisted mixture draft without losing edits, dirty=${dirty}`, async () => {
      const { reaction, mixture } = build();
      mixture.isNew = true;
      let draft;
      await new ElementActions().showReactionMaterial({ sample: mixture, reaction })(({ sample }) => {
        draft = sample;
      });
      draft.belongTo = reaction;
      if (dirty) { draft.purity = 0.5; draft.changed = true; }
      const originalState = draft._mixtureDraftSourceState;
      mixture.id = 2000;
      mixture.isNew = false;
      mixture.components.forEach((component) => { component.id += 100; });
      reaction.recordPersistedMaterials();
      Object.defineProperty(reaction, '_mixtureMaterialIdMap', { value: {
        1315: { id: 2000, component_ids: { 1: 101, 2: 102 } },
      } });
      const store = Object.create(ElementStore.StoreModel.prototype);
      store.state = { selecteds: [reaction, draft], refreshCoefficient: [] };

      store.synchronizeElements(reaction);

      expect(draft.id).toBe(2000);
      expect(draft.isNew).toBe(false);
      expect(draft.belongTo).toBe(reaction);
      expect(draft.reference_component.id).toBe(101);
      expect(draft._mixtureDraftSourceState).not.toBe(originalState);
      expect(draft.hasReactionMixtureConflict()).toBe(false);
      expect(draft.purity).toBe(dirty ? 0.5 : 1);
      expect(draft.isPendingToSave).toBe(dirty);
      const equivalentSave = sandbox.stub(ReactionsFetcher, 'updateMaterialEquivalent').resolves({});
      await new ElementActions().updateSampleForReaction(draft, reaction, false)(sinon.spy());
      sinon.assert.calledOnce(SamplesFetcher.update);
      sinon.assert.calledOnce(equivalentSave);
    });
  });

  it('does not detach a mixture draft when switching to a different reaction', async () => {
    const { reaction, mixture } = build();
    let draft;
    await new ElementActions().showReactionMaterial({ sample: mixture, reaction })(({ sample }) => {
      draft = sample;
    });
    draft.belongTo = reaction;
    const other = new Reaction({ id: 999, starting_materials: [], reactants: [], products: [], solvents: [] });
    const store = Object.create(ElementStore.StoreModel.prototype);
    store.state = { selecteds: [reaction, other, draft], refreshCoefficient: [] };
    store.synchronizeElements(other);
    expect(draft.belongTo).toBe(reaction);
    expect(draft.isDetachedMixtureDraft).toBe(true);
  });

  it('keeps reaction checksums, clones and copies usable after a component reference switch', () => {
    const { reaction, mixture } = build();
    reaction.segments = [];
    const scheme = Object.create(ReactionDetailsScheme.prototype);
    scheme.props = { reaction };
    scheme.state = { lockEquivColumn: false };
    scheme.getReactionEquivLockState = () => false;
    scheme.updatedReactionForComponentReferenceChange({ sampleID: mixture.id, componentId: 2 });
    expect(mixture.belongTo).toBe(reaction);
    expect(() => reaction.checksum()).not.toThrow();
    expect(() => reaction.clone()).not.toThrow();
    expect(() => Reaction.copyFromReactionAndCollectionId(reaction, 1, true)).not.toThrow();
  });

  it('edits a cloned mixture component mass without changing the reaction component', async () => {
    const { reaction, mixture } = build();
    let draft;
    await new ElementActions().showReactionMaterial({ sample: mixture, reaction })(({ sample }) => {
      draft = sample;
    });
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
        await new ElementActions().showReactionMaterial({ sample: mixture, reaction })(({ sample }) => {
          draft = sample;
        });
        draft.belongTo = reaction;
        const originalMass = draft.amount_g;
        expect(draft.isEdited).toBe(false);
        if (dirtyDraft) draft.name = 'Unsaved composition note';
        const draftBefore = draft.checksum();
        if (edit === 'mass') mixture.setAmount({ value: massG * 2, unit: 'g' });
        else mixture.setReferenceComponent(1, { preserveRatios: true, fromReactionScheme: true });
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

  [['purity', 0.5], ['molarity_value', 2]].forEach(([field, value]) => {
    [false, true].forEach((reinitializeComponents) => {
      it(`preserves an unsaved numeric ${field} edit on resync, reinitialized=${reinitializeComponents}`, async () => {
        const { reaction, mixture } = build();
        let draft;
        await new ElementActions().showReactionMaterial({ sample: mixture, reaction })(({ sample }) => {
          draft = sample;
        });
        draft.belongTo = reaction;
        if (reinitializeComponents) {
          // Component initialization can refresh the checksum while changed still records pending edits.
          draft.changed = true;
          draft.initialComponents(draft.components);
        }
        const originalSourceState = draft._mixtureDraftSourceState;
        const originalMass = draft.amount_g;
        const originalComponents = draft.components;
        draft[field] = value;
        draft.changed = true;
        expect(draft.isEdited).toBe(!reinitializeComponents);
        expect(draft.isPendingToSave).toBe(true);
        mixture.setAmount({ value: massG * 2, unit: 'g' });
        const store = Object.create(ElementStore.StoreModel.prototype);
        store.state = { selecteds: [reaction, draft], refreshCoefficient: [] };

        store.synchronizeElements(reaction);

        expect(draft[field]).toBe(value);
        expect(draft.changed).toBe(true);
        expect(draft.isPendingToSave).toBe(true);
        expect(draft.amount_g).toBeCloseTo(originalMass, 12);
        expect(draft.components).toBe(originalComponents);
        expect(draft._mixtureDraftSourceState).toBe(originalSourceState);
        expect(draft.belongTo).toBe(reaction);
        expect(draft.hasReactionMixtureConflict()).toBe(true);
        expect(mixture[field]).not.toBe(value);
        expect(mixture.amount_g).toBeCloseTo(massG * 2, 12);
      });
    });
  });

  [['purity', 0.5], ['molarity_value', 2]].forEach(([field, value]) => {
    it(`resumes refreshing a clean mixture draft after saving its numeric ${field} edit`, async () => {
      const { reaction, mixture } = build();
      let draft;
      await new ElementActions().showReactionMaterial({ sample: mixture, reaction })(({ sample }) => {
        draft = sample;
      });
      draft.belongTo = reaction;
      draft[field] = value;
      draft.changed = true;
      const dispatch = sinon.spy(({ sample }) => { draft = sample; });

      await new ElementActions().updateSampleForReaction(draft, reaction, false)(dispatch);

      sinon.assert.calledOnce(dispatch);
      expect(draft.isPendingToSave).toBe(false);
      expect(draft.changed).toBe(false);
      expect(draft[field]).toBe(value);
      const material = reaction.sampleById(mixture.id);
      expect(material.components[0]).not.toBe(draft.components[0]);
      expect(material.sample_details).not.toBe(draft.sample_details);
      material.setAmount({ value: massG * 2, unit: 'g' });
      expect(draft.isPendingToSave).toBe(false);
      const store = Object.create(ElementStore.StoreModel.prototype);
      store.state = { selecteds: [reaction, draft], refreshCoefficient: [] };

      store.synchronizeElements(reaction);

      expect(draft.amount_g).toBeCloseTo(material.amount_g, 12);
      expect(draft.amount_mol).toBeCloseTo(material.amount_mol, 12);
      expect(draft[field]).toBe(value);
      expect(draft.isPendingToSave).toBe(false);
      expect(draft.hasReactionMixtureConflict()).toBe(false);
      expect(draft._mixtureDraftSourceState).toBe(material.mixtureReactionState());
    });
  });

  ['starting_materials', 'products'].forEach((group) => {
    [false, true].forEach((dirty) => {
      it(`syncs a sample-list mixture ${group} tab and save payload from the reaction, dirty=${dirty}`, () => {
        const { reaction, mixture: originalMixture } = build();
        if (group === 'products') {
          reaction.starting_materials = reaction.starting_materials.filter((sample) => sample.id !== originalMixture.id);
          reaction.products = [originalMixture];
        }
        const mixture = reaction.sampleById(originalMixture.id);
        const tab = new Sample(JSON.parse(JSON.stringify(mixture.serializeMaterial())));
        tab.initialComponents(tab.components.map(Component.deserializeData));
        if (dirty) { tab.purity = 0.5; tab.changed = true; }
        const originalPurity = tab.purity;
        const originalComponents = tab.components;
        mixture.setAmount({ value: massG * 2, unit: 'g' });
        mixture.density = 1.2;
        mixture._molarity_unit = 'M';
        mixture._molarity_value = 2;
        mixture.container = { ...mixture.container, children: [
          { id: 987, container_type: 'analysis', name: 'New reaction analysis', children: [], extended_metadata: {} },
        ] };
        const store = Object.create(ElementStore.StoreModel.prototype);
        store.state = { selecteds: [reaction, tab], refreshCoefficient: [] };

        store.synchronizeElements(reaction);

        expect(tab.amount_value).toBe(mixture.amount_value);
        expect(tab.amount_unit).toBe(mixture.amount_unit);
        expect(tab.density).toBe(mixture.density);
        expect(tab._molarity_value).toBe(mixture._molarity_value);
        expect(tab._molarity_unit).toBe(mixture._molarity_unit);
        expect(tab.container).toBe(mixture.container);
        const payload = tab.serialize();
        expect(payload.target_amount_value).toBe(mixture.target_amount_value);
        expect(payload.target_amount_unit).toBe(mixture.target_amount_unit);
        expect(payload.container).toEqual(mixture.container);
        expect(tab.purity).toBe(originalPurity);
        expect(tab.components).toBe(originalComponents);
        expect(tab.belongTo).toBeUndefined();
        expect(tab.isDetachedMixtureDraft).toBeUndefined();
        expect(tab.changed).toBe(dirty);
      });
    });
  });

  it('fetches newer sample details while retaining pending reaction quantities through resync and save', async () => {
    const { reaction, mixture } = build();
    const latest = build().mixture;
    latest.description = 'Description saved in another session';
    latest.name = 'Latest name';
    latest.container = { id: 900, container_type: 'root', children: [] };
    latest.components[1].name = 'Latest component name';
    SamplesFetcher.fetchById.resolves(latest);
    mixture.setAmount({ value: massG * 2, unit: 'g' });
    mixture.setReferenceComponent(1, { preserveRatios: true, fromReactionScheme: true });
    let draft;

    await new ElementActions().showReactionMaterial({ sample: mixture, reaction })(({ sample }) => {
      draft = sample;
    });

    expect(draft.description).toBe(latest.description);
    expect(draft.name).toBe(latest.name);
    expect(draft.container.id).toBe(900);
    expect(draft.components[1].name).toBe('Latest component name');
    expect(draft.reference_component.id).toBe(2);
    expect(draft.amount_g).toBeCloseTo(massG * 2, 12);
    expect(draft.components[1].amount_mol).toBeCloseTo(0.024, 12);
    expect(latest.components[1].amount_mol).toBeCloseTo(0.012, 12);
    mixture.setAmount({ value: massG * 3, unit: 'g' });
    const store = Object.create(ElementStore.StoreModel.prototype);
    store.state = { selecteds: [reaction, draft], refreshCoefficient: [] };
    store.synchronizeElements(reaction);
    expect(draft.description).toBe(latest.description);
    expect(draft.container.id).toBe(900);
    expect(draft.amount_g).toBeCloseTo(massG * 3, 12);

    await new ElementActions().updateSampleForReaction(draft, reaction, false)(sinon.spy());

    const saved = SamplesFetcher.update.firstCall.args[0];
    expect(saved.description).toBe(latest.description);
    expect(saved.container.id).toBe(900);
    expect(saved.components[1].name).toBe('Latest component name');
  });

  ['remove', 'replace'].forEach((edit) => {
    it(`rejects a structure-editor ${edit} of a linked reference before changing sample structure`, async () => {
      const { reaction, mixture } = build();
      mixture.belongTo = reaction;
      mixture.molecule = { id: 123, cano_smiles: 'CCO.CCC' };
      mixture.molfile = 'Original molfile';
      mixture.components[0].molecule.cano_smiles = 'CCO';
      mixture.components[1].molecule.cano_smiles = 'CCC';
      mixture.updateChecksum();
      const before = mixture.serializeMaterial();
      const resultSmiles = edit === 'remove' ? 'CCC' : 'CCCC.CCC';
      sandbox.stub(MoleculesFetcher, 'fetchBySmi').resolves({
        id: 456, cano_smiles: resultSmiles, molfile: 'Edited molfile',
      });
      const details = Object.create(SampleDetails.prototype);
      details.state = { sample: mixture };
      details.setState = (update) => { details.state = { ...details.state, ...update }; };
      details.context = { notifications: { add: sinon.spy() } };

      await new Promise((resolve) => {
        details.hideStructureEditor = resolve;
        details.handleStructureEditorSave('Edited molfile', '', { smiles: resultSmiles }, 'ketcher');
      });

      expect(mixture.serializeMaterial()).toEqual(before);
      expect(mixture.molecule.id).toBe(123);
      expect(mixture.molfile).toBe('Original molfile');
      expect(mixture.isPendingToSave).toBe(false);
      expect(details.state.loadingMolecule).toBe(false);
    });
  });

  it('loads components from the API before overlaying a pending reaction quantity', async () => {
    const { reaction, mixture } = build();
    const latest = build().mixture;
    const components = latest.components.map((component) => component.serializeComponent());
    latest.components = [];
    SamplesFetcher.fetchById.resolves(latest);
    const fetchComponents = sandbox.stub(ComponentsFetcher, 'fetchComponentsBySampleId').resolves(components);
    mixture.setAmount({ value: massG * 2, unit: 'g' });
    let draft;

    await new ElementActions().showReactionMaterial({ sample: mixture, reaction })(({ sample }) => {
      draft = sample;
    });

    sinon.assert.calledOnceWithExactly(fetchComponents, mixture.id);
    expect(draft.components[0].amount_mol).toBeCloseTo(0.012, 12);
    expect(draft.components[1].amount_mol).toBeCloseTo(0.024, 12);
    expect(draft.hasReactionMixtureConflict(reaction)).toBe(false);
  });

  ['replaced', 'removed'].forEach((change) => {
    it(`does not open a stale reaction composition over externally ${change} components`, async () => {
      const { reaction, mixture } = build();
      const latest = build().mixture;
      if (change === 'replaced') latest.components[1].id = 200;
      else latest.components = [];
      SamplesFetcher.fetchById.resolves(latest);
      sandbox.stub(ComponentsFetcher, 'fetchComponentsBySampleId').resolves([]);
      const dispatch = sinon.spy();

      await new ElementActions().showReactionMaterial({ sample: mixture, reaction })(dispatch);

      sinon.assert.notCalled(dispatch);
      sinon.assert.notCalled(SamplesFetcher.update);
      expect(mixture.components[1].id).toBe(2);
    });
  });

  it('syncs sample-list mixture quantities without rebinding its composition when leaving a reaction', async () => {
    const { reaction, mixture } = build();
    const tab = new Sample(JSON.parse(JSON.stringify(mixture.serializeMaterial())));
    tab.initialComponents(tab.components.map(Component.deserializeData));
    expect(tab.isEdited).toBe(false);
    mixture.setAmount({ value: massG * 2, unit: 'g' });
    mixture.setReferenceComponent(1, { preserveRatios: true, fromReactionScheme: true });
    const store = Object.create(ElementStore.StoreModel.prototype);
    store.state = { selecteds: [reaction, tab], refreshCoefficient: [] };

    store.synchronizeElements(reaction);

    expect(tab.amount_g).toBeCloseTo(massG * 2, 12);
    expect(tab.amount_mol).toBeCloseTo(0.012, 12);
    expect(tab.reference_component.id).toBe(1);
    expect(tab.belongTo).toBeUndefined();
    expect(tab.isDetachedMixtureDraft).toBeUndefined();
    expect(tab.hasReactionMixtureConflict()).toBe(false);
  });

  ['mass', 'composition'].forEach((edit) => {
    it(`keeps a sample-list mixture ${edit} save in the open reaction and its next save payload`, async () => {
      const { reaction, mixture } = build();
      reaction.purification_solvents = [];
      reaction.segments = [];
      const tab = new Sample(JSON.parse(JSON.stringify({ ...mixture.serializeMaterial(), tag: mixture.tag })));
      tab.initialComponents(tab.components.map((component) => Component.deserializeData({
        ...component,
        component_properties: {
          ...component.component_properties,
          molecule: mixture.components.find((entry) => entry.id === component.id).molecule,
        },
      })));
      expect(tab.belongTo).toBeUndefined();
      expect(tab.isDetachedMixtureDraft).toBeFalsy();
      const updateMaterial = sandbox.spy(reaction, 'updateMaterial');
      const store = Object.create(ElementStore.StoreModel.prototype);
      store.state = {
        selecteds: [reaction, tab], currentElement: tab, activeKey: 1, refreshCoefficient: [],
      };

      if (edit === 'mass') tab.setAmount({ value: massG * 2, unit: 'g' });
      else tab.updateComponentRatio(tab.components[1], 3, 'solid', { lockAmountColumnSolids: false });
      const expected = tab.serializeMaterial();
      const { element: saved } = await new Promise((resolve) => {
        new ElementActions().updateSample(tab)(resolve);
      });
      // Saving replaces the sample tab with the API response; returning activates the reaction.
      store.changeCurrentElement(saved);
      store.changeCurrentElement(reaction);

      sinon.assert.calledWith(updateMaterial, saved);
      const material = reaction.sampleById(tab.id);
      expect(material.amount_g).toBeCloseTo(tab.amount_g, 12);
      expect(material.components.map((component) => component.amount_mol))
        .toEqual(tab.components.map((component) => component.amount_mol));
      const payload = reaction.serialize().materials.starting_materials.find((entry) => entry.id === tab.id);
      expect(payload.target_amount_value).toBe(expected.target_amount_value);
      expect(payload.target_amount_unit).toBe(expected.target_amount_unit);
      expect(payload.components).toEqual(expected.components);
    });
  });

  it('keeps a sample-list mixture mass in the reaction after clearing and saving its total volume', async () => {
    const { reaction, mixture } = build();
    reaction.purification_solvents = [];
    reaction.segments = [];
    const tab = new Sample(JSON.parse(JSON.stringify({ ...mixture.serializeMaterial(), tag: mixture.tag })));
    tab.initialComponents(tab.components.map((component) => Component.deserializeData({
      ...component,
      component_properties: {
        ...component.component_properties,
        molecule: mixture.components.find((entry) => entry.id === component.id).molecule,
      },
    })));
    tab.components.forEach((component) => component.updatePhysicalAmounts());
    const store = Object.create(ElementStore.StoreModel.prototype);
    store.state = { selecteds: [reaction, tab], currentElement: tab, activeKey: 1, refreshCoefficient: [] };
    tab.solvent = [{ amount_l: 0.005, density: 1 }];
    tab.setTotalMixtureVolume(0.005);

    tab.setTotalMixtureVolume(0);
    const expectedMass = massG + 5;
    const { element: saved } = await new Promise((resolve) => {
      new ElementActions().updateSample(tab)(resolve);
    });
    store.changeCurrentElement(saved);
    store.changeCurrentElement(reaction);

    expect(saved.amount_unit).toBe('g');
    expect(saved.amount_g).toBeCloseTo(expectedMass, 12);
    expect(reaction.sampleById(tab.id).amount_g).toBeCloseTo(expectedMass, 12);
    expect(reaction.sampleById(tab.id).amount_mol).toBeCloseTo(0.006, 12);
    const payload = reaction.serialize().materials.starting_materials.find((entry) => entry.id === tab.id);
    expect(payload.target_amount_unit).toBe('g');
    expect(payload.target_amount_value).toBeCloseTo(expectedMass, 12);
  });

  it('updates the draft baseline after saving so a second editor save is allowed', async () => {
    const { reaction, mixture } = build();
    let draft;
    await new ElementActions().showReactionMaterial({ sample: mixture, reaction })(({ sample }) => {
      draft = sample;
    });
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

  it('keeps loaded editor components when the reaction row has not loaded them', async () => {
    const { reaction, mixture } = build();
    let draft;
    await new ElementActions().showReactionMaterial({ sample: mixture, reaction })(({ sample }) => {
      draft = sample;
    });
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

  it('does not report a conflict when raw reaction components are initialized without edits', async () => {
    const { reaction, mixture } = build();
    mixture.components = mixture.components.map((component) => component.serializeComponent());
    let draft;
    await new ElementActions().showReactionMaterial({ sample: mixture, reaction })(({ sample }) => {
      draft = sample;
    });
    draft.belongTo = reaction;
    draft.name = 'Unsaved editor change';

    mixture.initialComponents(mixture.components.map(Component.deserializeData));

    expect(draft.hasReactionMixtureConflict()).toBe(false);
  });

  const buildAfterReactionToolbarSave = async (dirtyBeforeSave = false) => {
    const { reaction, mixture } = build();
    reaction.purification_solvents = [];
    reaction.segments = [];
    let draft;
    await new ElementActions().showReactionMaterial({ sample: mixture, reaction })(({ sample }) => {
      draft = sample;
    });
    draft.belongTo = reaction;
    if (dirtyBeforeSave) draft.name = 'Unsaved composition edit';
    mixture.setAmount({ value: 12, unit: 'g' });

    // The toolbar save returns a new Reaction and new material objects with the same IDs.
    const payload = JSON.parse(JSON.stringify(reaction.serialize()));
    const savedReaction = new Reaction({ ...payload, ...payload.materials }).recordPersistedMaterials();
    savedReaction.samples.forEach((sample) => {
      const original = reaction.sampleById(sample.id);
      // API responses include molecule data rather than only the IDs in the save payload.
      sample.molecule = original.molecule;
      if (sample.isMixture()) {
        sample.initialComponents(sample.components.map((component) => Component.deserializeData({
          ...component,
          component_properties: {
            ...component.component_properties,
            molecule: original.components.find((entry) => entry.id === component.id).molecule,
          },
        })));
      }
    });
    const store = Object.create(ElementStore.StoreModel.prototype);
    store.state = {
      selecteds: [reaction, draft], currentElement: reaction, activeKey: 0, refreshCoefficient: [],
    };
    sandbox.stub(ElementStore, 'getState').callsFake(() => store.state);
    store.changeCurrentElement(savedReaction);
    store.changeCurrentElement(draft);
    return { reaction, savedReaction, draft, store };
  };

  [false, true].forEach((dirtyBeforeSave) => {
    it(`rebinds a mixture draft to the toolbar-saved reaction, unsaved edits=${dirtyBeforeSave}`, async () => {
      const { savedReaction, draft } = await buildAfterReactionToolbarSave(dirtyBeforeSave);

      expect(draft.belongTo).toBe(savedReaction);
      if (dirtyBeforeSave) {
        expect(draft.name).toBe('Unsaved composition edit');
        expect(draft.isEdited).toBe(true);
        expect(draft.hasReactionMixtureConflict()).toBe(true);
      } else {
        expect(draft.amount_g).toBeCloseTo(12, 12);
        expect(draft.isEdited).toBe(false);
        expect(draft.hasReactionMixtureConflict()).toBe(false);
      }
    });
  });

  it('blocks a mixture save against the open reaction even when belongTo points to the pre-save copy', async () => {
    const { reaction, savedReaction, draft } = await buildAfterReactionToolbarSave();
    draft.belongTo = reaction;
    draft.setAmount({ value: 12.5, unit: 'g' });
    savedReaction.sampleById(draft.id).setAmount({ value: 13, unit: 'g' });
    const dispatch = sinon.spy();

    await new ElementActions().updateSampleForReaction(draft, reaction)(dispatch);

    expect(draft.hasReactionMixtureConflict()).toBe(true);
    expect(draft.amount_g).toBeCloseTo(12.5, 12);
    expect(savedReaction.sampleById(draft.id).amount_g).toBeCloseTo(13, 12);
    sinon.assert.notCalled(SamplesFetcher.update);
    sinon.assert.notCalled(ComponentsFetcher.saveOrUpdateComponents);
    sinon.assert.notCalled(fetchStub);
    sinon.assert.notCalled(dispatch);
  });

  [false, true].forEach((closeView) => {
    it(`keeps a conflicting draft open after a reaction toolbar save, close view=${closeView}`, async () => {
      const { reaction, savedReaction, draft } = await buildAfterReactionToolbarSave();
      draft.belongTo = reaction;
      draft.setAmount({ value: 12.5, unit: 'g' });
      savedReaction.sampleById(draft.id).setAmount({ value: 13, unit: 'g' });
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

  it('applies a nonconflicting mixture save to the open toolbar-saved reaction', async () => {
    const { reaction, savedReaction, draft } = await buildAfterReactionToolbarSave();
    draft.belongTo = reaction;
    draft.setAmount({ value: 12.5, unit: 'g' });
    const dispatch = sinon.spy();

    await new ElementActions().updateSampleForReaction(draft, reaction, false)(dispatch);

    sinon.assert.calledOnce(dispatch);
    expect(dispatch.firstCall.args[0].reaction).toBe(savedReaction);
    expect(savedReaction.sampleById(draft.id).amount_g).toBeCloseTo(12.5, 12);
    expect(reaction.sampleById(draft.id).amount_g).toBeCloseTo(12, 12);
    expect(dispatch.firstCall.args[0].sample.belongTo).toBe(savedReaction);
  });

  [false, true].forEach((closeView) => {
    it(`keeps a conflicting draft open on Save, close view=${closeView}`, async () => {
      const { reaction, mixture } = build();
      let draft;
      await new ElementActions().showReactionMaterial({ sample: mixture, reaction })(({ sample }) => {
        draft = sample;
      });
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
      mixture.setReferenceComponent(1, { fromReactionScheme: true });

      await action.updateSampleForReaction(mixture, reaction, closeView)(dispatch);

      expect(SamplesFetcher.update.firstCall.args[0].serialize().target_amount_value).toBeCloseTo(
        unit === 'mol' ? 0.012 : massG, 12
      );
      expect(reaction.sampleById(1315).amount_g).toBeCloseTo(massG, 12);
      expect(persistedEquivalent).toBeCloseTo(1.2, 12);
      expect(reaction.sampleById(1315).concn).toBeCloseTo(1.2, 12);
      const updated = reaction.sampleById(1315);
      updated.setReferenceComponent(0, { fromReactionScheme: true });

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

    // Repeated saves retain reaction context; switching a linked reference here is rejected.
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
    expect(persistedEquivalent).toBeCloseTo(0.6, 12);
    expect(editor.state.sample.belongTo).toBe(reaction);
    sinon.assert.notCalled(fullReactionSave);
  });

  [0, 1].forEach((referenceIndex) => {
    it(`preserves the unsaved component ${referenceIndex} selection when opening and returning from the editor`, async () => {
      const { reaction, mixture } = build();
      reaction.type = 'reaction';
      mixture.setReferenceComponent(1 - referenceIndex, { fromReactionScheme: true });
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
      const fetchSample = SamplesFetcher.fetchById.resolves(persistedSample);
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
      sinon.assert.calledOnce(fetchSample);
      sinon.assert.notCalled(fetchComponents);
      sinon.assert.notCalled(SamplesFetcher.update);
      sinon.assert.notCalled(ComponentsFetcher.saveOrUpdateComponents);
      sinon.assert.notCalled(fetchStub);
    });
  });

  ['ratio', 'reference', 'purity', 'molarity_value'].forEach((edit) => {
    [false, true].forEach((returnBeforeDiscard) => {
      it(`discards an unsaved mixture ${edit} edit${returnBeforeDiscard ? ' after switching tabs' : ''}`, async () => {
        const { reaction, mixture } = build();
        const updateMaterial = sandbox.spy(reaction, 'updateMaterial');
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
        expect(editorSample.isDetachedMixtureDraft).toBe(true);
        if (edit === 'ratio') {
          editorSample.updateComponentRatio(editorSample.components[1], 0, 'solid');
        } else if (edit === 'reference') {
          editorSample.setReferenceComponent(1);
        } else {
          editorSample[edit] = edit === 'purity' ? 0.5 : 2;
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
        sinon.assert.notCalled(updateMaterial);
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
    const fetchSample = SamplesFetcher.fetchById.resolves(fetched);
    const dispatch = sinon.spy();

    new ElementActions().showReactionMaterial({ sample: current, reaction })(dispatch);
    await Promise.resolve();

    expect(fetchSample.calledOnceWithExactly(current.id)).toBe(true);
    expect(dispatch.firstCall.args[0].sample).toBe(fetched);
    expect(dispatch.firstCall.args[0].coefficient).toBe(current.coefficient);
  });

  [false, true].forEach((switchInEditor) => {
    it(`keeps the reaction reference fixed after a locked row switch, editor switch=${switchInEditor}`, async () => {
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
      if (switchInEditor) opened.sample.setReferenceComponent(0);
      opened.sample.prepareMixtureForSave();
      // This is the reaction scheme's existing editedSample processing during save.
      Reaction.materialGroups.forEach((group) => {
        reaction[group] = scheme.updatedSamplesForAmountChange(reaction[group] || [], opened.sample, group);
      });

      expect(reaction.referenceMaterial.amount_mol).toBeCloseTo(0.01, 12);
      await new ElementActions().updateSampleForReaction(opened.sample, reaction, false)(sinon.spy());
      expect(persistedEquivalent).toBeCloseTo(0.6, 12);
      expect(reaction.sampleById(mixture.id).amount_g).toBeCloseTo(massG / 2, 12);
    });
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
    const fetchSample = SamplesFetcher.fetchById.resolves(fetchedSample);
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
    sinon.assert.notCalled(fetchComponents);
    expect(opened.sample.reference_component).toBeInstanceOf(Component);
    expect(opened.sample.reference_component.id).toBe(1);
    expect(opened.sample.amount_mol).toBeCloseTo(0.006, 12);
  });

  it('leaves associations pending for a new unsaved reaction', async () => {
    const { reaction, mixture } = build();
    reaction.isNew = true;
    mixture.setReferenceComponent(1, { fromReactionScheme: true });
    const dispatch = sinon.spy();

    await new ElementActions().updateSampleForReaction(mixture, reaction)(dispatch);

    sinon.assert.notCalled(fetchStub);
    sinon.assert.calledOnce(dispatch);
    expect(reaction.sampleById(1315).equivalent).toBeCloseTo(1.2, 12);
  });

  it('does not create an association for a material added only to the unsaved reaction state', async () => {
    const { reaction, mixture } = build();
    reaction.starting_materials = [reaction.referenceMaterial];
    reaction.recordPersistedMaterials();
    reaction.starting_materials.push(mixture);
    mixture.setReferenceComponent(1, { fromReactionScheme: true });
    const dispatch = sinon.spy();

    await new ElementActions().updateSampleForReaction(mixture, reaction)(dispatch);

    sinon.assert.notCalled(fetchStub);
    sinon.assert.calledOnce(dispatch);
  });

  ['starting_materials', 'reactants', 'products', 'solvents', 'purification_solvents'].forEach((group) => {
    [undefined, 999].forEach((tagReactionId) => {
      it(`persists a saved ${group} mixture equivalent with tag reaction=${tagReactionId}`, async () => {
        const { reaction, mixture } = build();
        reaction.starting_materials = [reaction.referenceMaterial];
        reaction[group] = [...(reaction[group] || []), mixture];
        reaction.recordPersistedMaterials();
        mixture.tag = { taggable_data: { reaction_id: tagReactionId } };
        mixture.setReferenceComponent(1, { fromReactionScheme: true });
        await new ElementActions().updateSampleForReaction(mixture, reaction, false)(sinon.spy());
        sinon.assert.calledOnce(fetchStub);
        expect(persistedEquivalent).toBeCloseTo(group === 'products' ? 1 : 1.2, 12);
        expect(reaction.sampleById(mixture.id).reference_component.id).toBe(2);
      });
    });
  });

  it('does not infer a persisted association from an existing reaction id or a matching tag', async () => {
    const { reaction, mixture } = build();
    delete reaction._persistedMaterialIds;
    await new ElementActions().updateSampleForReaction(mixture, reaction, false)(sinon.spy());
    sinon.assert.notCalled(fetchStub);
    sinon.assert.calledOnce(SamplesFetcher.update);
  });

  it('hydrates a snapshot from the API without treating later local additions as persisted', () => {
    const { reaction } = build();
    reaction.segments = [];
    reaction.purification_solvents = [];
    reaction.variations = [];
    const serialized = reaction.serialize();
    const fetched = ReactionsFetcher.reactionElement({
      reaction: { ...serialized, ...serialized.materials },
    }, reaction.id);
    expect([...fetched._persistedMaterialIds].sort()).toEqual([10, 1315, 20].sort());
    fetched.purification_solvents.push(new Sample({ id: 333 }));
    expect(fetched._persistedMaterialIds.has(333)).toBe(false);
    expect(Object.keys(fetched)).not.toContain('_persistedMaterialIds');
    expect(() => fetched.checksum()).not.toThrow();
  });

  it('keeps ordinary sample saves on the existing path', async () => {
    const { reaction } = build();
    const dispatch = sinon.spy();

    await new ElementActions().updateSampleForReaction(reaction.referenceMaterial, reaction)(dispatch);

    sinon.assert.notCalled(fetchStub);
    sinon.assert.calledOnce(dispatch);
  });

  [undefined, null, NaN, Infinity, 'n.d'].forEach((equivalent) => {
    it(`refreshes a saved mixture without sending an unusable equivalent=${equivalent}`, async () => {
      const { reaction, mixture } = build();
      reaction.referenceMaterial.setAmount({ value: 0, unit: 'mol' });
      mixture.equivalent = equivalent;
      const dispatch = sinon.spy();

      await new ElementActions().updateSampleForReaction(mixture, reaction)(dispatch);

      sinon.assert.calledOnce(SamplesFetcher.update);
      sinon.assert.notCalled(fetchStub);
      sinon.assert.calledOnce(dispatch);
    });
  });

  it('persists zero as a valid mixture equivalent', async () => {
    const { reaction, mixture } = build();
    reaction.referenceMaterial.setAmount({ value: 0, unit: 'mol' });
    mixture.equivalent = 0;

    await new ElementActions().updateSampleForReaction(mixture, reaction)(sinon.spy());

    sinon.assert.calledOnce(fetchStub);
    expect(persistedEquivalent).toBe(0);
  });

  ['HTTP', 'network'].forEach((failure) => {
    [false, true].forEach((closeView) => {
      it(`allows retry after an equivalent ${failure} failure, close=${closeView}`, async () => {
        const { reaction, mixture } = build();
        let draft;
        await new ElementActions().showReactionMaterial({ sample: mixture, reaction })(({ sample }) => {
          draft = sample;
        });
        draft.belongTo = reaction;
        draft.setAmount({ value: massG * 2, unit: 'g' });
        if (failure === 'HTTP') fetchStub.onFirstCall().resolves(new Response('{}', { status: 401 }));
        else fetchStub.onFirstCall().rejects(new TypeError('Failed to fetch'));
        const dispatch = sinon.spy(({ sample }) => { draft = sample; });
        const stopLoading = sandbox.stub(LoadingActions, 'stop');
        sandbox.stub(console, 'log');
        const notifications = [];
        const dispose = addMiddleware(rootStore.notificationsStore, (call, next) => {
          if (call.name === 'add') notifications.push(call.args[0]);
          return next(call);
        });

        try {
          await new ElementActions().updateSampleForReaction(draft, reaction, closeView)(dispatch);

          sinon.assert.calledOnce(dispatch);
          sinon.assert.calledOnce(stopLoading);
          expect(dispatch.firstCall.args[0].closeView).toBe(false);
          expect(notifications[0].title).toBe('Mixture saved; reaction equivalent not saved');
          expect(draft.hasReactionMixtureConflict()).toBe(false);
          expect(draft.isEdited).toBe(false);
          expect(draft.amount_g).toBeCloseTo(massG * 2, 12);
          expect(reaction.sampleById(draft.id).amount_g).toBeCloseTo(massG * 2, 12);

          draft.name = 'Retry after equivalent failure';
          await new ElementActions().updateSampleForReaction(draft, reaction, closeView)(dispatch);

          sinon.assert.calledTwice(dispatch);
          sinon.assert.calledTwice(fetchStub);
          expect(dispatch.secondCall.args[0].closeView).toBe(closeView);
          expect(draft.hasReactionMixtureConflict()).toBe(false);
          expect(persistedEquivalent).toBeCloseTo(1.2, 12);
          expect(notifications.length).toBe(1);
        } finally {
          dispose();
        }
      });
    });
  });

  ['components', 'sample'].forEach((stage) => {
    it(`does not apply an unsaved mixture when saving the ${stage} fails`, async () => {
      const { reaction, mixture } = build();
      const original = reaction.checksum();
      let draft;
      await new ElementActions().showReactionMaterial({ sample: mixture, reaction })(({ sample }) => {
        draft = sample;
      });
      draft.setAmount({ value: massG * 2, unit: 'g' });
      const fetcher = stage === 'components' ? ComponentsFetcher.saveOrUpdateComponents : SamplesFetcher.update;
      fetcher.rejects(new Error('Save failed'));
      sandbox.stub(console, 'log');
      const dispatch = sinon.spy();

      await new ElementActions().updateSampleForReaction(draft, reaction)(dispatch);

      sinon.assert.notCalled(dispatch);
      sinon.assert.notCalled(fetchStub);
      expect(reaction.checksum()).toBe(original);
      expect(draft.hasReactionMixtureConflict(reaction)).toBe(false);
    });
  });
});
