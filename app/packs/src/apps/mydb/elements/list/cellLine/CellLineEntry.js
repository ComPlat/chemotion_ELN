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
      <div className="list-container cell-line-group-gray-background">
        <div className="cell-line-group-header-name">{firstCellLineItem.cellLineName}</div>
          {this.renderProperty("Organism",firstCellLineItem.organism)}
          {this.renderProperty("Disease",firstCellLineItem.disease)}
          {this.renderProperty("Tissue",firstCellLineItem.tissue)}
          {this.renderProperty("Mutation",firstCellLineItem.mutation)}

          {this.renderProperty("Variant",firstCellLineItem.variant)}
          {this.renderProperty("Bio safety level",firstCellLineItem.bioSafetyLevel)}
          {this.renderProperty("Cryopreservation medium",firstCellLineItem.cryopreservationMedium)}
          {this.renderProperty("gender",firstCellLineItem.gender)}
        {cellLineItems.map(
          (cellLineItem) => <CellLineItemEntry key={cellLineItem.id} cellLineItem={cellLineItem} />
        )}
      </div>
    );
  }
  renderProperty(propertyName,propertyValue){
    if(!propertyValue){return null}
    return (
    <div className="cell-line-group-header-property">
      <div className="property-key floating">{propertyName}</div>
      <div className="property-key-minus floating" floating>-</div>
      <div>  {propertyValue}</div>
    </div>
    );
  }
}



CellLineEntry.propTypes = {
  cellLineItems: PropTypes.arrayOf(PropTypes.shape({
    id: PropTypes.string.isRequired,
    cellLineName: PropTypes.string.isRequired,
    organism: PropTypes.string.isRequired,
    disease: PropTypes.string.isRequired
  })).isRequired
};
