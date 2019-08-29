import React, { Component } from 'react';
import ReactDOM from "react-dom"
import PropTypes from 'prop-types';
import { Panel, ListGroup, ListGroupItem, ButtonToolbar, Button, Tooltip, OverlayTrigger, Row, Col, Tabs, Tab, Dropdown, MenuItem } from 'react-bootstrap';
import SVG from 'react-inlinesvg';
import { includes, last, findKey, values } from 'lodash';
import ElementCollectionLabels from '../ElementCollectionLabels';
import UIStore from '../stores/UIStore';
import UIActions from '../actions/UIActions';

import ElementActions from '../actions/ElementActions';
import DetailActions from '../actions/DetailActions';
import ResearchPlansFetcher from '../fetchers/ResearchPlansFetcher';
import ResearchPlansLiteratures from '../DetailsTabLiteratures';
import Attachment from '../models/Attachment';
import Utils from '../utils/Functions';
import LoadingActions from '../actions/LoadingActions';
import ConfirmClose from './common/ConfirmClose';

import ResearchPlanDetailsAttachments from './ResearchPlanDetailsAttachments';
import ResearchPlanDetailsBody from './ResearchPlanDetailsBody';
import ResearchPlanDetailsName from './ResearchPlanDetailsName';


export default class ResearchPlanDetails extends Component {
  constructor(props) {
    super(props);
    const { research_plan } = props;
    this.state = {
      research_plan,
      update: false
    };
    this.nameRef = React.createRef()
    this.bodyRef = React.createRef()
  }

  componentWillReceiveProps(nextProps) {
    const {research_plan} = nextProps;
    this.setState({ research_plan });
  }

  toggleFullScreen() {
    this.props.toggleFullScreen()

    // toogle update prop to notify react data grid for view change
    this.setState({ update: !this.state.update })
  }

  // handle functions

  handleSubmit() {
    const { research_plan } = this.state;
    LoadingActions.start();

    if (research_plan.isNew) {
      ElementActions.createResearchPlan(research_plan);
    } else {
      ElementActions.updateResearchPlan(research_plan);
    }

    if (research_plan.is_new) {
      const force = true;
      DetailActions.close(research_plan, force);
    }
  }

  handleSelect(eventKey) {
    UIActions.selectTab({tabKey: eventKey, type: 'screen'});
    this.setState({
      activeTab: eventKey
    })
  }

  // handle name actions

  handleNameChange(value) {
    let {research_plan} = this.state
    research_plan.changed = true
    research_plan.name = value

    this.setState({ research_plan });
  }

  // handle body actions

  handleBodyChange(value, id) {
    let {research_plan} = this.state
    let index = research_plan.body.findIndex(field => field.id == id)

    research_plan.body[index].value = value
    research_plan.changed = true

    this.setState({ research_plan });
  }

  handleBodyDrop(source, target) {
    let {research_plan} = this.state

    research_plan.body.splice(target, 0, research_plan.body.splice(source, 1)[0]);
    research_plan.changed = true

    this.setState({ research_plan });
  }

  handleBodyAdd(type) {
    let {research_plan} = this.state

    research_plan.addBodyField(type)
    research_plan.changed = true

    this.setState({ research_plan });
  }

  handleBodyDelete(id) {
    let {research_plan} = this.state
    let index = research_plan.body.findIndex(field => field.id == id)

    research_plan.body.splice(index, 1)
    research_plan.changed = true

    this.setState({ research_plan });
  }

  // handle attachment actions

  handleAttachmentDrop(files) {
    let { research_plan } = this.state;

    research_plan.changed = true;

    files.map(file => {
      let attachment = Attachment.fromFile(file)
      research_plan.attachments.push(attachment)
    })

    this.setState({ research_plan });
  }

  handleAttachmentDelete(attachment) {
    let { research_plan } = this.state;
    let index = research_plan.attachments.indexOf(attachment);

    research_plan.changed = true;
    research_plan.attachments[index].is_deleted = true;

    this.setState({ research_plan });
  }

  handleAttachmentUndoDelete(attachment) {
    let { research_plan } = this.state;
    let index = research_plan.attachments.indexOf(attachment);

    research_plan.attachments[index].is_deleted = false;

    this.setState({
      research_plan: research_plan
    });
  }

  handleAttachmentDownload(attachment) {
      Utils.downloadFile({contents: `/api/v1/attachments/${attachment.id}`, name: attachment.filename});
  }

  handleAttachmentEdit(attachment) {
    const { research_plan } = this.state;

    // update only this attachment
    research_plan.attachments.map((current_attachment) => {
      if (current_attachment.id === attachment.id) return attachment;
    })
    this.setState({ research_plan });
    this.forceUpdate();
  }

  handleExport(exportFormat) {
    const { research_plan } = this.state;
    const name = ReactDOM.findDOMNode(this.nameRef.current)
    const body = ReactDOM.findDOMNode(this.bodyRef.current)

    let html = name.innerHTML
    Array.from(body.getElementsByClassName('research-plan-field')).map(field => {
      const editors = field.getElementsByClassName('ql-editor')

      if (editors.length) {
        html += editors[0].innerHTML
      } else {
        html += field.innerHTML
      }
    })

    ResearchPlansFetcher.export(research_plan, html, exportFormat)
  }

  handleExportField(field) {
    const { research_plan } = this.props
    ResearchPlansFetcher.exportTable(research_plan, field)
  }

  // render functions

  renderExportButton(disabled) {
    return (
      <Dropdown id="research-plan-export-dropdown"
                className="research-plan-export-dropdown dropdown-right pull-right" disabled={disabled}>
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
    )
  }

  renderResearchPlanTab(research_plan, update) {
    const { name, body, attachments, changed } = research_plan

    return (
      <ListGroup fill="true">
        <ListGroupItem >
          {this.renderExportButton(changed)}

          <ResearchPlanDetailsName value={name}
              disabled={research_plan.isMethodDisabled('name')}
              onChange={this.handleNameChange.bind(this)}
              edit={false}
              ref={this.nameRef} />

          <ResearchPlanDetailsBody body={body}
              disabled={research_plan.isMethodDisabled('body')}
              onChange={this.handleBodyChange.bind(this)}
              onDrop={this.handleBodyDrop.bind(this)}
              onAdd={this.handleBodyAdd.bind(this)}
              onDelete={this.handleBodyDelete.bind(this)}
              onExport={this.handleExportField.bind(this)}
              update={update}
              edit={false}
              ref={this.bodyRef} />
        </ListGroupItem>
      </ListGroup>
    )
  }

  renderPropertiesTab(research_plan, update) {
    const { name, body, attachments } = research_plan

    return (
      <ListGroup fill="true">
        <ListGroupItem >
          <ResearchPlanDetailsName value={name}
              disabled={research_plan.isMethodDisabled('name')}
              onChange={this.handleNameChange.bind(this)}
              edit={true}
              ref={this.nameRef} />

          <ResearchPlanDetailsBody body={body}
              disabled={research_plan.isMethodDisabled('body')}
              onChange={this.handleBodyChange.bind(this)}
              onDrop={this.handleBodyDrop.bind(this)}
              onAdd={this.handleBodyAdd.bind(this)}
              onDelete={this.handleBodyDelete.bind(this)}
              onExport={this.handleExportField.bind(this)}
              update={update}
              edit={true}
              ref={this.bodyRef} />

          <ResearchPlanDetailsAttachments attachments={attachments}
              onDrop={this.handleAttachmentDrop.bind(this)}
              onDelete={this.handleAttachmentDelete.bind(this)}
              onUndoDelete={this.handleAttachmentUndoDelete.bind(this)}
              onDownload={this.handleAttachmentDownload.bind(this)}
              onEdit={this.handleAttachmentEdit.bind(this)}
              edit={true} />
        </ListGroupItem>
      </ListGroup>
    )
  }

  renderLiteratureTab(research_plan) {
    return (
      <ResearchPlansLiteratures
        element={research_plan}
      />
    )
  }

  renderPanelHeading(research_plan) {
    return (
      <Panel.Heading>
        <i className="fa fa-file-text-o" />
        &nbsp; <span>{research_plan.name}</span> &nbsp;
        <ElementCollectionLabels element={research_plan} placement="right"/>
        <OverlayTrigger placement="bottom"
                        overlay={<Tooltip id="closeresearch_plan">Close research_plan</Tooltip>}>

          <Button bsStyle="danger" bsSize="xsmall" className="button-right"
            onClick={() => DetailActions.close(research_plan)} >
            <i className="fa fa-times"></i>
          </Button>
        </OverlayTrigger>
        <OverlayTrigger placement="bottom"
                        overlay={<Tooltip id="saveresearch_plan">Save research_plan</Tooltip>}>

          <Button bsStyle="warning" bsSize="xsmall" className="button-right"
                  onClick={() => this.handleSubmit()}
                  style={{display: research_plan.changed ? '' : 'none'}} >
            <i className="fa fa-floppy-o "></i>
          </Button>
        </OverlayTrigger>
        <OverlayTrigger placement="bottom"
                        overlay={<Tooltip id="fullSample">Fullresearch_plan</Tooltip>}>

          <Button bsStyle="info" bsSize="xsmall" className="button-right"
            onClick={this.toggleFullScreen.bind(this)}>
            <i className="fa fa-expand"></i>
          </Button>
        </OverlayTrigger>
      </Panel.Heading>
    )
  }

  renderPanelBody(research_plan, update) {
    return (
      <Panel.Body>
        <Tabs activeKey={this.state.activeTab} onSelect={key => this.handleSelect(key)}
           id="screen-detail-tab">
          <Tab eventKey={0} title={'Research plan'}>
            {this.renderResearchPlanTab(research_plan, update)}
          </Tab>
          <Tab eventKey={1} title={'Properties'}>
            {this.renderPropertiesTab(research_plan, update)}
          </Tab>
          <Tab eventKey={2} title={'Literature'}>
            {this.renderLiteratureTab(research_plan)}
          </Tab>
        </Tabs>
        <ButtonToolbar>
          <Button bsStyle="primary" onClick={() => DetailActions.close(research_plan)}>Close</Button>
          <Button bsStyle="warning" onClick={() => this.handleSubmit()}>{research_plan.isNew ? "Create" : "Save"}</Button>
        </ButtonToolbar>
      </Panel.Body>
    )
  }

  render() {
    const { research_plan, update } = this.state;

    return (
      <Panel bsStyle={research_plan.isPendingToSave ? 'info' : 'primary'}
             className="panel-detail research-plan-details">
        {this.renderPanelHeading(research_plan)}
        {this.renderPanelBody(research_plan, update)}
      </Panel>
    );
  }
}

ResearchPlanDetails.propTypes = {
  research_plan: PropTypes.object,
  toggleFullScreen: PropTypes.func,
}
