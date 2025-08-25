/* eslint-disable react/destructuring-assignment */
import React, { Component } from 'react';
import PropTypes from 'prop-types';
import {
  Button, ButtonGroup, Tooltip, Overlay, OverlayTrigger, Dropdown,
  Card, Collapse, Container, Row, Col
} from 'react-bootstrap';
import ElementCollectionLabels from 'src/apps/mydb/elements/labels/ElementCollectionLabels';
import ResearchPlansFetcher from 'src/fetchers/ResearchPlansFetcher';
import ResearchPlan from 'src/models/ResearchPlan';
import ResearchPlanDetailsBody from
  'src/apps/mydb/elements/details/researchPlans/researchPlanTab/ResearchPlanDetailsBody';
import ResearchPlanDetailsName from
  'src/apps/mydb/elements/details/researchPlans/researchPlanTab/ResearchPlanDetailsName';
import { formatTimeStampsOfElement } from 'src/utilities/timezoneHelper';
import { aviatorNavigation } from 'src/utilities/routesUtils';

function InfoButton({ iconClass, text, style, tooltip }) {
  style ||= 'info';
  if (!(iconClass && text)) { return null; }

  const button = (
    <Button variant={style} size="xxsm" tooltip={tooltip}>
      <i className={`fa ${iconClass}`} />
      {` ${text}`}
    </Button>
  );
  if (tooltip) {
    return (
      <OverlayTrigger placement="bottom" overlay={<Tooltip>{tooltip}</Tooltip>}>
        {button}
      </OverlayTrigger>
    );
  }
  return button;
}


export default class EmbeddedResearchPlanDetails extends Component {
  constructor(props) {
    super(props);
    const { researchPlan, expanded } = props;

    this.state = {
      researchPlan,
      update: false,
      expanded: expanded || false,
      confirmRemove: false,
    };
    this.handleSwitchMode = this.handleSwitchMode.bind(this);
    this.handleResearchPlanChange = this.handleResearchPlanChange.bind(this);
    this.handleNameChange = this.handleNameChange.bind(this);
    this.handleBodyChange = this.handleBodyChange.bind(this);
    this.handleBodyAdd = this.handleBodyAdd.bind(this);
  }

  componentDidUpdate(prevProps) {
    let { researchPlan, expanded } = this.props;
    if (researchPlan !== prevProps.researchPlan) {
      if (!(researchPlan instanceof ResearchPlan)) {
        researchPlan = new ResearchPlan(researchPlan);
      }

      this.setState({ researchPlan, expanded });
    }

    if (expanded !== prevProps.expanded) {
      this.setState({ expanded });
    }
  }

  handleResearchPlanChange(el) {
    const researchPlan = el;
    researchPlan.changed = true;
    this.setState({ researchPlan });
  }

  handleSwitchMode(mode) {
    const { researchPlan } = this.state;
    researchPlan.mode = mode;
    this.setState({ researchPlan });
    this.handleUpdateResearchPlan();
  }

  // handle name actions
  handleNameChange(value) {
    const { researchPlan } = this.state;
    researchPlan.changed = true;
    researchPlan.name = value;
    this.setState({ researchPlan });
    this.handleUpdateResearchPlan();
  }

  // handle body actions
  handleBodyChange(value, id) {
    const { researchPlan } = this.state;
    const index = researchPlan.body.findIndex((field) => field.id === id);
    researchPlan.body[index].value = value;
    researchPlan.changed = true;
    this.setState({ researchPlan });
  }

  handleBodyDrop(source, target) {
    const { researchPlan } = this.state;
    researchPlan.body.splice(target, 0, researchPlan.body.splice(source, 1)[0]);
    researchPlan.changed = true;
    this.setState({ researchPlan });
  }

  handleBodyAdd(type) {
    const { researchPlan } = this.state;
    researchPlan.addBodyField(type);
    researchPlan.changed = true;
    this.setState({ researchPlan });
  }

  handleBodyDelete(id, attachments) {
    const { researchPlan } = this.state;
    const index = researchPlan.body.findIndex((field) => field.id === id);
    researchPlan.body.splice(index, 1);
    researchPlan.changed = true;
    this.setState({ researchPlan });
  }

  handleUpdateResearchPlan() {
    const { researchPlan } = this.state;
    const { updateResearchPlan } = this.props;
    updateResearchPlan(researchPlan);
  }

  handleExport(exportFormat) {
    const { researchPlan } = this.state;
    ResearchPlansFetcher.export(researchPlan, exportFormat);
  }

  handleExportField(field) {
    const { researchPlan } = this.props;
    ResearchPlansFetcher.exportTable(researchPlan, field);
  }

  handleCopyToMetadata(id, fieldName) {
    const { researchPlan } = this.state;
    const researchPlanMetadata = researchPlan.research_plan_metadata;
    if (!researchPlanMetadata) { return null; }

    const args = { research_plan_id: researchPlanMetadata.research_plan_id };
    const index = researchPlan.body.findIndex((field) => field.id === id);
    const value = researchPlan.body[index]?.value?.ops[0]?.insert?.trim() || '';
    if (fieldName === 'name') {
      researchPlanMetadata.title = researchPlan.name;
      args.title = researchPlan.name.trim();
    } else if (fieldName === 'subject') {
      researchPlanMetadata.subject = value;
      args.subject = value;
    } else {
      const type = researchPlan.body[index]?.title?.trim() || '';
      const newItem = this.newItemByType(fieldName, value, type);

      const currentCollection = researchPlanMetadata[fieldName]
        ? researchPlanMetadata[fieldName] : [];
      const newCollection = currentCollection.concat(newItem);
      researchPlanMetadata[fieldName] = newCollection;
      args[`${fieldName}`] = researchPlanMetadata[fieldName];
    }

    ResearchPlansFetcher.postResearchPlanMetadata(args).then((result) => {
      if (result.error) {
        alert(result.error);
      }
    });
  }

  numberOfAnalyses(researchPlan) {
    if (!researchPlan.container) { return; }
    const analyses_container = researchPlan.container.children
      .find((subcontainer) => subcontainer.container_type == 'analyses');
    if (!analyses_container) { return; }
    if (analyses_container.children.length == 0) { return; }
    return analyses_container.children.length;
  }

  renderResearchPlanMain(researchPlan, update) { /* eslint-disable react/jsx-no-bind */
    const { name, body, changed } = researchPlan;
    const edit = researchPlan.mode === 'edit';
    return (
      <Container>
        <Row>
          <Col>
            {this.renderExportButton(changed)}
            <ResearchPlanDetailsName
              value={name}
              disabled={researchPlan.isMethodDisabled('name')}
              onChange={this.handleNameChange}
              edit={edit}
              onCopyToMetadata={this.handleCopyToMetadata.bind(this)}
            />
            <ResearchPlanDetailsBody
              body={body}
              disabled={researchPlan.isMethodDisabled('body')}
              onChange={this.handleBodyChange}
              onDrop={this.handleBodyDrop.bind(this)}
              onAdd={this.handleBodyAdd}
              onDelete={this.handleBodyDelete.bind(this)}
              onExport={this.handleExportField.bind(this)}
              onCopyToMetadata={this.handleCopyToMetadata.bind(this)}
              update={update}
              edit={edit}
              researchPlan={researchPlan}
            />
          </Col>
        </Row>
      </Container>
    );
  } /* eslint-enable */

  // render functions
  renderExportButton(disabled) {
    // className="research-plan-export-dropdown dropdown-right pull-right"
    return (
      <Dropdown
        id="research-plan-export-dropdown"
        disabled={disabled}
      >
        <Dropdown.Toggle variant="outline-dark" className="float-end">
          Export
        </Dropdown.Toggle>
        <Dropdown.Menu>
          <Dropdown.Item onClick={() => this.handleExport('docx')}>
            as .docx
          </Dropdown.Item>
          <Dropdown.Item onClick={() => this.handleExport('odt')}>
            as .odt
          </Dropdown.Item>
          <Dropdown.Item onClick={() => this.handleExport('html')}>
            as HTML
          </Dropdown.Item>
          <Dropdown.Item onClick={() => this.handleExport('markdown')}>
            as Markdown
          </Dropdown.Item>
          <Dropdown.Item onClick={() => this.handleExport('latex')}>
            as LaTeX
          </Dropdown.Item>
        </Dropdown.Menu>
      </Dropdown>
    );
  }

  renderCardHeader(researchPlan) {
    const { deleteResearchPlan, saveResearchPlan } = this.props;
    const titleTooltip = formatTimeStampsOfElement(researchPlan || {});
    const expandIconClass = this.state.expanded ? 'fa fa-compress' : 'fa fa-expand';

    const popover = (
      <Tooltip placement="left" className="in" id="tooltip-bottom">
        Remove {researchPlan.name} from Screen?
        <br />
        <ButtonGroup>
          <Button
            variant="danger"
            size="sm"
            onClick={() => deleteResearchPlan(researchPlan.id)}
          >
            Yes
          </Button>
          <Button
            variant="warning"
            size="sm"
            onClick={() => this.setState({ confirmRemove: false })}
          >
            No
          </Button>
        </ButtonGroup>
      </Tooltip>
    );

    return (
      <div className='d-flex align-items-center justify-content-between'>
        <div className='d-flex align-items-center gap-2'>
          <OverlayTrigger placement="bottom" overlay={<Tooltip id="rpDates">{titleTooltip}</Tooltip>}>
            <span>
              <i className="fa fa-file-text-o me-1" />
              {researchPlan.name}
            </span>
          </OverlayTrigger>
          <InfoButton iconClass="fa-bar-chart" text={this.numberOfAnalyses(researchPlan)} tooltip="Analyses" />
          <InfoButton iconClass="fa-file-text-o" text={researchPlan.attachmentCount} tooltip="Attachments" />
          <ElementCollectionLabels element={researchPlan} placement="right" />
        </div>
        <div className='d-flex align-items-center gap-1'>
          <OverlayTrigger
            placement="bottom"
            overlay={<Tooltip id="expand_research_plan">Show/hide Research Plan details</Tooltip>}
          >
            <Button
              variant="info"
              size="xxsm"
              onClick={() => this.setState({ expanded: !this.state.expanded })}
            >
              <i className={expandIconClass} aria-hidden="true" />
            </Button>
          </OverlayTrigger>
          <OverlayTrigger
            placement="bottom"
            overlay={<Tooltip id="open_research_plan">Open Research Plan in Tab</Tooltip>}
          >
            <Button
              variant="info"
              size="xxsm"
              onClick={() => aviatorNavigation('research_plan', this.state.researchPlan.id, true, true)}>
              <i className="fa fa-window-maximize" aria-hidden="true" />
            </Button>
          </OverlayTrigger>
          <OverlayTrigger placement="bottom" overlay={<Tooltip id="save_research_plan">Save Research Plan</Tooltip>}>
            <Button
              variant="warning"
              size="xxsm"
              onClick={() => saveResearchPlan(researchPlan)}
              style={{ display: (researchPlan.changed || false) ? 'block' : 'none' }}
            >
              <i className="fa fa-floppy-o" aria-hidden="true" />
            </Button>
          </OverlayTrigger>
          <Overlay
            rootClose
            target={this.target}
            show={this.state.confirmRemove}
            placement="bottom"
            onHide={() => this.setState({ confirmRemove: false })}
          >
            {popover}
          </Overlay>
          <OverlayTrigger
            placement="bottom"
            overlay={<Tooltip id="remove_esearch_plan">Remove Research Plan from Screen</Tooltip>}
          >
            <Button
              ref={(button) => { this.target = button; }}
              variant="danger"
              size="xxsm"
              onClick={() => this.setState({ confirmRemove: !this.state.confirmRemove })}
            >
              <i className="fa fa-trash-o" aria-hidden="true" />
            </Button>
          </OverlayTrigger>
        </div>
      </div>
    );
  }

  render() {
    const { researchPlan, update } = this.state;
    let btnMode = (
      <Button
        size="sm"
        variant="success"
        className="mb-4"
        onClick={() => this.handleSwitchMode('edit')}
      >
        click to edit
      </Button>
    );
    if (researchPlan.mode !== 'view') {
      btnMode = (
        <Button
          size="sm"
          variant="info"
          className="mb-4"
          onClick={() => this.handleSwitchMode('view')}
        >
          click to view
        </Button>
      );
    }

    // className="detail-card research-plan-details"
    return (
      <Card className={"mb-4 detail-card rounded-0" + (researchPlan.isPendingToSave ? " detail-card--unsaved" : "")}>
        <Card.Header className="rounded-0">
          {this.renderCardHeader(researchPlan)}
        </Card.Header>
        <Collapse in={this.state.expanded}>
          <Card.Body>
            {btnMode}
            {this.renderResearchPlanMain(researchPlan, update)}
          </Card.Body>
        </Collapse>
      </Card>
    );
  }
}

EmbeddedResearchPlanDetails.propTypes = {
  researchPlan: PropTypes.instanceOf(ResearchPlan).isRequired,
  updateResearchPlan: PropTypes.func.isRequired,
  saveResearchPlan: PropTypes.func.isRequired,
  deleteResearchPlan: PropTypes.func.isRequired,
};
