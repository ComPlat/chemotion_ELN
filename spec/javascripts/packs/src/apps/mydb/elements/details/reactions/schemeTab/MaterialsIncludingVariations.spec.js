import expect from 'expect';
import ReactionFactory from 'factories/ReactionFactory';
import { materialsIncludingVariations } from 'src/apps/mydb/elements/details/reactions/schemeTab/ReactionDetailsScheme';
import { makeVariationReaction } from 'src/apps/mydb/elements/details/reactions/variationsTab/ReactionVariationsUtils';

/*
The Scheme tab lists a group's own materials and those only some variations have. Two variations that
each added a different material have both in the same slot, and both are listed.
*/
describe('materialsIncludingVariations', () => {
  let reaction;

  const variationWith = (...addedIds) => {
    const variation = makeVariationReaction(reaction, {});
    addedIds.forEach((id) => {
      const [template] = variation.starting_materials;
      const added = Object.assign(Object.create(Object.getPrototypeOf(template)), template, { id });
      variation.addMaterialAt(added, null, null, 'starting_materials');
    });
    return { data: variation };
  };

  const idsOf = (variations) => materialsIncludingVariations(reaction, variations, 'starting_materials')
    .map((material) => material.id);

  beforeEach(async () => {
    reaction = await ReactionFactory.build('ReactionFactory.water+water=>water+water');
  });

  it('lists the reaction\'s own materials', () => {
    expect(idsOf([variationWith()])).toEqual(reaction.starting_materials.map((material) => material.id));
  });

  it('lists different materials two variations added in the same slot', () => {
    const own = reaction.starting_materials.map((material) => material.id);
    expect(idsOf([variationWith('solvent-x'), variationWith('solvent-y')])).toEqual([...own, 'solvent-x', 'solvent-y']);
  });

  it('lists a material several variations share once', () => {
    const own = reaction.starting_materials.map((material) => material.id);
    expect(idsOf([variationWith('shared'), variationWith('shared', 'other')])).toEqual([...own, 'shared', 'other']);
  });
});
