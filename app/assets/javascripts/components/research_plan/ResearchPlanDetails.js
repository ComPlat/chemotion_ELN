import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { Panel, ListGroup, ListGroupItem, ButtonToolbar, Button, Tooltip, OverlayTrigger, Tabs, Tab, Dropdown, MenuItem } from 'react-bootstrap';
import ElementCollectionLabels from '../ElementCollectionLabels';
import UIActions from '../actions/UIActions';
import ElementActions from '../actions/ElementActions';
import DetailActions from '../actions/DetailActions';
import ResearchPlansFetcher from '../fetchers/ResearchPlansFetcher';
import ResearchPlansLiteratures from '../DetailsTabLiteratures';
import Attachment from '../models/Attachment';
import Utils from '../utils/Functions';
import LoadingActions from '../actions/LoadingActions';
import ConfirmClose from '../common/ConfirmClose';
import ResearchPlanDetailsAttachments from './ResearchPlanDetailsAttachments';
import ResearchPlanDetailsBody from './ResearchPlanDetailsBody';
import ResearchPlanDetailsName from './ResearchPlanDetailsName';
import ResearchPlanDetailsContainers from './ResearchPlanDetailsContainers';

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
    this.toggleFullScreen = this.toggleFullScreen.bind(this);
    this.handleNameChange = this.handleNameChange.bind(this);
    this.handleBodyChange = this.handleBodyChange.bind(this);
    this.handleBodyAdd = this.handleBodyAdd.bind(this);
  }

  componentWillReceiveProps(nextProps) {
    const { researchPlan } = nextProps;
    this.setState({ researchPlan });
  }

  toggleFullScreen() {
    this.props.toggleFullScreen();

    // toogle update prop to notify react data grid for view change
    this.setState({ update: !this.state.update });
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

    if (researchPlan.isNew) {
      ElementActions.createResearchPlan(researchPlan);
    } else {
      ElementActions.updateResearchPlan(researchPlan);
    }

    if (researchPlan.is_new) {
      const force = true;
      DetailActions.close(researchPlan, force);
    }
  }

  handleSelect(eventKey) {
    UIActions.selectTab({ tabKey: eventKey, type: 'screen' });
    this.setState({
      activeTab: eventKey
    });
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

  // handle attachment actions

  handleAttachmentDrop(files) {
    const { researchPlan } = this.state;
    researchPlan.changed = true;
    files.map((file) => {
      const attachment = Attachment.fromFile(file);
      researchPlan.attachments.push(attachment);
    });
    this.setState({ researchPlan });
  }

  handleAttachmentDelete(attachment) {
    const { researchPlan } = this.state;
    const index = researchPlan.attachments.indexOf(attachment);
    researchPlan.changed = true;
    researchPlan.attachments[index].is_deleted = true;
    this.setState({ researchPlan });
  }

  handleAttachmentUndoDelete(attachment) {
    const { researchPlan } = this.state;
    const index = researchPlan.attachments.indexOf(attachment);
    researchPlan.attachments[index].is_deleted = false;
    this.setState({ researchPlan });
  }

  handleAttachmentDownload(attachment) {
      Utils.downloadFile({contents: `/api/v1/attachments/${attachment.id}`, name: attachment.filename});
  }

  handleAttachmentEdit(attachment) {
    const { researchPlan } = this.state;

    // update only this attachment
    researchPlan.attachments.map((currentAttachment) => {
      if (currentAttachment.id === attachment.id) return attachment;
    });
    this.setState({ researchPlan });
    this.forceUpdate();
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

  renderResearchPlanMain(researchPlan, update) {
    return researchPlan.mode === 'edit' ? this.renderPropertiesTab(researchPlan, update) :
      this.renderResearchPlanTab(researchPlan, update);
  }

  renderResearchPlanTab(researchPlan, update) {
    const { name, body, changed } = researchPlan;
    return (
      <ListGroup fill="true">
        <ListGroupItem >
          {this.renderExportButton(changed)}
          <ResearchPlanDetailsName
            value={name}
            disabled={researchPlan.isMethodDisabled('name')}
            onChange={this.handleNameChange}
            edit={false}
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
            edit={false}
          />
        </ListGroupItem>
      </ListGroup>
    );
  }

  renderPropertiesTab(researchPlan, update) {
    const { name, body } = researchPlan;
    return (
      <ListGroup fill="true">
        <ListGroupItem >
          <ResearchPlanDetailsName
            value={name}
            disabled={researchPlan.isMethodDisabled('name')}
            onChange={this.handleNameChange}
            edit
          />
          <ResearchPlanDetailsBody
            body={body}
            disabled={researchPlan.isMethodDisabled('body')}
            onChange={this.handleBodyChange.bind(this)}
            onDrop={this.handleBodyDrop.bind(this)}
            onAdd={this.handleBodyAdd}
            onDelete={this.handleBodyDelete.bind(this)}
            onExport={this.handleExportField.bind(this)}
            update={update}
            edit
          />
        </ListGroupItem>
      </ListGroup>
    );
  }

  renderAnalysesTab(researchPlan) {
    return (
      <ListGroupItem style={{ paddingBottom: 20 }}>
        <ResearchPlanDetailsContainers researchPlan={researchPlan} readOnly={researchPlan.mode !== 'edit'} parent={this} />
      </ListGroupItem>
    );
  }

  renderAttachmentsTab(researchPlan) {
    const { attachments } = researchPlan;
    return (
      <ListGroup fill="true">
        <ListGroupItem >
          <ResearchPlanDetailsAttachments
            attachments={attachments}
            onDrop={this.handleAttachmentDrop.bind(this)}
            onDelete={this.handleAttachmentDelete.bind(this)}
            onUndoDelete={this.handleAttachmentUndoDelete.bind(this)}
            onDownload={this.handleAttachmentDownload.bind(this)}
            onEdit={this.handleAttachmentEdit.bind(this)}
            readOnly={researchPlan.mode !== 'edit'}
          />
        </ListGroupItem>
      </ListGroup>
    );
  }

  renderPanelHeading(researchPlan) {
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
        <ConfirmClose el={researchPlan} />
        <OverlayTrigger placement="bottom" overlay={<Tooltip id="saveresearch_plan">Save Research Plan</Tooltip>}>
          <Button bsStyle="warning" bsSize="xsmall" className="button-right" onClick={() => this.handleSubmit()} style={{ display: (researchPlan.changed || false) ? '' : 'none' }}>
            <i className="fa fa-floppy-o" aria-hidden="true" />
          </Button>
        </OverlayTrigger>
        <OverlayTrigger placement="bottom" overlay={<Tooltip id="fullSample">Fullresearch_plan</Tooltip>}>
          <Button bsStyle="info" bsSize="xsmall" className="button-right" onClick={this.toggleFullScreen}>
            <i className="fa fa-expand" aria-hidden="true" />
          </Button>
        </OverlayTrigger>
      </Panel.Heading>
    );
  }

  renderPanelBody(researchPlan, update) {
    let btnMode = <Button bsSize="xs" bsStyle="success" onClick={() => this.handleSwitchMode('edit')}>click to edit</Button>;
    if (researchPlan.mode !== 'view') {
      btnMode = <Button bsSize="xs" bsStyle="info" onClick={() => this.handleSwitchMode('view')}>click to view</Button>;
    }
    return (
      <Panel.Body>
        <Tabs activeKey={this.state.activeTab} onSelect={key => this.handleSelect(key)} id="screen-detail-tab">
          <Tab eventKey={0} title="Research plan">
            <div style={{ margin: '5px 0px 5px 5px' }}>
              {btnMode}
            </div>
            {this.renderResearchPlanMain(researchPlan, update)}
          </Tab>
          <Tab eventKey={1} title="Analyses">
            {this.renderAnalysesTab(researchPlan)}
          </Tab>
          <Tab eventKey={2} title="Attachments">
            {this.renderAttachmentsTab(researchPlan)}
          </Tab>
          <Tab eventKey={3} title="Literature">
            <ResearchPlansLiteratures element={researchPlan} />
          </Tab>
        </Tabs>
        <ButtonToolbar>
          <Button bsStyle="primary" onClick={() => DetailActions.close(researchPlan)}>Close</Button>
          {
            researchPlan.changed ? <Button bsStyle="warning" onClick={() => this.handleSubmit()}>{researchPlan.isNew ? 'Create' : 'Save'}</Button> : <div />
          }
        </ButtonToolbar>
      </Panel.Body>
    );
  }

  render() {
    const { researchPlan, update } = this.state;
    return (
      <Panel bsStyle={researchPlan.isPendingToSave ? 'info' : 'primary'} className="panel-detail research-plan-details">
        {this.renderPanelHeading(researchPlan)}
        {this.renderPanelBody(researchPlan, update)}
      </Panel>
    );
  }
}

ResearchPlanDetails.propTypes = {
  researchPlan: PropTypes.object.isRequired,
  toggleFullScreen: PropTypes.func.isRequired,
};
