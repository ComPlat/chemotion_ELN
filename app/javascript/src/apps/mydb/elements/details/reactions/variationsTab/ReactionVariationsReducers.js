import {
  addMissingColumnDefinitions, removeObsoleteColumnDefinitions, getColumnDefinitions, setGroupColDefAttribute,
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
    case 'set_group_col_def_attribute': {
      return setGroupColDefAttribute(
        columnDefinitions,
        action.groupId,
        action.subGroupId,
        action.attribute,
        action.update
      );
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
