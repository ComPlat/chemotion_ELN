import React, { Component } from 'react';
import UIStore from 'src/stores/alt/stores/UIStore';
import CellLineItemEntry from 'src/apps/mydb/elements/list/cellLine/CellLineItemEntry';
import PropTypes from 'prop-types';
import { Button } from 'react-bootstrap';
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
      <div
        key={firstCellLineItem.cellLineName}
        className="cell-line-group-header-name"
      >
        {firstCellLineItem.cellLineName}
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
    return [this.renderProperty('Organism', firstCellLineItem.organism),
      this.renderProperty('Disease', firstCellLineItem.disease)];
  }

  renderDetailedInfos(firstCellLineItem) {
    const { detailedInformation } = this.state;
    return !detailedInformation ? [] : [
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
    return detailedInformation
      ? (
        <Button
          className="cell-line-group-detailed-info-button-inactive button-right"
          bsSize="xsmall"
          onClick={(e) => {
            e.stopPropagation();
            this.setState({ detailedInformation: !detailedInformation });
          }}
        >
          <i className="fa fa-info-circle" aria-hidden="true" />
        </Button>
      )
      : (
        <Button
          className="cell-line-group-detailed-info-button-active button-right"
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

  // eslint-disable-next-line class-methods-use-this
  renderProperty(propertyName, propertyValue) {
    if (!propertyValue) { return null; }
    return (
      <div className="cell-line-group-header-property">
        <div className="property-key floating">{propertyName}</div>
        <div className="property-key-minus floating" floating>-</div>
        <div>
          {' '}
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
