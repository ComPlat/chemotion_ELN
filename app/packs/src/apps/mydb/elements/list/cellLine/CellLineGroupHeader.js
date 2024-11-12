import React, { Component } from 'react';
import UIStore from 'src/stores/alt/stores/UIStore';
import PropTypes from 'prop-types';
import { Button, OverlayTrigger, Tooltip } from 'react-bootstrap';
import { elementShowOrNew } from 'src/utilities/routesUtils';
import { CellLinePropTypeTableEntry } from 'src/models/cellLine/CellLinePropTypes';
import Aviator from 'aviator';
import ChevronIcon from 'src/components/common/ChevronIcon';

/* eslint-disable jsx-a11y/click-events-have-key-events */
/* eslint-disable jsx-a11y/no-static-element-interactions */

export default class CellLineGroupHeader extends Component {
  constructor(props) {
    super(props);
    this.state = {
      detailedInformation: false,
    };
  }

  renderNameHeader(firstCellLineItem) {
    const { show } = this.props;
    return (
      <div className="d-flex gap-2 align-items-center">
        <div className="flex-grow-1 fw-bold fs-5">
          {`${firstCellLineItem.cellLineName} - ${firstCellLineItem.source}`}
        </div>
        {this.renderCreateSubSampleButton()}
        {this.renderDetailedInfoButton()}
        <ChevronIcon color="primary" direction={show ? 'down' : 'right'} />
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
    const { currentCollection, isSync } = UIStore.getState();
    if (currentCollection.label === 'All') { return null; }
    if (currentCollection.is_sync_to_me && currentCollection.permission_level === 0) { return null; }

    const { element } = this.props;

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
                cell_line_template: element,
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
        <div className="property-key-minus floating">-</div>
        <div className="property-value">
          {propertyValue}
        </div>
      </div>
    );
  }

  render() {
    const { element, toggleGroup } = this.props;
    return (
      <tr className="cell-line-group">
        <td
          colSpan="5"
          className="list-container title-panel p-3"
          onClick={toggleGroup}
        >
          {this.renderNameHeader(element)}
          {this.renderDetailedInfos(element)}
        </td>
      </tr>
    );
  }
}

CellLineGroupHeader.propTypes = {
  group: PropTypes.string.isRequired,
  element: CellLinePropTypeTableEntry.isRequired,
  show: PropTypes.bool.isRequired,
  showDragColumn: PropTypes.bool.isRequired,
  toggleGroup: PropTypes.func.isRequired,
};
