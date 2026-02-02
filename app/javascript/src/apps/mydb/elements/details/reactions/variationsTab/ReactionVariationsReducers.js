import {
  addMissingColumnDefinitions, removeObsoleteColumnDefinitions, getColumnDefinitions, setEntryColDefs,
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
      return setEntryColDefs(columnDefinitions, action.path, action.update);
    }
    case 'toggle_gas_mode': {
      return getColumnDefinitions(
        action.selectedColumns,
        action.materials,
        action.segments,
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
