import React, { Component } from 'react';
import UIStore from 'src/stores/alt/stores/UIStore';
import PropTypes from 'prop-types';
import { Button, OverlayTrigger, Tooltip } from 'react-bootstrap';
import { CellLinePropTypeTableEntry } from 'src/models/cellLine/CellLinePropTypes';
import { aviatorNavigation } from 'src/utilities/routesUtils';

export default class CellLineGroupHeader extends Component {
  constructor(props) {
    super(props);
    this.state = {
      detailedInformation: false,
    };
  }

  renderNameHeader(firstCellLineItem) {
    return (
      <div className="d-flex gap-2 align-items-center">
        <div className="flex-grow-1 fw-bold fs-5">
          {`${firstCellLineItem.cellLineName} - ${firstCellLineItem.source}`}
        </div>
        {this.renderCreateSubSampleButton()}
        {this.renderDetailedInfoButton()}
      </div>
    );
  }

  renderDetailedInfos(firstCellLineItem) {
    const { detailedInformation } = this.state;
    return !detailedInformation ? null : (
      <div className="mt-2">
        {this.renderProperty('Organism', firstCellLineItem.organism)}
        {this.renderProperty('Disease', firstCellLineItem.disease)}
        {this.renderProperty('Tissue', firstCellLineItem.tissue)}
        {this.renderProperty('Mutation', firstCellLineItem.mutation)}
        {this.renderProperty('Variant', firstCellLineItem.variant)}
        {this.renderProperty('Bio safety level', firstCellLineItem.bioSafetyLevel)}
        {this.renderProperty('Cryopreservation medium', firstCellLineItem.cryopreservationMedium)}
        {this.renderProperty('Gender', firstCellLineItem.gender)}
      </div>
    );
  }

  renderDetailedInfoButton() {
    const { detailedInformation } = this.state;
    const active = !!detailedInformation;
    return (
      <OverlayTrigger
        placement="top"
        overlay={(
          <Tooltip id="detailed-info-button">
            Show detailed information about the material
          </Tooltip>
        )}
      >
        <Button
          variant="info"
          className={active ? 'border border-primary' : ''}
          size="sm"
          onClick={(e) => {
            e.stopPropagation();
            this.setState({ detailedInformation: !detailedInformation });
          }}
        >
          <i className="fa fa-info-circle" aria-hidden="true" />
        </Button>
      </OverlayTrigger>
    );
  }

  renderCreateSubSampleButton() {
    const { cellLineItems } = this.props;
    const { currentCollection, isSync } = UIStore.getState();
    if (currentCollection.label === 'All') { return null; }
    if (currentCollection.is_sync_to_me && currentCollection.permission_level === 0) { return null; }
    const params = {
      type: 'cell_line',
      params:
      {
        collectionID: currentCollection.id,
        cell_lineID: 'new',
        cell_line_template: cellLineItems[0]
      }
    };

    return (
      <OverlayTrigger
        placement="top"
        overlay={(
          <Tooltip id="detailed-info-button">
            Create sample of cell line material
          </Tooltip>
        )}
      >
        <Button
          size="sm"
          onClick={() => aviatorNavigation('cell_line', 'new', true, true, params)}
        >
          <i className="fa fa-plus" aria-hidden="true" />
        </Button>
      </OverlayTrigger>
    );
  }

  // eslint-disable-next-line class-methods-use-this
  renderProperty(propertyName, propertyValue) {
    if (!propertyValue) { return null; }
    return (
      <div className="ms-5 d-flex gap-3">
        <span style={{ width: '170px' }}>{propertyName}</span>
        -
        <span className="flex-grow-1">{propertyValue}</span>
      </div>
    );
  }

  render() {
    const { cellLineItems } = this.props;

    return (
      <div>
        {this.renderNameHeader(cellLineItems[0])}
        {this.renderDetailedInfos(cellLineItems[0])}
      </div>
    );
  }
}

CellLineGroupHeader.propTypes = {
  cellLineItems: PropTypes.arrayOf(
    CellLinePropTypeTableEntry
  ).isRequired,
};
