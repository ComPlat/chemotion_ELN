import {
  updateColumnDefinitionsMaterialTypes
} from 'src/apps/mydb/elements/details/reactions/variationsTab/ReactionVariationsMaterials';
import {
  getCellDataType,
  updateColumnDefinitions
} from 'src/apps/mydb/elements/details/reactions/variationsTab/ReactionVariationsUtils';

function columnDefinitionsReducer(columnDefinitions, action) {
  switch (action.type) {
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
      updatedColumnDefinitions = updateColumnDefinitionsMaterialTypes(
        updatedColumnDefinitions,
        action.reactionMaterials,
        action.gasMode
      );

      return updatedColumnDefinitions;
    }
    case 'update_gas_type': {
      return updateColumnDefinitionsMaterialTypes(
        columnDefinitions,
        action.reactionMaterials,
        action.gasMode
      );
    }
    default: {
      return columnDefinitions;
    }
  }
}

export {
  columnDefinitionsReducer
};
