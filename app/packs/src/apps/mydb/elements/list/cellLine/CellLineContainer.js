import React, { Component } from 'react';
import CellLineEntry from 'src/apps/mydb/elements/list/cellLine/CellLineEntry';
import PropTypes from 'prop-types';
import { CellLinePropTypeTableEntry } from 'src/models/cellLine/CellLinePropTypes';

// eslint-disable-next-line react/prefer-stateless-function
export default class CellLineContainer extends Component {
  render() {
    const { cellLineGroups } = this.props;

    return (
      <div className="list-container">
        {cellLineGroups.map(
          (group) => (
            <CellLineEntry
              key={group.cellLineItems[0].id}
              cellLineItems={group.cellLineItems}
            />
          )
        )}
      </div>
    );
  }
}

CellLineContainer.propTypes = {
  cellLineGroups: PropTypes.arrayOf(
    PropTypes.shape({
      cellLineItems: PropTypes.arrayOf(CellLinePropTypeTableEntry),
    })
  ).isRequired
};
