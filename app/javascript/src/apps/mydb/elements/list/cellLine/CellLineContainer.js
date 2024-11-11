import React from 'react';
import CellLineEntry from 'src/apps/mydb/elements/list/cellLine/CellLineEntry';
import PropTypes from 'prop-types';
import { CellLinePropTypeTableEntry } from 'src/models/cellLine/CellLinePropTypes';

export default function CellLineContainer({ cellLineGroups, showDetails }) {
  return (
    <div className="list-container">
      {cellLineGroups.map(
        (group) => (
          <CellLineEntry
            key={group.cellLineItems[0].id}
            cellLineItems={group.cellLineItems}
            showDetails={showDetails}
          />
        )
      )}
    </div>
  );
}

CellLineContainer.propTypes = {
  cellLineGroups: PropTypes.arrayOf(
    PropTypes.shape({
      cellLineItems: PropTypes.arrayOf(CellLinePropTypeTableEntry),
    })
  ).isRequired,
  showDetails: PropTypes.func.isRequired,
};
