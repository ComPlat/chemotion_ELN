/* eslint-disable react/destructuring-assignment */
import React, { Component } from 'react';
import PropTypes from 'prop-types';
import {
  Accordion, Button, ButtonGroup, Card, Tooltip, Overlay, OverlayTrigger,
} from 'react-bootstrap';
import Aviator from 'aviator';
import UIStore from 'src/stores/alt/stores/UIStore';
import { wellplateShowOrNew } from 'src/utilities/routesUtils';
import ElementCollectionLabels from 'src/apps/mydb/elements/labels/ElementCollectionLabels';
import ResearchPlan from 'src/models/ResearchPlan';
import Wellplate from 'src/models/Wellplate';
import { formatTimeStampsOfElement } from 'src/utilities/timezoneHelper';
import AccordionHeaderWithButtons from 'src/components/common/AccordionHeaderWithButtons';
import { AgGridReact } from 'ag-grid-react';

export default class EmbeddedWellplate extends Component {
  constructor(props) {
    super(props);

    this.state = {
      expanded: false,
      confirmRemove: false,
      showImportConfirm: false,
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

  showImportConfirm() {
    this.setState({ showImportConfirm: true });
  }

  hideImportConfirm() {
    this.setState({ showImportConfirm: false });
  }

  confirmWellplateImport() {
    const { importWellplate } = this.props;

    importWellplate(this.props.wellplate.id);
    this.hideImportConfirm();
  }

  renderImportWellplateButton() {
    const importDisabled = this.props.researchPlan.changed;
    const show = this.state.showImportConfirm;
    const tooltipText = importDisabled
      ? 'Please save the research plan before importing' : 'Import Wellplate data to ResearchPlan table';
    const importTooltip = <Tooltip id="import_tooltip">{tooltipText}</Tooltip>;

    const confirmTooltip = (
      <Tooltip placement="bottom" id="tooltip-bottom">
        Import data from Wellplate? This will create a table.
        <br />
        <ButtonGroup>
          <Button variant="success" size="sm" onClick={() => this.confirmWellplateImport()}>
            Yes
          </Button>
          <Button variant="warning" size="sm" onClick={() => this.hideImportConfirm()}>
            No
          </Button>
        </ButtonGroup>
      </Tooltip>
    );

    return ([
      <OverlayTrigger key="overlay_trigger_import_button" placement="bottom" overlay={importTooltip}>
        <Button
          size="sm"
          variant="success"
          disabled={importDisabled}
          ref={(button) => { this.target = button; }}
          onClick={() => this.showImportConfirm()}
        >
          <i className="fa fa-download" aria-hidden="true" />
        </Button>
      </OverlayTrigger>,
      <Overlay
        key="overlay_import_button"
        show={show}
        placement="bottom"
        rootClose
        onHide={() => this.hideImportConfirm()}
        target={this.target}
      >
        {confirmTooltip}
      </Overlay>
    ]);
  }

  renderSampleTitle(node) {
    const sample = node.data?.sample;
    if (!sample) { return null; }

    return `${sample.short_label} ${sample.name}`;
  }

  // eslint-disable-next-line class-methods-use-this
  renderWellplateMain(wellplate) {
    const { wells, readout_titles } = wellplate;

    // Wellplates that were just dragged in do not have samples assigned.
    // Saving the research plan and reloading it reloads the wellplates and fetches the samples as well
    if (wells.every((well) => well.is_new)) {
      return (<p>Please save the newly assigned wellplate to the research plan first</p>);
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
          valueSetter: (params) => {
            params.data.readouts[index].value = params.newValue;
            return true;
          },
          valueParser: (params) => {
            return params.newValue;
          },
        },
        {
          headerName: `${title} Unit`,
          valueGetter: (params) => {
            if (params.data?.readouts) {
              return params.data.readouts[index].unit;
            }
          },
          valueSetter: (params) => {
            params.data.readouts[index].unit = params.newValue;
            return true;
          },
          valueParser: (params) => {
            return params.newValue;
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
        />
      </div>
    );
  }

  renderPanelHeading(wellplate) {
    const { deleteWellplate } = this.props;
    const titleTooltip = formatTimeStampsOfElement(wellplate || {});

    const popover = (
      <Tooltip placement="left" id="tooltip-bottom">
        {`Remove ${wellplate.name} from Research Plan?`}
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
        overlay={<Tooltip id="remove_wellplate">Remove Wellplate from Research Plan</Tooltip>}
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

    return (
      <div className="d-flex align-items-center justify-content-between">
        <div className="d-flex align-items-center gap-2">
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
          {this.renderImportWellplateButton()}
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

EmbeddedWellplate.propTypes = {
  researchPlan: PropTypes.instanceOf(ResearchPlan).isRequired,
  wellplate: PropTypes.instanceOf(Wellplate).isRequired,
  wellplateIndex: PropTypes.number.isRequired,
  importWellplate: PropTypes.func.isRequired,
  deleteWellplate: PropTypes.func.isRequired,
};
