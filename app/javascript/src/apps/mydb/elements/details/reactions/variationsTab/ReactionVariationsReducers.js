import { MenuHeader } from 'src/apps/mydb/elements/details/reactions/variationsTab/ReactionVariationsComponents';
import {
  updateColumnDefinitionsMaterials,
} from 'src/apps/mydb/elements/details/reactions/variationsTab/ReactionVariationsMaterials';
import {
  getCellDataType,
  updateColumnDefinitions
} from 'src/apps/mydb/elements/details/reactions/variationsTab/ReactionVariationsUtils';

function columnDefinitionsReducer(columnDefinitions, action) {
  switch (action.type) {
    case 'update_on_render': {
      return updateColumnDefinitionsMaterials(
        columnDefinitions,
        action.reactionMaterials,
        MenuHeader
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
      return updateColumnDefinitions(
        columnDefinitions,
        'properties.duration',
        'editability',
        !action.gasMode
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
