import {
  getCellDataType, updateColumnDefinitions, addMissingColumnDefinitions, removeObsoleteColumnDefinitions,
  getColumnDefinitions, getCurrentEntry
} from 'src/apps/mydb/elements/details/reactions/variationsTab/ReactionVariationsUtils';

export default function columnDefinitionsReducer(columnDefinitions, action) {
  switch (action.type) {
    case 'apply_column_selection': {
      let updatedColumnDefinitions = addMissingColumnDefinitions(
        columnDefinitions,
        action.selectedColumns,
        action.materials,
        action.segments,
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
        getCellDataType(getCurrentEntry(action.entryDefs), action.gasType)
      );
      return updatedColumnDefinitions;
    }
    case 'toggle_gas_mode': {
      return getColumnDefinitions(
        action.selectedColumns,
        action.materials,
        action.gasMode
      );
    }
    case 'set_updated': {
      return action.update;
    }
    default: {
      return columnDefinitions;
    }
  }
}
