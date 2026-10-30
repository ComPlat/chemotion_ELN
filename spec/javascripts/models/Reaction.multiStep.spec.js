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
    reaction.reaction_steps[1].timestamp_stop = '30/09/2026 18:00:00';
    reaction.mirrorFirstStep();
    expect(reaction.description.ops.map((op) => op.insert).join('')).toEqual('Step 1: step one\nStep 2: step two\n');
    expect(reaction.timestamp_stop).toEqual('30/09/2026 18:00:00');
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

  it('does not share temperature or vessel size with a copy', async () => {
    const reaction = await ReactionFactory.build('ReactionFactory.water+water=>water+water');
    reaction.reaction_type = 'multi_step';
    reaction.reaction_steps = [{ id: 1, position: 1, temperature: { userText: '80' }, vessel_size: { amount: 5 } }];
    reaction.temperature = { data: [], userText: '25', valueUnit: '°C' };

    const copy = reaction.buildCopy();
    copy.temperature.userText = '99';
    copy.reaction_steps[0].temperature.userText = '99';
    copy.reaction_steps[0].vessel_size.amount = 99;

    expect([reaction.temperature.userText, reaction.reaction_steps[0].temperature.userText,
      reaction.reaction_steps[0].vessel_size.amount]).toEqual(['25', '80', 5]);
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

  it('keeps steps, links and carry-on hidden when leaving multi-step, and sends them on save', async () => {
    const reaction = await ReactionFactory.build('ReactionFactory.water+water=>water+water');
    reaction.reaction_type = 'multi_step';
    reaction.enterMultiStep();
    reaction.addStep();
    reaction.products[0].carry_on = true;

    reaction.leaveMultiStep();
    reaction.reaction_type = 'standard';

    expect(reaction.hasHiddenSteps()).toEqual(true);
    expect(reaction.allReactionMaterials.every((m) => m.reaction_step_id === reaction.reaction_steps[0].id))
      .toEqual(true);
    expect([reaction.serialize().reaction_steps.length, reaction.products[0].carry_on]).toEqual([2, true]);
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

    reaction.leaveMultiStep();

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

    reaction.leaveMultiStep();

    expect(merged.equivalent).toBeCloseTo(0.5);
  });

  it('measures product yields against the reaction reference and keeps step refs when leaving multi-step', async () => {
    const reaction = await ReactionFactory.build('ReactionFactory.water+water=>water+water');
    reaction.reaction_type = 'multi_step';
    reaction.reaction_steps = [{ id: 1, position: 1 }, { id: 2, position: 2 }];
    const [start, stepTwoStart] = reaction.starting_materials;
    start.reaction_step_id = 1;
    start.reference = true;
    start.setAmount({ value: 0.01, unit: 'mol' });
    stepTwoStart.reaction_step_id = 2;
    stepTwoStart.step_reference = true;
    const [, product] = reaction.products;
    product.reaction_step_id = 2;
    product.setAmount({ value: 0.004, unit: 'mol' });
    product.equivalent = 0.6667;
    start.coefficient = 1;
    product.coefficient = 1;

    reaction.leaveMultiStep();

    expect([+product.equivalent.toFixed(4), stepTwoStart.step_reference]).toEqual([0.4, true]);
  });

  it('never counts a material of a deleted step as a step 1 material', async () => {
    const reaction = await ReactionFactory.build('ReactionFactory.water+water=>water+water');
    reaction.reaction_type = 'multi_step';
    reaction.reaction_steps = [{ id: 1, position: 1 }, { id: 2, position: 2, _destroy: true }];
    const [first, deleted] = reaction.starting_materials;
    first.reaction_step_id = 1;
    deleted.reaction_step_id = 2;
    const sbmmLike = { reaction_step_id: null };

    expect([first, deleted, sbmmLike].map((m) => reaction.isFirstStepMaterial(m))).toEqual([true, false, true]);
  });

  it('merges every step text into the description when leaving multi-step', async () => {
    const reaction = await ReactionFactory.build('ReactionFactory.water+water=>water+water');
    reaction.reaction_type = 'multi_step';
    reaction.reaction_steps = [
      { id: 1, position: 1, description: { ops: [{ insert: 'heat it\n' }] } },
      { id: 2, position: 2, description: { ops: [{ insert: 'cool it\n' }] } },
    ];

    reaction.leaveMultiStep();

    expect(reaction.description.ops.map((op) => op.insert).join('')).toEqual('Step 1: heat it\nStep 2: cool it\n');
  });

  it('keeps a later step text when only that step has text on leaving multi-step', async () => {
    const reaction = await ReactionFactory.build('ReactionFactory.water+water=>water+water');
    reaction.reaction_type = 'multi_step';
    reaction.reaction_steps = [
      { id: 1, position: 1, description: { ops: [{ insert: '\n' }] } },
      { id: 2, position: 2, description: { ops: [{ insert: 'cool it\n' }] } },
    ];

    reaction.leaveMultiStep();

    expect(reaction.description.ops.map((op) => op.insert).join('')).toEqual('Step 2: cool it\n');
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

describe('Reaction#hasSingleStep', () => {
  it('is true for a new multi-step reaction and false once step 2 exists', () => {
    const reaction = Reaction.buildEmpty();
    expect(reaction.hasSingleStep()).toEqual(false);

    reaction.reaction_type = 'multi_step';
    reaction.enterMultiStep();
    expect(reaction.hasSingleStep()).toEqual(true);

    reaction.addStep();
    expect(reaction.hasSingleStep()).toEqual(false);
  });
});

describe('Reaction with hidden steps (standard)', () => {
  const text = (description) => description.ops.map((op) => op.insert).join('');
  const bold = (insert) => ({ insert, attributes: { bold: true } });
  const twoSteps = async () => {
    const reaction = await ReactionFactory.build('ReactionFactory.water+water=>water+water');
    reaction.reaction_type = 'multi_step';
    reaction.reaction_steps = [
      {
        id: 1,
        position: 1,
        description: { ops: [{ insert: 'heat it\n' }] },
        temperature: { data: [], userText: '80', valueUnit: '°C' },
        timestamp_stop: '30/09/2026 12:00:00',
      },
      {
        id: 2, position: 2, description: { ops: [{ insert: 'cool it\n' }] }, timestamp_stop: '30/09/2026 15:00:00',
      },
    ];
    reaction.allReactionMaterials.forEach((material) => { material.reaction_step_id = 1; });
    reaction.products[0].carry_on = true;
    return reaction;
  };
  const backToMultiStep = (reaction) => {
    reaction.reaction_type = 'multi_step';
    reaction.enterMultiStep();
    return reaction.reaction_steps.map((step) => text(step.description));
  };

  it('splits the text back at the headings, keeping the text above Step 1 as the reaction own text', async () => {
    const reaction = await twoSteps();
    reaction.leaveMultiStep();
    reaction.reaction_type = 'standard';
    reaction.description = {
      ops: [{ insert: 'general note\n' }, bold('Step 1: '), { insert: 'heat it\n' }, bold('Step 2: '), { insert: 'cool it slowly\n' }],
    };

    expect(backToMultiStep(reaction)).toEqual(['heat it\n', 'cool it slowly\n']);
    expect(text(reaction.description)).toEqual('general note\nStep 1: heat it\nStep 2: cool it slowly\n');
  });

  it('keeps the text of a deleted heading with the step above and treats made-up headings as text', async () => {
    const reaction = await twoSteps();
    reaction.leaveMultiStep();
    reaction.reaction_type = 'standard';
    reaction.description = { ops: [bold('Step 1: '), { insert: 'heat it\nStep 5: odd\ncool it\n' }] };

    expect(backToMultiStep(reaction)).toEqual(['heat it\nStep 5: odd\ncool it\n', '\n']);
  });

  it('treats a plain copy of step 1 as no text above Step 1', async () => {
    const reaction = await twoSteps();
    reaction.description = { ops: [{ insert: 'heat it\n' }] };
    const loaded = new Reaction(reaction);

    loaded.leaveMultiStep();

    expect(text(loaded.description)).toEqual('Step 1: heat it\nStep 2: cool it\n');
  });

  it('copies standard edits back to step 1 and the stop to the last step', async () => {
    const reaction = await twoSteps();
    reaction.leaveMultiStep();
    reaction.reaction_type = 'standard';
    reaction.temperature = { data: [], userText: '90', valueUnit: '°C' };
    reaction.timestamp_stop = '30/09/2026 16:00:00';

    backToMultiStep(reaction);
    const [first, last] = reaction.reaction_steps;

    expect([first.temperature.userText, first.timestamp_stop, last.timestamp_stop])
      .toEqual(['90', '30/09/2026 12:00:00', '30/09/2026 16:00:00']);
  });

  it('draws the intermediate in the standard picture', async () => {
    const reaction = await twoSteps();
    reaction.leaveMultiStep();
    reaction.reaction_type = 'standard';

    expect(reaction.schemeSvgRequest().materialsSvgPaths.products.length).toEqual(reaction.products.length);
  });
});

describe('Reaction#hiddenStepTemperatures', () => {
  it('places each step temperature at its start time after step 1, or at 00:00:00 without one', () => {
    const reaction = Reaction.buildEmpty();
    reaction.reaction_steps = [
      { id: 1, position: 1, timestamp_start: '30/09/2026 15:00:00', temperature: { data: [], userText: '80' } },
      { id: 2, position: 2, timestamp_start: '30/09/2026 18:30:00', temperature: { data: [], userText: '25' } },
      { id: 3, position: 3, temperature: { data: [{ time: '00:10:00', value: '5' }] } },
    ];
    reaction.temperature = { data: [], userText: '80' };
    reaction.timestamp_start = '30/09/2026 15:00:00';

    expect(reaction.hiddenStepTemperatures()).toEqual([
      { step: 1, time: '00:00:00', value: '80', typed: true },
      { step: 2, time: '03:30:00', value: '25', typed: true },
      { step: 3, time: '00:10:00', value: '5' },
    ]);
  });

  it('lists a step\'s typed text first, then its list rows, like the Temperature field of a Standard reaction', () => {
    const reaction = Reaction.buildEmpty();
    reaction.reaction_steps = [
      { id: 1, position: 1, temperature: { data: [], userText: '20' } },
      { id: 2, position: 2, temperature: { data: [{ time: '00:30:00', value: '60' }], userText: '20 ~ 40' } },
    ];
    reaction.temperature = { data: [], userText: '20' };

    expect(reaction.hiddenStepTemperatures().map(({ step, value, typed }) => [step, value, !!typed])).toEqual([
      [1, '20', true], [2, '20 ~ 40', true], [2, '60', false],
    ]);
  });
});

describe('Reaction#serialize for multi-step', () => {
  it('saves the combined step text as the reaction description, even right after adding a step', () => {
    const reaction = Reaction.buildEmpty();
    reaction.reaction_type = 'multi_step';
    reaction.enterMultiStep();
    reaction.addStep({ description: { ops: [{ insert: 'cool it\n' }] } });

    expect(reaction.serialize().description.ops.map((op) => op.insert).join('')).toEqual('Step 2: cool it\n');
  });
});

describe('Reaction#hasHiddenSteps', () => {
  it('only counts two or more kept steps, so a one-step reaction switched back looks like a plain one', () => {
    const reaction = Reaction.buildEmpty();
    reaction.reaction_steps = [{ id: 1, position: 1 }];
    expect(reaction.hasHiddenSteps()).toEqual(false);

    reaction.reaction_steps = [{ id: 1, position: 1 }, { id: 2, position: 2 }];
    expect(reaction.hasHiddenSteps()).toEqual(true);
  });
});

describe('Reaction with hidden steps, review fixes', () => {
  const twoSteps = async () => {
    const reaction = await ReactionFactory.build('ReactionFactory.water+water=>water+water');
    reaction.reaction_type = 'multi_step';
    reaction.reaction_steps = [
      { id: 1, position: 1, conditions: 'UV', timestamp_start: '30/09/2026 15:00:00' },
      { id: 2, position: 2, conditions: 'microwave', timestamp_start: '30/09/2026 14:00:00' },
    ];
    const [start, later] = reaction.starting_materials;
    start.reaction_step_id = 1;
    start.reference = true;
    later.reaction_step_id = 2;
    reaction.reactants.forEach((material) => { material.reaction_step_id = 1; });
    reaction.products.forEach((material) => { material.reaction_step_id = 1; });
    reaction.leaveMultiStep();
    reaction.reaction_type = 'standard';
    return { reaction, start, later };
  };

  it('shows and saves edits made in Standard as step 1 values right away', async () => {
    const { reaction } = await twoSteps();
    reaction.conditions = 'heat';

    expect(reaction.stepsSvgPaths()[0].conditions).toEqual('heat');
    expect(reaction.serialize().reaction_steps[0].conditions).toEqual('heat');
  });

  it('never gives a step before step 1 a negative time', async () => {
    const { reaction } = await twoSteps();
    reaction.temperature = { data: [], userText: '20' };
    reaction.reaction_steps[1].temperature = { data: [], userText: '20' };

    expect(reaction.hiddenStepTemperatures().map((point) => point.time)).toEqual(['00:00:00', '00:00:00']);
  });

  it('keeps a Ref picked on a later-step material as that step Ref when switching back', async () => {
    const { reaction, start, later } = await twoSteps();
    start.reference = false;
    later.reference = true;

    reaction.reaction_type = 'multi_step';
    reaction.enterMultiStep();

    expect([later.reference, later.step_reference, start.reference]).toEqual([false, true, true]);
  });

  it('finds a heading that Quill merged into the bold line above it', async () => {
    const { reaction } = await twoSteps();
    reaction.description = {
      ops: [
        { insert: 'note\nStep 1: ', attributes: { bold: true } },
        { insert: 'heat it\n' },
        { insert: 'Step 2: ', attributes: { bold: true } },
        { insert: 'cool it\n' },
      ],
    };

    reaction.reaction_type = 'multi_step';
    reaction.enterMultiStep();

    expect(reaction.reaction_steps.map((step) => step.description.ops.map((op) => op.insert).join('')))
      .toEqual(['heat it\n', 'cool it\n']);
  });
});

describe('Reaction hidden steps, edge cases', () => {
  const twoSteps = async () => {
    const reaction = await ReactionFactory.build('ReactionFactory.water+water=>water+water');
    reaction.reaction_type = 'multi_step';
    reaction.reaction_steps = [{ id: 1, position: 1 }, { id: 2, position: 2 }];
    const [start, later] = reaction.starting_materials;
    start.reaction_step_id = 1;
    start.reference = true;
    later.reaction_step_id = 2;
    const [carried, final] = reaction.products;
    carried.reaction_step_id = 1;
    carried.carry_on = true;
    final.reaction_step_id = 2;
    reaction.reactants.forEach((material) => { material.reaction_step_id = 1; });
    return {
      reaction, start, later, carried, final,
    };
  };

  it('keeps hidden steps out of an interaction reaction picture', async () => {
    const { reaction } = await twoSteps();
    reaction.leaveMultiStep();
    reaction.reaction_type = 'interaction';

    expect([reaction.hasHiddenSteps(), reaction.stepsSvgPaths(), reaction.schemeSvgRequest().numberedSteps])
      .toEqual([false, [], false]);
  });

  it('carries the first step 1 product again when the carried one was removed while Standard', async () => {
    const { reaction, carried } = await twoSteps();
    reaction.leaveMultiStep();
    reaction.reaction_type = 'standard';
    carried.carry_on = false;

    reaction.reaction_type = 'multi_step';
    reaction.enterMultiStep();

    expect(carried.carry_on).toEqual(true);
  });

  it('measures later-step materials against their step Ref again right after switching back', async () => {
    const {
      reaction, start, later, carried,
    } = await twoSteps();
    start.setAmount({ value: 0.01, unit: 'mol' });
    carried.setAmount({ value: 0.004, unit: 'mol' });
    later.setAmount({ value: 0.002, unit: 'mol' });
    reaction.leaveMultiStep();
    reaction.reaction_type = 'standard';

    reaction.reaction_type = 'multi_step';
    reaction.enterMultiStep();

    expect(+later.equivalent.toFixed(4)).toEqual(+(later.amount_mol / carried.amount_mol).toFixed(4));
  });
});

describe('Reaction#toggleSchemePart', () => {
  it('switches an arrow part off and on, and sends it with the scheme and on save', async () => {
    const reaction = await ReactionFactory.build('ReactionFactory.water+water=>water+water');

    reaction.toggleSchemePart('solvents');
    expect(reaction.schemeSvgRequest().hide).toEqual(['solvents']);
    expect(reaction.serialize().scheme_hidden_parts).toEqual(['solvents']);

    reaction.toggleSchemePart('solvents');
    expect(reaction.scheme_hidden_parts).toEqual([]);
  });
});
