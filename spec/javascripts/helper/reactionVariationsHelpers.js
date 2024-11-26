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
    variations.push(createVariationsRow(reaction, variations));
  }
  reaction.variations = variations;

  return reaction;
}

async function setUpGaseousReaction() {
  const reaction = await ReactionFactory.build('ReactionFactory.water+water=>water+water');
  reaction.starting_materials[0].reference = true;
  reaction.starting_materials[0].gas_type = 'catalyst';
  reaction.reactants = [await setUpMaterial()];
  reaction.reactants[0].gas_type = 'feedstock';
  reaction.products[0].gas_type = 'gas';
  reaction.products[0].gas_phase_data = {
    time: { unit: 'h', value: 1 },
    temperature: { unit: 'K', value: 1 },
    turnover_number: 1,
    part_per_million: 1,
    turnover_frequency: { unit: 'TON/h', value: 1 }
  };

  const variations = [];
  for (let id = 0; id < 3; id++) {
    variations.push(createVariationsRow(reaction, variations, true, 10));
  }
  reaction.variations = variations;

  return reaction;
}

function getColumnGroupChild(columnDefinitions, groupID, fieldID) {
  const columnGroup = columnDefinitions.find((group) => group.groupId === groupID);
  const columnDefinition = columnGroup.children.find((child) => child.field === fieldID);

  return columnDefinition;
}

function getColumnDefinitionsMaterialIDs(columnDefinitions, materialType) {
  return columnDefinitions.find(
    (columnDefinition) => columnDefinition.groupId === materialType
  ).children.map(
    // E.g., extract "foo" from "reactants.foo", or "bar" from "startingMaterials.bar",
    // "foo" and "bar" being the material IDs.
    (child) => child.field.replace(`${materialType}.`, '')
  );
}

export {
  setUpMaterial, setUpReaction, setUpGaseousReaction, getColumnGroupChild, getColumnDefinitionsMaterialIDs
};
