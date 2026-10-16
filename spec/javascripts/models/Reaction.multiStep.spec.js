import expect from 'expect';
import ReactionFactory from 'factories/ReactionFactory';
import Reaction from 'src/models/Reaction';

describe('Reaction multi-step', () => {

  it('creates step 1 and assigns existing rows to it on entering multi-step', async () => {
    const reaction = await ReactionFactory.build('ReactionFactory.water+water=>water+water');

    reaction.enterMultiStep();

    const firstId = reaction.reaction_steps[0].id;
    expect(reaction.reaction_steps.length).toEqual(1);
    expect(reaction.starting_materials.every((m) => m.reaction_step_id === firstId)).toEqual(true);
    expect(reaction.products.every((m) => m.reaction_step_id === firstId)).toEqual(true);
  });

  it('copies the reaction values into step 1 on entering multi-step', async () => {
    const reaction = await ReactionFactory.build('ReactionFactory.water+water=>water+water');
    reaction.duration = '34 Hour(s)';
    reaction.conditions = 'under nitrogen';
    reaction.ph_value = 7;
    reaction.volume = 0.5;
    reaction.description = { ops: [{ insert: 'stir overnight\n' }] };

    reaction.enterMultiStep();

    const [step] = reaction.reaction_steps;
    expect(step.duration).toEqual('34 Hour(s)');
    expect(step.conditions).toEqual('under nitrogen');
    expect(step.ph_value).toEqual(7);
    expect(step.volume).toEqual(0.5);
    expect(step.description).toEqual({ ops: [{ insert: 'stir overnight\n' }] });
    expect(step.description).not.toBe(reaction.description);
  });

  it('shows the step duration in a new reaction, not the reaction default', () => {
    const reaction = Reaction.buildEmpty();
    reaction.enterMultiStep();
    const [step] = reaction.reaction_steps;
    step.duration = '7 Hour(s)';

    expect(reaction.stepContext(step).durationDisplay.dispValue).toEqual('7');
  });

  it('divides a step material by that step volume, not the whole reaction', async () => {
    const reaction = await ReactionFactory.build('ReactionFactory.water+water=>water+water');
    reaction.reaction_type = 'multi_step';
    reaction.enterMultiStep();
    const step = reaction.reaction_steps[0];
    step.volume = 0.5;
    reaction.concentration_mode = 'reaction_volume';

    expect(reaction.stepContext(step).reactionVolumeForConcentration()).toEqual(0.5);
    expect(reaction.volumeContextFor(reaction.starting_materials[0])
      .reactionVolumeForConcentration()).toEqual(0.5);
  });

  it('shares the reaction basis across steps but divides by each step volume', async () => {
    const reaction = await ReactionFactory.build('ReactionFactory.water+water=>water+water');
    reaction.reaction_type = 'multi_step';
    reaction.concentration_mode = 'reaction_volume';
    reaction.reaction_steps = [{ id: 1, position: 1, volume: 0.5 }, { id: 2, position: 2, volume: 0.2 }];
    const [first, second] = reaction.starting_materials;
    first.reaction_step_id = 1;
    second.reaction_step_id = 2;

    expect(reaction.volumeContextFor(first).reactionVolumeForConcentration()).toEqual(0.5);
    expect(reaction.volumeContextFor(second).reactionVolumeForConcentration()).toEqual(0.2);
    expect(reaction.serialize().reaction_steps.some((s) => 'concentration_mode' in s)).toEqual(false);
  });

  it('sets the step volume, not the reaction volume, when a step concentration is typed', async () => {
    const reaction = await ReactionFactory.build('ReactionFactory.water+water=>water+water');
    reaction.reaction_type = 'multi_step';
    reaction.volume = 1;
    reaction.reaction_steps = [{ id: 1, position: 1, volume: 1 }, { id: 2, position: 2 }];
    const sample = reaction.reactants[0] || reaction.starting_materials[1];
    sample.reaction_step_id = 2;
    sample.amount_value = 0.1;
    sample.amount_unit = 'mol';

    const applied = reaction.deriveVolumeFromSampleConcentration(sample, 0.5);

    expect(applied.volume).toBeCloseTo(sample.amount_mol / 0.5);
    expect(reaction.reaction_steps[1].volume).toBeCloseTo(sample.amount_mol / 0.5);
    expect(reaction.concentration_mode).toEqual('reaction_volume');
    expect(reaction.volume).toEqual(1);
  });

  it('mirrors step 1 onto the reaction so other tabs read current values', async () => {
    const reaction = await ReactionFactory.build('ReactionFactory.water+water=>water+water');
    reaction.duration = '34 Hour(s)';
    reaction.enterMultiStep();
    reaction.addStep();

    reaction.reaction_steps[0].duration = '2 Hour(s)';
    reaction.mirrorFirstStep();
    expect(reaction.duration).toEqual('2 Hour(s)');

    reaction.reaction_steps[1].duration = '9 Hour(s)';
    reaction.mirrorFirstStep();
    expect(reaction.duration).toEqual('2 Hour(s)');

    reaction.reaction_steps[0].description = { ops: [{ insert: 'step one\n' }] };
    reaction.reaction_steps[1].description = { ops: [{ insert: 'step two\n' }] };
    reaction.mirrorFirstStep();
    expect(reaction.description).toEqual({ ops: [{ insert: 'step one\n' }] });
  });

  it('drops a deleted step and its materials from the save payload and renumbers', async () => {
    const reaction = await ReactionFactory.build('ReactionFactory.water+water=>water+water');
    reaction.reaction_type = 'multi_step';
    reaction.reaction_steps = [
      { id: 1, position: 1 }, { id: 2, position: 2, _destroy: true }, { id: 3, position: 3 },
    ];
    reaction.starting_materials[0].reaction_step_id = 2;
    reaction.starting_materials[1].reaction_step_id = 3;

    const payload = reaction.serialize();

    expect(payload.reaction_steps.map((s) => s.position)).toEqual([1, 2]);
    expect(payload.reaction_steps.map((s) => s.id)).toEqual([1, 3]);
    expect(payload.materials.starting_materials.length).toEqual(1);
    expect(payload.materials.starting_materials[0].reaction_step_position).toEqual(2);
  });

  it('clears carry_on in the payload when no live step follows', async () => {
    const reaction = await ReactionFactory.build('ReactionFactory.water+water=>water+water');
    reaction.reaction_type = 'multi_step';
    reaction.reaction_steps = [{ id: 1, position: 1 }];
    reaction.products.forEach((product) => {
      product.reaction_step_id = 1;
      product.carry_on = true;
    });

    const payload = reaction.serialize();

    expect(payload.materials.products.every((p) => p.carry_on === false)).toEqual(true);
  });

  it('does not share step objects with a copy', async () => {
    const reaction = await ReactionFactory.build('ReactionFactory.water+water=>water+water');
    reaction.reaction_type = 'multi_step';
    reaction.reaction_steps = [{ id: 1, position: 1 }];

    const copy = reaction.buildCopy();
    copy.reaction_steps[0]._destroy = true;

    expect(reaction.reaction_steps[0]._destroy).toEqual(undefined);
  });

  it('leaves a standard reaction alone', async () => {
    const reaction = await ReactionFactory.build('ReactionFactory.water+water=>water+water');
    reaction.starting_materials[0].reference = true;

    expect(reaction.isMultiStep()).toEqual(false);
    expect(reaction.referenceMaterial.id).toEqual(reaction.starting_materials[0].id);
  });

  it('carries more than one product into the next step', async () => {
    const reaction = await ReactionFactory.build('ReactionFactory.water+water=>water+water');
    reaction.reaction_type = 'multi_step';
    reaction.reaction_steps = [{ id: 1, position: 1 }, { id: 2, position: 2 }];
    reaction.products.forEach((product) => {
      product.reaction_step_id = 1;
      product.carry_on = true;
    });

    const carried = reaction.carriedProductsIntoStep(2);
    expect(carried.length).toEqual(reaction.products.length);
    expect(carried[0].id).toEqual(reaction.products[0].id);
  });

  it('locks carry-on only on the last product feeding a live next step', async () => {
    const reaction = await ReactionFactory.build('ReactionFactory.water+water=>water+water');
    reaction.reaction_type = 'multi_step';
    reaction.reaction_steps = [{ id: 1, position: 1 }, { id: 2, position: 2 }];
    const [first, second] = reaction.products;
    reaction.products.forEach((product) => { product.reaction_step_id = 1; });

    first.carry_on = true;
    second.carry_on = true;
    expect(reaction.isCarryOnLocked(first)).toEqual(false);

    second.carry_on = false;
    expect(reaction.isCarryOnLocked(first)).toEqual(true);
    expect(reaction.isCarryOnLocked(second)).toEqual(false);

    reaction.reaction_steps[1]._destroy = true;
    expect(reaction.isCarryOnLocked(first)).toEqual(false);
  });

  it('refuses to move the product the next step depends on, and un-carries others that move', async () => {
    const reaction = await ReactionFactory.build('ReactionFactory.water+water=>water+water');
    reaction.reaction_type = 'multi_step';
    reaction.reaction_steps = [{ id: 1, position: 1 }, { id: 2, position: 2 }];
    const [first, second] = reaction.products;
    reaction.products.forEach((product) => { product.reaction_step_id = 1; });
    first.carry_on = true;

    expect(reaction.prepareCarriedMove(first, 'products', 1)).toEqual(true);
    expect(reaction.prepareCarriedMove(first, 'reactants', 1)).toEqual(false);
    expect(reaction.prepareCarriedMove(first, 'products', 2)).toEqual(false);
    expect(first.carry_on).toEqual(true);

    second.carry_on = true;
    expect(reaction.prepareCarriedMove(second, 'reactants', 1)).toEqual(true);
    expect(second.carry_on).toEqual(false);
    expect(first.carry_on).toEqual(true);
  });

  it('lets only the last live step be deleted and only the next one be restored', async () => {
    const reaction = await ReactionFactory.build('ReactionFactory.water+water=>water+water');
    reaction.reaction_type = 'multi_step';
    reaction.reaction_steps = [{ id: 1, position: 1 }, { id: 2, position: 2 }, { id: 3, position: 3 }];
    const [first, second] = reaction.products;
    first.reaction_step_id = 1;
    first.carry_on = true;
    second.reaction_step_id = 2;
    second.carry_on = true;
    const step = (id) => reaction.reaction_steps.find((entry) => entry.id === id);

    expect(reaction.canToggleStep(step(1))).toEqual(false);
    expect(reaction.canToggleStep(step(2))).toEqual(false);
    expect(reaction.canToggleStep(step(3))).toEqual(true);

    step(3)._destroy = true;
    step(2)._destroy = true;
    expect(reaction.canToggleStep(step(3))).toEqual(false);
    expect(reaction.canToggleStep(step(2))).toEqual(true);

    first.carry_on = false;
    expect(reaction.canToggleStep(step(2))).toEqual(false);
  });

  it('reports multi-step data only with extra steps or a carried product', async () => {
    const reaction = await ReactionFactory.build('ReactionFactory.water+water=>water+water');
    reaction.reaction_type = 'multi_step';
    reaction.reaction_steps = [{ id: 1, position: 1 }];
    expect(reaction.hasMultiStepData()).toEqual(false);

    reaction.reaction_steps = [{ id: 1, position: 1 }, { id: 2, position: 2 }];
    expect(reaction.hasMultiStepData()).toEqual(true);
  });

  it('clears steps, links and carry-on when leaving multi-step', async () => {
    const reaction = await ReactionFactory.build('ReactionFactory.water+water=>water+water');
    reaction.reaction_type = 'multi_step';
    reaction.enterMultiStep();
    reaction.products[0].carry_on = true;

    reaction.clearMultiStep();

    expect(reaction.reaction_steps).toEqual([]);
    expect(reaction.allReactionMaterials.every((m) => m.reaction_step_id === null)).toEqual(true);
    expect(reaction.products.every((p) => p.carry_on === false)).toEqual(true);
  });

  it('drops a deleted step materials and merges live ones when leaving multi-step', async () => {
    const reaction = await ReactionFactory.build('ReactionFactory.water+water=>water+water');
    reaction.reaction_type = 'multi_step';
    reaction.reaction_steps = [{ id: 1, position: 1 }, { id: 2, position: 2, _destroy: true }];
    reaction.starting_materials.forEach((m) => { m.reaction_step_id = 1; });
    reaction.reactants.forEach((m) => { m.reaction_step_id = 1; });
    const [kept, deleted] = reaction.products;
    kept.reaction_step_id = 1;
    deleted.reaction_step_id = 2;

    reaction.clearMultiStep();

    expect(reaction.products.map((p) => p.id)).toEqual([kept.id]);
    expect(reaction.serialize().materials.products.map((p) => p.id)).toEqual([kept.id]);
  });

  it('measures merged materials against the reaction reference when leaving multi-step', async () => {
    const reaction = await ReactionFactory.build('ReactionFactory.water+water=>water+water');
    reaction.reaction_type = 'multi_step';
    reaction.reaction_steps = [{ id: 1, position: 1 }, { id: 2, position: 2 }];
    const [start, merged] = reaction.starting_materials;
    start.reaction_step_id = 1;
    start.reference = true;
    merged.reaction_step_id = 2;
    start.setAmount({ value: 0.01, unit: 'mol' });
    merged.setAmount({ value: 0.005, unit: 'mol' });
    merged.equivalent = 99;

    reaction.clearMultiStep();

    expect(merged.equivalent).toBeCloseTo(0.5);
  });

  it('adds the unit only to a numeric step temperature in the scheme', async () => {
    const reaction = await ReactionFactory.build('ReactionFactory.water+water=>water+water');
    reaction.reaction_type = 'multi_step';
    reaction.reaction_steps = [
      { id: 1, position: 1, temperature: { data: [], userText: 'r.t.', valueUnit: '°C' } },
      { id: 2, position: 2, temperature: { data: [], userText: '40', valueUnit: '°C' } },
    ];

    expect(reaction.stepsSvgPaths().map((step) => step.temperature)).toEqual(['r.t.', '40 °C']);
  });

  it('omits unset step fields so the database defaults apply', async () => {
    const reaction = await ReactionFactory.build('ReactionFactory.water+water=>water+water');
    reaction.reaction_type = 'multi_step';
    reaction.reaction_steps = [{ id: 1, position: 1 }];

    const [step] = reaction.serialize().reaction_steps;

    expect('ph_operator' in step).toEqual(false);
    expect(Object.values(step).some((v) => v === null)).toEqual(false);
    expect(step.position).toEqual(1);
  });

  it('clears the step start and stop times on a copied reaction', async () => {
    const reaction = await ReactionFactory.build('ReactionFactory.water+water=>water+water');
    reaction.reaction_type = 'multi_step';
    reaction.reaction_steps = [
      { id: 1, position: 1, timestamp_start: '01/10/2026 09:00:00', timestamp_stop: '01/10/2026 12:00:00' },
      { id: 2, position: 2, timestamp_start: '01/10/2026 13:00:00', timestamp_stop: '' },
    ];

    const copy = Reaction.copyFromReactionAndCollectionId(reaction, 1);

    expect(copy.reaction_steps.map((s) => [s.timestamp_start, s.timestamp_stop])).toEqual([['', ''], ['', '']]);
    expect(reaction.reaction_steps[0].timestamp_start).toEqual('01/10/2026 09:00:00');
  });

  describe('per-step reference', () => {
    const buildTwoSteps = async () => {
      const reaction = await ReactionFactory.build('ReactionFactory.water+water=>water+water');
      reaction.reaction_type = 'multi_step';
      reaction.reaction_steps = [{ id: 1, position: 1 }, { id: 2, position: 2 }];
      const [start, reagent] = reaction.starting_materials;
      const [carried, final] = reaction.products;
      start.reaction_step_id = 1;
      start.reference = true;
      reagent.reaction_step_id = 2;
      carried.reaction_step_id = 1;
      carried.carry_on = true;
      final.reaction_step_id = 2;
      return {
        reaction, start, reagent, carried, final,
      };
    };

    it('measures a later step against its carried product by default', async () => {
      const {
        reaction, start, reagent, carried, final,
      } = await buildTwoSteps();

      expect(reaction.referenceFor(start)).toBe(start);
      expect(reaction.referenceFor(carried)).toBe(start);
      expect(reaction.referenceFor(reagent)).toBe(carried);
      expect(reaction.referenceFor(final)).toBe(carried);
      expect(reaction.isReference(carried)).toEqual(false);
    });

    it('lets a later step pick its own reference without touching step 1', async () => {
      const {
        reaction, start, reagent, carried, final,
      } = await buildTwoSteps();

      reaction.setStepReference(reaction.reaction_steps[1], reagent.id);

      expect(reaction.referenceFor(final)).toBe(reagent);
      expect(reaction.isReference(reagent)).toEqual(true);
      expect(reaction.isReference(start)).toEqual(true);
      expect(carried.step_reference).toEqual(false);
      expect(reaction.referenceMaterial).toBe(start);
    });

    it('ignores a reference flag left on a later-step material', async () => {
      const { reaction, start, reagent } = await buildTwoSteps();
      start.reference = false;
      reagent.reference = true;

      expect(reaction.referenceMaterial).toEqual(undefined);
    });

    it('drops the step choice when the product is no longer carried', async () => {
      const { reaction, carried } = await buildTwoSteps();
      carried.step_reference = true;

      reaction.toggleCarryOn(carried.id);

      expect(carried.step_reference).toEqual(false);
    });

    it('sends the step choice only for a product that is still carried', async () => {
      const { reaction, carried, final } = await buildTwoSteps();
      carried.step_reference = true;
      final.step_reference = true;

      const { products } = reaction.serialize().materials;

      expect(products.find((p) => p.id === carried.id).step_reference).toEqual(true);
      expect(products.find((p) => p.id === final.id).step_reference).toEqual(false);
    });

    it('never sends the reaction reference flag for a later-step material', async () => {
      const { reaction, reagent } = await buildTwoSteps();
      reagent.reference = true;

      const sent = reaction.serialize().materials.starting_materials.find((m) => m.id === reagent.id);

      expect(sent.reference).toEqual(false);
    });

    it('keeps the step choice on a copied reaction', async () => {
      const { reaction, reagent } = await buildTwoSteps();
      reaction.setStepReference(reaction.reaction_steps[1], reagent.id);

      const copy = reaction.buildCopy();
      const copiedReagent = copy.starting_materials[1];

      expect(copiedReagent.step_reference).toEqual(true);
      expect(copy.isReference(copiedReagent)).toEqual(true);
    });

    it('keeps the step link when a material is refreshed from its sample', async () => {
      const { reaction, reagent } = await buildTwoSteps();
      reagent.step_reference = true;

      reaction.updateMaterial({ ...reagent, reaction_step_id: undefined, step_reference: undefined });

      const refreshed = reaction.starting_materials.find((m) => m.id === reagent.id);
      expect(refreshed.reaction_step_id).toEqual(2);
      expect(refreshed.step_reference).toEqual(true);
    });
  });
});
