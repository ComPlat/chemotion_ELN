import { MenuHeader } from 'src/apps/mydb/elements/details/reactions/variationsTab/ReactionVariationsComponents';
import {
  updateColumnDefinitionsMaterials, updateColumnDefinitionsMaterialTypes
} from 'src/apps/mydb/elements/details/reactions/variationsTab/ReactionVariationsMaterials';
import {
  getCellDataType,
  updateColumnDefinitions
} from 'src/apps/mydb/elements/details/reactions/variationsTab/ReactionVariationsUtils';

function columnDefinitionsReducer(columnDefinitions, action) {
  switch (action.type) {
    case 'update_material_set': {
      return updateColumnDefinitionsMaterials(
        columnDefinitions,
        action.reactionMaterials,
        MenuHeader,
        action.gasMode
      );
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
        getCellDataType(action.entryDefs.currentEntry)
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
