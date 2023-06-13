import React, { Component } from 'react';
import UIStore from 'src/stores/alt/stores/UIStore';
import CellLineItemEntry from 'src/apps/mydb/elements/list/cellLine/CellLineItemEntry';
import PropTypes from 'prop-types';
import { Button } from 'react-bootstrap';
import { elementShowOrNew } from 'src/utilities/routesUtils';
import ElementStore from 'src/stores/alt/stores/ElementStore';

/* eslint-disable jsx-a11y/click-events-have-key-events */
/* eslint-disable jsx-a11y/no-static-element-interactions */

export default class CellLineEntry extends Component {
  constructor(props) {
    super(props);
    this.state = {
      detailedInformation: false,
      showEntries: true
    };
  }

  componentDidMount() {
    UIStore.getState();
  }

  getBorderStyle() {
    const { showEntries } = this.state;
    return showEntries
      ? 'list-container cell-line-group-gray-background'
      : 'list-container cell-line-group-gray-background cell-line-group-bottom-border';
  }

  renderItemEntries(cellLineItems) {
    const { showEntries } = this.state;
    return showEntries ? cellLineItems.map(
      (cellLineItem) => <CellLineItemEntry key={cellLineItem.id} cellLineItem={cellLineItem} />
    ) : [];
  }

  renderNameHeader(firstCellLineItem) {
    return [
      this.renderArrow(),
      this.renderDetailedInfoButton(),
      this.renderCreateSubSampleButton(),
      <div
        key={firstCellLineItem.cellLineName}
        className="cell-line-group-header-name"
      >
        {firstCellLineItem.cellLineName} - {firstCellLineItem.source}
      </div>];
  }

  renderArrow() {
    const { showEntries } = this.state;
    const arrowType = showEntries ? 'glyphicon-chevron-right' : 'glyphicon-chevron-down';
    return (
      <div className="cell-line-group-arrow floating-right">
        <i className={`glyphicon ${arrowType}`} />
      </div>

    );
  }

  renderBasicInfos(firstCellLineItem) {
    return null;
  }

  renderDetailedInfos(firstCellLineItem) {
    const { detailedInformation } = this.state;
    return !detailedInformation ? [] : [
      this.renderProperty('Organism', firstCellLineItem.organism),
      this.renderProperty('Disease', firstCellLineItem.disease),
      this.renderProperty('Tissue', firstCellLineItem.tissue),
      this.renderProperty('Mutation', firstCellLineItem.mutation),
      this.renderProperty('Variant', firstCellLineItem.variant),
      this.renderProperty('Bio safety level', firstCellLineItem.bioSafetyLevel),
      this.renderProperty('Cryopreservation medium', firstCellLineItem.cryopreservationMedium),
      this.renderProperty('gender', firstCellLineItem.gender)
    ];
  }

  renderDetailedInfoButton() {
    const { detailedInformation } = this.state;
    const buttonActive = detailedInformation?"cell-line-group-detailed-info-button-inactive":"cell-line-group-detailed-info-button-active";
    return (
        <Button
          className={"button-right "+buttonActive}
          bsSize="xsmall"
          onClick={(e) => {
            e.stopPropagation();
            this.setState({ detailedInformation: !detailedInformation });
          }}
        >
          <i className="fa fa-info-circle" aria-hidden="true" />
        </Button>
      );
  }
  renderCreateSubSampleButton(){
    return (
        <Button
          className={"button-right "}
          bsSize="xsmall"
          onClick={(event) => {
            event.stopPropagation();

            const { currentCollection, isSync } = UIStore.getState();
            const ui_state=UIStore.getState();
            const uri = isSync
              ? `/scollection/${currentCollection.id}/cell_line/new`
              : `/collection/${currentCollection.id}/cell_line/new`;
            Aviator.navigate(uri, { silent: true });

            const e = { 
              type:"cell_line", params: 
              { collectionID: currentCollection.id,
                cell_lineID: "new"
              }
            };
            elementShowOrNew(e);
          }}
        >
          <i className="fa fa-plus" aria-hidden="true" />
        </Button>
      );
  }

  // eslint-disable-next-line class-methods-use-this
  renderProperty(propertyName, propertyValue) {
    if (!propertyValue) { return null; }
    return (
      <div className="cell-line-group-header-property">
        <div className="property-key floating">{propertyName}</div>
        <div className="property-key-minus floating" floating>-</div>
        <div className="property-value">
          {propertyValue}
        </div>
      </div>
    );
  }

  render() {
    const { cellLineItems } = this.props;
    const { showEntries } = this.state;
    if (cellLineItems.length === 0) { return (null); }
    return (
      <div>
        <div
          className={this.getBorderStyle()}
          onClick={() => { this.setState({ showEntries: !showEntries }); }}
        >
          {this.renderNameHeader(cellLineItems[0])}
          {this.renderBasicInfos(cellLineItems[0])}
          {this.renderDetailedInfos(cellLineItems[0])}
        </div>
        {this.renderItemEntries(cellLineItems)}
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
