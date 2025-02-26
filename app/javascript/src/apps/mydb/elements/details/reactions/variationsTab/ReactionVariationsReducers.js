import {
  resetColumnDefinitionsMaterials, addMissingMaterialsToColumnDefinitions, removeObsoleteMaterialsFromColumnDefinitions
} from 'src/apps/mydb/elements/details/reactions/variationsTab/ReactionVariationsMaterials';
import {
  getCellDataType,
  updateColumnDefinitions
} from 'src/apps/mydb/elements/details/reactions/variationsTab/ReactionVariationsUtils';

export default function columnDefinitionsReducer(columnDefinitions, action) {
  switch (action.type) {
    case 'remove_obsolete_materials': {
      return removeObsoleteMaterialsFromColumnDefinitions(
        columnDefinitions,
        action.materialIDs,
      );
    }
    case 'apply_material_selection': {
      let updatedColumnDefinitions = addMissingMaterialsToColumnDefinitions(
        columnDefinitions,
        action.materials,
        action.materialIDs,
        action.gasMode
      );
      updatedColumnDefinitions = removeObsoleteMaterialsFromColumnDefinitions(
        updatedColumnDefinitions,
        action.materialIDs
      );
      return updatedColumnDefinitions;
    }
    case 'update_entry_defs': {
      let updatedColumnDefinitions = updateColumnDefinitions(
        columnDefinitions,
        action.field,
        'entryDefs',
        action.entryDefs
      );
      updatedColumnDefinitions = updateColumnDefinitions(
        updatedColumnDefinitions,
        action.field,
        'cellDataType',
        getCellDataType(action.entryDefs.currentEntry, action.gasType)
      );
      return updatedColumnDefinitions;
    }
    case 'toggle_gas_mode': {
      let updatedColumnDefinitions = updateColumnDefinitions(
        columnDefinitions,
        'properties.duration',
        'editable',
        !action.gasMode
      );
      updatedColumnDefinitions = resetColumnDefinitionsMaterials(
        updatedColumnDefinitions,
        action.materials,
        action.materialIDs,
        action.gasMode
      );

      return updatedColumnDefinitions;
    }
    case 'update_gas_type': {
      return resetColumnDefinitionsMaterials(
        columnDefinitions,
        action.materials,
        action.materialIDs,
        action.gasMode
      );
    }
    default: {
      return columnDefinitions;
    }
  }
}
