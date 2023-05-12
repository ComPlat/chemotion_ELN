import React, { Component } from 'react';
import CellLineEntry from 'src/apps/mydb/elements/list/cellLine/CellLineEntry';
import PropTypes from 'prop-types';

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
  cellLineGroups: PropTypes.shape({
    // eslint-disable-next-line react/forbid-prop-types
    cellLineItems: PropTypes.arrayOf(PropTypes.object),
    map: PropTypes.func.isRequired
  }).isRequired
};
