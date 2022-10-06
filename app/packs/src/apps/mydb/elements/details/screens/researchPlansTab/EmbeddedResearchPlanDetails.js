import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { Panel, Label, ListGroup, ListGroupItem, Button, ButtonGroup, Tooltip, Overlay, OverlayTrigger, Dropdown, MenuItem } from 'react-bootstrap';
import Aviator from 'aviator';
import UIStore from 'src/stores/alt/stores/UIStore';
import { researchPlanShowOrNew } from 'src/utilities/routesUtils';
import ElementCollectionLabels from 'src/apps/mydb/elements/labels/ElementCollectionLabels';
import ResearchPlansFetcher from 'src/fetchers/ResearchPlansFetcher';
import ResearchPlan from 'src/models/ResearchPlan';
import ResearchPlanDetailsBody from 'src/apps/mydb/elements/details/researchPlans/researchPlanTab/ResearchPlanDetailsBody';
import ResearchPlanDetailsName from 'src/apps/mydb/elements/details/researchPlans/researchPlanTab/ResearchPlanDetailsName';
import { formatTimeStampsOfElement } from 'src/utilities/timezoneHelper';

const InfoLabel = ({ iconClass, text, style, tooltip }) => {
  style ||= 'info'
  if (!(iconClass && text)) { return null; }
  const icon = (<i className={`fa ${iconClass}`} />)
  const label = (
    <Label bsStyle={style} style={{ "margin-right": "1em" }} tooltip={tooltip}>
      {icon}
      {' ' + text}
    </Label>
  );
  if (tooltip) {
    return (
      <OverlayTrigger placement="bottom" overlay={<Tooltip>{tooltip}</Tooltip>}>
        {label}
      </OverlayTrigger>
    );
  } else {
    return label;
  }
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

  componentWillReceiveProps(nextProps) {
    let { researchPlan, expanded } = nextProps;
    if (!(researchPlan instanceof ResearchPlan)) {
      const rResearchPlan = new ResearchPlan(researchPlan);
      researchPlan = rResearchPlan;
    }
    this.setState({ researchPlan, expanded });
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
    const index = researchPlan.body.findIndex(field => field.id === id);
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
    const index = researchPlan.body.findIndex(field => field.id === id);
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

  openResearchPlan() {
    const { currentCollection, isShared } = UIStore.getState();
    const researchPlanID = this.state.researchPlan.id;
    const uri = `/${isShared ? 's' : ''}collection/${currentCollection.id}/research_plan/${researchPlanID}`;
    Aviator.navigate(uri, { silent: true });
    researchPlanShowOrNew({ params: { research_planID: researchPlanID } });
  }

  // render functions
  renderExportButton(disabled) {
    return (
      <Dropdown
        id="research-plan-export-dropdown"
        className="research-plan-export-dropdown dropdown-right pull-right"
        disabled={disabled}
      >
        <Dropdown.Toggle>
          Export
        </Dropdown.Toggle>
        <Dropdown.Menu>
          <MenuItem onSelect={() => this.handleExport('docx')}>
            as .docx
          </MenuItem>
          <MenuItem onSelect={() => this.handleExport('odt')}>
            as .odt
          </MenuItem>
          <MenuItem onSelect={() => this.handleExport('html')}>
            as HTML
          </MenuItem>
          <MenuItem onSelect={() => this.handleExport('markdown')}>
            as Markdown
          </MenuItem>
          <MenuItem onSelect={() => this.handleExport('latex')}>
            as LaTeX
          </MenuItem>
        </Dropdown.Menu>
      </Dropdown>
    );
  }

  renderResearchPlanMain(researchPlan, update) { /* eslint-disable react/jsx-no-bind */
    const { name, body, changed } = researchPlan;
    const edit = researchPlan.mode === 'edit';
    return (
      <ListGroup fill="true">
        <ListGroupItem >
          {this.renderExportButton(changed)}
          <ResearchPlanDetailsName
            value={name}
            disabled={researchPlan.isMethodDisabled('name')}
            onChange={this.handleNameChange}
            edit={edit}
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
        </ListGroupItem>
      </ListGroup>
    );
  } /* eslint-enable */

  handleCopyToMetadata(id, fieldName) {
    const { researchPlan } = this.state;
    const researchPlanMetadata = researchPlan.research_plan_metadata;
    const args = { research_plan_id: researchPlanMetadata.research_plan_id };
    const index = researchPlan.body.findIndex(field => field.id === id);
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

      const currentCollection = researchPlanMetadata[fieldName] ?
        researchPlanMetadata[fieldName] : [];
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
    const analyses_container = researchPlan.container.children.find(subcontainer => subcontainer.container_type == 'analyses')
    if (!analyses_container) { return; }
    if (analyses_container.children.length == 0) { return; }
    return analyses_container.children.length;
  }

  renderPanelHeading(researchPlan) {
    const { deleteResearchPlan, saveResearchPlan } = this.props;
    const titleTooltip = formatTimeStampsOfElement(researchPlan || {});
    const expandIconClass = this.state.expanded ? 'fa fa-compress' : 'fa fa-expand';

    const popover = (
      <Tooltip placement="left" className="in" id="tooltip-bottom">
        Remove {researchPlan.name} from Screen?<br />
        <ButtonGroup>
          <Button
            bsStyle="danger"
            bsSize="xsmall"
            onClick={() => deleteResearchPlan(researchPlan.id)}
          >Yes
          </Button>
          <Button
            bsStyle="warning"
            bsSize="xsmall"
            onClick={() => this.setState({ confirmRemove: false })}
          >No
          </Button>
        </ButtonGroup>
      </Tooltip>
    );

    return (
      <Panel.Heading>
        <OverlayTrigger placement="bottom" overlay={<Tooltip id="rpDates">{titleTooltip}</Tooltip>}>
          <span>
            <i className="fa fa-file-text-o" />
            &nbsp; <span>{researchPlan.name}</span> &nbsp;
          </span>
        </OverlayTrigger>

        <InfoLabel iconClass="fa-bar-chart" text={this.numberOfAnalyses(researchPlan)} tooltip="Analyses" />
        <InfoLabel iconClass="fa-file-text-o" text={researchPlan.attachmentCount} tooltip="Attachments" />
        <ElementCollectionLabels element={researchPlan} placement="right" />

        <OverlayTrigger placement="bottom" overlay={<Tooltip id="remove_esearch_plan">Remove Research Plan from Screen</Tooltip>}>
          <Button ref={(button) => { this.target = button; }} bsStyle="danger" bsSize="xsmall" className="button-right" onClick={() => this.setState({ confirmRemove: !this.state.confirmRemove })}>
            <i className="fa fa-trash-o" aria-hidden="true" />
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
        <OverlayTrigger placement="bottom" overlay={<Tooltip id="save_research_plan">Save Research Plan</Tooltip>}>
          <Button bsStyle="warning" bsSize="xsmall" className="button-right" onClick={() => saveResearchPlan(researchPlan)} style={{ display: (researchPlan.changed || false) ? '' : 'none' }}>
            <i className="fa fa-floppy-o" aria-hidden="true" />
          </Button>
        </OverlayTrigger>
        <OverlayTrigger placement="bottom" overlay={<Tooltip id="open_research_plan">Open Research Plan in Tab</Tooltip>}>
          <Button bsStyle="info" bsSize="xsmall" className="button-right" onClick={() => this.openResearchPlan()}>
            <i className="fa fa-window-maximize" aria-hidden="true" />
          </Button>
        </OverlayTrigger>
        <OverlayTrigger placement="bottom" overlay={<Tooltip id="expand_research_plan">Show/hide Research Plan details</Tooltip>}>
          <Button bsStyle="info" bsSize="xsmall" className="button-right" onClick={() => this.setState({ expanded: !this.state.expanded })}>
            <i className={expandIconClass} aria-hidden="true" />
          </Button>
        </OverlayTrigger>
      </Panel.Heading>
    );
  }

  render() {
    const { researchPlan, update } = this.state;
    let btnMode = <Button bsSize="xs" bsStyle="success" onClick={() => this.handleSwitchMode('edit')}>click to edit</Button>;
    if (researchPlan.mode !== 'view') {
      btnMode = <Button bsSize="xs" bsStyle="info" onClick={() => this.handleSwitchMode('view')}>click to view</Button>;
    }

    return (
      <Panel expanded={this.state.expanded} onToggle={() => {}} bsStyle={researchPlan.isPendingToSave ? 'info' : 'primary'} className="eln-panel-detail research-plan-details">
        {this.renderPanelHeading(researchPlan)}
        <Panel.Collapse>
          <Panel.Body>
            <div style={{ margin: '5px 0px 5px 5px' }}>
              {btnMode}
            </div>
            {this.renderResearchPlanMain(researchPlan, update)}
          </Panel.Body>
        </Panel.Collapse>
      </Panel>
    );
  }
}

EmbeddedResearchPlanDetails.propTypes = {
  researchPlan: PropTypes.instanceOf(ResearchPlan).isRequired,
  updateResearchPlan: PropTypes.func.isRequired,
  saveResearchPlan: PropTypes.func.isRequired,
  deleteResearchPlan: PropTypes.func.isRequired,
};
