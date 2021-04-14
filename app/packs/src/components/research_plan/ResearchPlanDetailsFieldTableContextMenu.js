/* eslint-disable react/prefer-stateless-function */
import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { Menu } from 'react-data-grid-addons';

const { ContextMenu, MenuItem } = Menu;

class ResearchPlanDetailsFieldTableContextMenu extends Component {

  render() {
    const {
      idx, id, rowIdx, onColumnInsertLeft, onColumnInsertRight, onColumnRename,
      onColumnDelete, onRowInsertAbove, onRowInsertBelow, onRowDelete
    } = this.props;

    return (
      <ContextMenu id={id}>
        <MenuItem data={{ rowIdx, idx }} onClick={onColumnInsertLeft}>
          Insert column left
        </MenuItem>
        <MenuItem data={{ rowIdx, idx }} onClick={onColumnInsertRight}>
          Insert column right
        </MenuItem>

        <MenuItem divider />

        <MenuItem data={{ rowIdx, idx }} onClick={onColumnRename}>
          Rename column
        </MenuItem>

        <MenuItem divider />

        <MenuItem data={{ rowIdx, idx }} onClick={onColumnDelete}>
          Delete column
        </MenuItem>

        <MenuItem divider />

        <MenuItem data={{ rowIdx, idx }} onClick={onRowInsertAbove}>
          Insert row above
        </MenuItem>
        <MenuItem data={{ rowIdx, idx }} onClick={onRowInsertBelow}>
          Insert row below
        </MenuItem>

        <MenuItem divider />

        <MenuItem data={{ rowIdx, idx }} onClick={onRowDelete}>
          Delete Row
        </MenuItem>

      </ContextMenu>
    );
  }
}

ResearchPlanDetailsFieldTableContextMenu.propTypes = {
  idx: PropTypes.number,
  id: PropTypes.string,
  rowIdx: PropTypes.number,
  onColumnInsertLeft: PropTypes.func,
  onColumnInsertRight: PropTypes.func,
  onColumnRename: PropTypes.func,
  onColumnDelete: PropTypes.func,
  onRowInsertAbove: PropTypes.func,
  onRowInsertBelow: PropTypes.func,
  onRowDelete: PropTypes.func
};

export default ResearchPlanDetailsFieldTableContextMenu;
