import React, { Component } from 'react';
import UIStore from 'src/stores/alt/stores/UIStore';
import CellLineItemEntry from 'src/apps/mydb/elements/list/cellLine/CellLineItemEntry';
import PropTypes from 'prop-types';

export default class CellLineEntry extends Component {
  componentDidMount() {
    UIStore.getState();
  }

  render() {
    const { cellLineItems } = this.props;
    if (cellLineItems.length === 0) { return (null); }

    const firstCellLineItem = cellLineItems[0];
    return (
      <div className="list-container">
        <br />
        ID:
        {' '}
        {firstCellLineItem.cellLineId}
        {' '}
        -
        {firstCellLineItem.cellLineName}
        <br />
        {firstCellLineItem.organism}
        {' '}
        -
        {firstCellLineItem.disease}

        {cellLineItems.map(
          (cellLineItem) => <CellLineItemEntry key={cellLineItem.id} cellLineItem={cellLineItem} />
        )}
      </div>
    );
  }
}

CellLineEntry.propTypes = {
  cellLineItems: PropTypes.arrayOf(PropTypes.shape({
    cellLineId: PropTypes.number.isRequired,
    cellLineName: PropTypes.string.isRequired,
    organism: PropTypes.string.isRequired,
    disease: PropTypes.string.isRequired
  })).isRequired
};
