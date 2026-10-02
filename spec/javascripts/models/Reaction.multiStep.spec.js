import expect from 'expect';
import ReactionFactory from 'factories/ReactionFactory';

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
    reaction.use_reaction_volume = true;

    reaction.enterMultiStep();

    const [step] = reaction.reaction_steps;
    expect(step.duration).toEqual('34 Hour(s)');
    expect(step.conditions).toEqual('under nitrogen');
    expect(step.ph_value).toEqual(7);
    expect(step.volume).toEqual(0.5);
    expect(step.use_reaction_volume).toEqual(true);
  });

  it('divides a step material by that step volume, not the whole reaction', async () => {
    const reaction = await ReactionFactory.build('ReactionFactory.water+water=>water+water');
    reaction.reaction_type = 'multi_step';
    reaction.enterMultiStep();
    const step = reaction.reaction_steps[0];
    step.volume = 0.5;
    step.use_reaction_volume = true;

    expect(reaction.stepContext(step).reactionVolumeForConcentration()).toEqual(0.5);
    expect(reaction.volumeContextFor(reaction.starting_materials[0])
      .reactionVolumeForConcentration()).toEqual(0.5);
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

  it('omits unset step fields so the database defaults apply', async () => {
    const reaction = await ReactionFactory.build('ReactionFactory.water+water=>water+water');
    reaction.reaction_type = 'multi_step';
    reaction.reaction_steps = [{ id: 1, position: 1 }];

    const [step] = reaction.serialize().reaction_steps;

    expect('ph_operator' in step).toEqual(false);
    expect(Object.values(step).some((v) => v === null)).toEqual(false);
    expect(step.position).toEqual(1);
  });
});
