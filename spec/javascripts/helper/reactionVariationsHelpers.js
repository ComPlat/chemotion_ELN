import ReactionFactory from 'factories/ReactionFactory';
import SampleFactory from 'factories/SampleFactory';
import {
  createVariationsRow,
} from 'src/apps/mydb/elements/details/reactions/variationsTab/ReactionVariationsUtils';
import {
  getReactionMaterials,
} from '../../../app/javascript/src/apps/mydb/elements/details/reactions/variationsTab/ReactionVariationsMaterials';

async function setUpMaterial() {
  return SampleFactory.build('SampleFactory.water_100g');
}

function getSelectedColumns(materialIDs) {
  return {
    ...materialIDs, properties: ['duration', 'temperature'], metadata: ['analyses', 'notes', 'group'], segments: []
  };
}

function getReactionMaterialsIDs(materials) {
  return Object.fromEntries(
    Object.entries(materials).map(([materialType, materialsOfType]) => [
      materialType,
      materialsOfType.map((material) => material.id.toString())
    ])
  );
}

async function setUpReaction() {
  const reaction = await ReactionFactory.build('ReactionFactory.water+water=>water+water');
  reaction.starting_materials[0].reference = true;
  reaction.reactants = [await setUpMaterial()];

  // Ensure molecule_molecular_weight is set as a property on ALL materials, not just a getter
  // This is needed because cloneDeep in getReactionMaterials won't preserve getters
  [reaction.starting_materials, reaction.reactants, reaction.products].flat().forEach((material) => {
    if (material && material.molecule && material.molecule.molecular_weight) {
      Object.defineProperty(material, 'molecule_molecular_weight', {
        value: material.molecule.molecular_weight,
        writable: true,
        enumerable: true,
        configurable: true
      });
    }
  });

  const materials = getReactionMaterials(reaction);
  const materialIDs = getReactionMaterialsIDs(materials);

  const variations = [];
  for (let id = 0; id < 3; id++) {
    variations.push(createVariationsRow(
      {
        materials,
        selectedColumns: getSelectedColumns(materialIDs),
        variations,
        durationValue: '',
        durationUnit: 'Hour(s)',
        temperatureValue: '',
        temperatureUnit: '°C',
        gasMode: false,
        vesselVolume: 42,
      }
    ));
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
    temperature: { unit: 'K', value: 298 }, // Room temperature in Kelvin for realistic calculations
    turnover_number: 1,
    part_per_million: 10000, // 1% concentration for meaningful values
    turnover_frequency: { unit: 'TON/h', value: 1 }
  };
  reaction.products[0].amount_unit = 'mol';
  reaction.products[0].amount_value = 1;

  // Ensure molecule_molecular_weight is set as a property on ALL materials, not just a getter
  // This is needed because cloneDeep in getReactionMaterials won't preserve getters
  [reaction.starting_materials, reaction.reactants, reaction.products].flat().forEach((material) => {
    if (material && material.molecule && material.molecule.molecular_weight) {
      Object.defineProperty(material, 'molecule_molecular_weight', {
        value: material.molecule.molecular_weight,
        writable: true,
        enumerable: true,
        configurable: true
      });
    }
  });

  const materials = getReactionMaterials(reaction);
  const materialIDs = getReactionMaterialsIDs(materials);

  const variations = [];
  for (let id = 0; id < 3; id++) {
    variations.push(createVariationsRow(
      {
        materials,
        selectedColumns: getSelectedColumns(materialIDs),
        variations,
        gasMode: true,
        vesselVolume: 10
      }
    ));
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
  setUpMaterial,
  setUpReaction,
  setUpGaseousReaction,
  getColumnGroupChild,
  getColumnDefinitionsMaterialIDs,
  getSelectedColumns,
  getReactionMaterialsIDs,
};
