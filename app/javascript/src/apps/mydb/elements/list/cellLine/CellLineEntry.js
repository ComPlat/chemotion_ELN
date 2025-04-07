import React, { Component } from 'react';
import UIStore from 'src/stores/alt/stores/UIStore';
import CellLineItemEntry from 'src/apps/mydb/elements/list/cellLine/CellLineItemEntry';
import PropTypes from 'prop-types';
import { Button, OverlayTrigger, Tooltip } from 'react-bootstrap';
import { elementShowOrNew } from 'src/utilities/routesUtils';
import { CellLinePropTypeTableEntry } from 'src/models/cellLine/CellLinePropTypes';
import Aviator from 'aviator';
import ChevronIcon from 'src/components/common/ChevronIcon';

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

  getBorderStyle() {
    const { showEntries } = this.state;
    return showEntries
      ? 'list-container title-panel p-3'
      : 'list-container title-panel p-3 cell-line-group-bottom-border';
  }

  renderItemEntries(cellLineItems) {
    const { showEntries } = this.state;
    const { isElementSelected, showDetails } = this.props;
    return showEntries ? cellLineItems.map((cellLineItem) => (
      <CellLineItemEntry
        key={cellLineItem.id}
        cellLineItem={cellLineItem}
        isElementSelected={isElementSelected}
        showDetails={showDetails}
      />
    )) : [];
  }

  renderNameHeader(firstCellLineItem) {
    const { showEntries } = this.state;
    return (
      <div className="d-flex gap-2 align-items-center">
        <div className="flex-grow-1 fw-bold fs-5">
          {`${firstCellLineItem.cellLineName} - ${firstCellLineItem.source}`}
        </div>
        {this.renderCreateSubSampleButton()}
        {this.renderDetailedInfoButton()}
        <ChevronIcon color="primary" direction={showEntries ? 'down' : 'right'} />
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
        key="detailedInfoButton"
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

    return (
      <OverlayTrigger
        key="subSampleButton"
        placement="top"
        overlay={(
          <Tooltip id="detailed-info-button">
            Create sample of cell line material
          </Tooltip>
        )}
      >
        <Button
          size="sm"
          onClick={(event) => {
            event.stopPropagation();

            const uri = isSync
              ? `/scollection/${currentCollection.id}/cell_line/new`
              : `/collection/${currentCollection.id}/cell_line/new`;
            Aviator.navigate(uri, { silent: true });

            const creationEvent = {
              type: 'cell_line',
              params:
              {
                collectionID: currentCollection.id,
                cell_lineID: 'new',
                cell_line_template: cellLineItems[0]
              }
            };
            elementShowOrNew(creationEvent);
          }}
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
      <div className="cell-line-group">
        <div
          className={this.getBorderStyle()}
          onClick={() => { this.setState({ showEntries: !showEntries }); }}
        >
          {this.renderNameHeader(cellLineItems[0])}
          {this.renderDetailedInfos(cellLineItems[0])}
        </div>
        {this.renderItemEntries(cellLineItems)}
      </div>
    );
  }
}

CellLineEntry.propTypes = {
  cellLineItems: PropTypes.arrayOf(
    CellLinePropTypeTableEntry
  ).isRequired,
  isElementSelected: PropTypes.func.isRequired,
  showDetails: PropTypes.func.isRequired,
};
