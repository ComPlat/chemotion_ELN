import ReactionFactory from 'factories/ReactionFactory';
import SampleFactory from 'factories/SampleFactory';
import {
  createVariationsRow,
} from 'src/apps/mydb/elements/details/reactions/variationsTab/ReactionVariationsUtils';

async function setUpMaterial() {
  return SampleFactory.build('SampleFactory.water_100g');
}
async function setUpReaction() {
  const reaction = await ReactionFactory.build('ReactionFactory.water+water=>water+water');
  reaction.starting_materials[0].reference = true;
  reaction.reactants = [await setUpMaterial()];

  const variations = [];
  for (let id = 0; id < 3; id++) {
    variations.push(createVariationsRow(reaction, id));
  }
  reaction.variations = variations;

  return reaction;
}

export { setUpMaterial, setUpReaction };
