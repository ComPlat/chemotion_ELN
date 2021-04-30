import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { Panel, ListGroup, ListGroupItem, Button, Tooltip, OverlayTrigger, Dropdown, MenuItem } from 'react-bootstrap';
// import Immutable from 'immutable';
import ElementCollectionLabels from '../ElementCollectionLabels';
import ElementActions from '../actions/ElementActions';
// import DetailActions from '../actions/DetailActions';
import ResearchPlansFetcher from '../fetchers/ResearchPlansFetcher';
import LoadingActions from '../actions/LoadingActions';
import ResearchPlan from '../models/ResearchPlan';
import ResearchPlanDetailsBody from './ResearchPlanDetailsBody';
import ResearchPlanDetailsName from './ResearchPlanDetailsName';

export default class ResearchPlanDetails extends Component {
  constructor(props) {
    super(props);
    const { researchPlan } = props;

    this.state = {
      researchPlan,
      update: false,
    };
    this.handleSwitchMode = this.handleSwitchMode.bind(this);
    this.handleResearchPlanChange = this.handleResearchPlanChange.bind(this);
    this.handleNameChange = this.handleNameChange.bind(this);
    this.handleBodyChange = this.handleBodyChange.bind(this);
    this.handleBodyAdd = this.handleBodyAdd.bind(this);
    this.handleSubmit = this.handleSubmit.bind(this);
  }

  componentWillReceiveProps(nextProps) {
    let { researchPlan } = nextProps;
    const rResearchPlan = new ResearchPlan(researchPlan);
    if (!(researchPlan instanceof ResearchPlan)) {
      researchPlan = rResearchPlan;
    }
    this.setState({ researchPlan });
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
  }

  // handle functions
  handleSubmit() {
    const { researchPlan } = this.state;
    LoadingActions.start();

    ElementActions.updateEmbeddedResearchPlan(researchPlan);
  }

  // handle name actions
  handleNameChange(value) {
    const { researchPlan } = this.state;
    researchPlan.changed = true;
    researchPlan.name = value;
    this.setState({ researchPlan });
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

  handleBodyDelete(id) {
    const { researchPlan } = this.state;
    const index = researchPlan.body.findIndex(field => field.id === id);
    researchPlan.body.splice(index, 1);
    researchPlan.changed = true;
    this.setState({ researchPlan });
  }

  handleExport(exportFormat) {
    const { researchPlan } = this.state;
    ResearchPlansFetcher.export(researchPlan, exportFormat);
  }

  handleExportField(field) {
    const { researchPlan } = this.props;
    ResearchPlansFetcher.exportTable(researchPlan, field);
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
            update={update}
            edit={edit}
          />
        </ListGroupItem>
      </ListGroup>
    );
  } /* eslint-enable */

  renderPanelHeading(researchPlan) {
    const { deleteResearchPlan } = this.props;
    const titleTooltip = `Created at: ${researchPlan.created_at} \n Updated at: ${researchPlan.updated_at}`;

    return (
      <Panel.Heading>
        <OverlayTrigger placement="bottom" overlay={<Tooltip id="rpDates">{titleTooltip}</Tooltip>}>
          <span>
            <i className="fa fa-file-text-o" />
            &nbsp; <span>{researchPlan.name}</span> &nbsp;
          </span>
        </OverlayTrigger>
        <ElementCollectionLabels element={researchPlan} placement="right" />
        <OverlayTrigger placement="bottom" overlay={<Tooltip id="remove_esearch_plan">Remove Research Plan from Screen</Tooltip>}>
          <Button bsStyle="danger" bsSize="xsmall" className="button-right" onClick={() => deleteResearchPlan(researchPlan.id)}>
            <i className="fa fa-trash-o" aria-hidden="true" />
          </Button>
        </OverlayTrigger>
        <OverlayTrigger placement="bottom" overlay={<Tooltip id="save_research_plan">Save Research Plan</Tooltip>}>
          <Button bsStyle="warning" bsSize="xsmall" className="button-right" onClick={() => this.handleSubmit()} style={{ display: (researchPlan.changed || false) ? '' : 'none' }}>
            <i className="fa fa-floppy-o" aria-hidden="true" />
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
      <Panel bsStyle={researchPlan.isPendingToSave ? 'info' : 'primary'} className="eln-panel-detail research-plan-details">
        {this.renderPanelHeading(researchPlan)}
        <Panel.Body>
          <div style={{ margin: '5px 0px 5px 5px' }}>
            {btnMode}
          </div>
          {this.renderResearchPlanMain(researchPlan, update)}
        </Panel.Body>
      </Panel>
    );
  }
}

ResearchPlanDetails.propTypes = {
  researchPlan: PropTypes.instanceOf(ResearchPlan).isRequired,
  deleteResearchPlan: PropTypes.func.isRequired,
};
