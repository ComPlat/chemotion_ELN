import {
  resetColumnDefinitionsMaterials
} from 'src/apps/mydb/elements/details/reactions/variationsTab/ReactionVariationsMaterials';
import {
  getCellDataType, updateColumnDefinitions, addMissingColumnDefinitions, removeObsoleteColumnDefinitions
} from 'src/apps/mydb/elements/details/reactions/variationsTab/ReactionVariationsUtils';

export default function columnDefinitionsReducer(columnDefinitions, action) {
  switch (action.type) {
    case 'remove_obsolete_materials': {
      return removeObsoleteColumnDefinitions(
        columnDefinitions,
        action.selectedColumns,
      );
    }
    case 'apply_column_selection': {
      let updatedColumnDefinitions = addMissingColumnDefinitions(
        columnDefinitions,
        action.selectedColumns,
        action.materials,
        action.gasMode
      );
      updatedColumnDefinitions = removeObsoleteColumnDefinitions(
        updatedColumnDefinitions,
        action.selectedColumns
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
        action.selectedColumns,
        action.gasMode
      );

      return updatedColumnDefinitions;
    }
    case 'update_gas_type': {
      return resetColumnDefinitionsMaterials(
        columnDefinitions,
        action.materials,
        action.selectedColumns,
        action.gasMode
      );
    }
    default: {
      return columnDefinitions;
    }
  }
}
