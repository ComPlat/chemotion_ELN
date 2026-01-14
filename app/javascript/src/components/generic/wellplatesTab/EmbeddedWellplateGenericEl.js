/* eslint-disable react/destructuring-assignment */
import React, { Component } from 'react';
import PropTypes from 'prop-types';
import {
  Accordion, Button, ButtonGroup, Card, Tooltip, Overlay, OverlayTrigger, Form,
} from 'react-bootstrap';
import Aviator from 'aviator';
import UIStore from 'src/stores/alt/stores/UIStore';
import { wellplateShowOrNew } from 'src/utilities/routesUtils';
import ElementCollectionLabels from 'src/apps/mydb/elements/labels/ElementCollectionLabels';
import Wellplate from 'src/models/Wellplate';
import { formatTimeStampsOfElement } from 'src/utilities/timezoneHelper';
import AccordionHeaderWithButtons from 'src/components/common/AccordionHeaderWithButtons';
import { AgGridReact } from 'ag-grid-react';

export default class EmbeddedWellplateGenericEl extends Component {
  constructor(props) {
    super(props);

    this.state = {
      confirmRemove: false,
    };
    this.renderWellplateMain = this.renderWellplateMain.bind(this);
  }

  openWellplate() {
    const { currentCollection, isSync } = UIStore.getState();
    const wellplateID = this.props.wellplate.id;
    const uri = `/${isSync ? 's' : ''}collection/${currentCollection.id}/wellplate/${wellplateID}`;
    Aviator.navigate(uri, { silent: true });
    wellplateShowOrNew({ params: { wellplateID } });
  }

  renderSampleTitle(node) {
    const sample = node.data?.sample;
    if (!sample) { return null; }

    return `${sample.short_label} ${sample.name}`;
  }

  // eslint-disable-next-line class-methods-use-this
  renderWellplateMain(wellplate) {
    const { wells, readout_titles } = wellplate;

    // Wellplates that were just dragged in do not have wells data
    if (!wells || wells.length === 0 || wells.every((well) => well.is_new)) {
      return (<p>Please save to load wellplate data.</p>);
    }

    const columnDefs = [
      {
        headerName: "Position",
        field: "alphanumericPosition",
        minWidth: 90,
        maxWidth: 90,
      },
      {
        headerName: "Sample",
        cellRenderer: this.renderSampleTitle,
        wrapText: true,
        cellClass: ["lh-base", "py-2", "border-end"],
      },
    ];

    readout_titles && readout_titles.map((title, index) => {
      columnDefs.push(
        {
          headerName: `${title} Value`,
          valueGetter: (params) => {
            if (params.data?.readouts) {
              return params.data.readouts[index].value;
            }
          },
        },
        {
          headerName: `${title} Unit`,
          valueGetter: (params) => {
            if (params.data?.readouts) {
              return params.data.readouts[index].unit;
            }
          },
        },
      );
    });

    const defaultColDef = {
      editable: false,
      flex: 1,
      wrapHeaderText: true,
      autoHeaderHeight: true,
      autoHeight: true,
      sortable: false,
      resizable: false,
      suppressMovable: true,
      cellClass: ["border-end"],
      headerClass: ["border-end"],
    };

    return (
      <div className="ag-theme-alpine">
        <AgGridReact
          columnDefs={columnDefs}
          defaultColDef={defaultColDef}
          rowData={wells}
          rowHeight="auto"
          domLayout="autoHeight"
          autoSizeStrategy={{ type: 'fitGridWidth' }}
        />
      </div>
    );
  }

  renderPanelHeading(wellplate) {
    const { deleteWellplate } = this.props;
    const titleTooltip = formatTimeStampsOfElement(wellplate || {});

    const popover = (
      <Tooltip placement="left" id="tooltip-bottom">
        {`Remove ${wellplate.name}?`}
        <br />
        <ButtonGroup>
          <Button variant="danger" size="sm" onClick={() => deleteWellplate(wellplate.id)}>
            Yes
          </Button>
          <Button variant="warning" size="sm" onClick={() => this.setState({ confirmRemove: false })}>
            No
          </Button>
        </ButtonGroup>
      </Tooltip>
    );

    const removeButton = (
      <OverlayTrigger
        placement="bottom"
        overlay={<Tooltip id="remove_wellplate">Remove Wellplate</Tooltip>}
      >
        <Button
          ref={(button) => { this.target = button; }}
          variant="danger"
          size="sm"
          onClick={() => this.setState({ confirmRemove: !this.state.confirmRemove })}
        >
          <i className="fa fa-trash-o" aria-hidden="true" />
        </Button>
      </OverlayTrigger>
    );

    const removeConfirmationOverlay = (
      <Overlay
        rootClose
        target={this.target}
        show={this.state.confirmRemove}
        placement="bottom"
        onHide={() => this.setState({ confirmRemove: false })}
      >
        {popover}
      </Overlay>
    );

    const openInTabButton = (
      <OverlayTrigger placement="bottom" overlay={<Tooltip id="open_wellplate">Open Wellplate in Tab</Tooltip>}>
        <Button variant="info" size="sm" onClick={() => this.openWellplate()}>
          <i className="fa fa-window-maximize" aria-hidden="true" />
        </Button>
      </OverlayTrigger>
    );

    const { isSelected, onSelect } = this.props;

    return (
      <div className="d-flex align-items-center justify-content-between">
        <div className="d-flex align-items-center gap-2">
          <Form.Check
            type="checkbox"
            checked={isSelected || false}
            onChange={(e) => onSelect(wellplate.id, e.target.checked)}
            onClick={(e) => e.stopPropagation()}
          />
          <OverlayTrigger placement="bottom" overlay={<Tooltip id="WellplateDatesx">{titleTooltip}</Tooltip>}>
            <span>
              <i className="icon-wellplate me-2" />
              <span>
                {`${wellplate.short_label} ${wellplate.name}`}
              </span>
            </span>
          </OverlayTrigger>
          <ElementCollectionLabels element={wellplate} placement="right" />
        </div>
        <div className="d-flex align-items-center gap-1">
          {removeButton}
          {removeConfirmationOverlay}
          {openInTabButton}
        </div>
      </div>
    );
  }

  render() {
    const eventKey = this.props.wellplateIndex.toString();
    const isFirstTab = this.props.wellplateIndex === 0;
    return (
      <Card className={`rounded-0 border-0${!isFirstTab ? ' border-top' : ''}`}>
        <Card.Header className="rounded-0 p-0 border-bottom-0">
          <AccordionHeaderWithButtons eventKey={eventKey}>
            {this.renderPanelHeading(this.props.wellplate)}
          </AccordionHeaderWithButtons>
        </Card.Header>
        <Accordion.Collapse eventKey={eventKey}>
          <Card.Body>
            {this.renderWellplateMain(this.props.wellplate)}
          </Card.Body>
        </Accordion.Collapse>
      </Card>
    );
  }
}

EmbeddedWellplateGenericEl.propTypes = {
  wellplate: PropTypes.instanceOf(Wellplate).isRequired,
  wellplateIndex: PropTypes.number.isRequired,
  deleteWellplate: PropTypes.func.isRequired,
  isSelected: PropTypes.bool,
  onSelect: PropTypes.func.isRequired,
};

EmbeddedWellplateGenericEl.defaultProps = {
  isSelected: false,
};
