import React, { Component } from 'react';
import PropTypes from 'prop-types';
import Dropzone from 'react-dropzone';
import {
  FormGroup, ControlLabel, FormControl, Panel, ListGroup, ListGroupItem,
  ButtonToolbar, Button, Tooltip, OverlayTrigger, Glyphicon, Row, Col, Tabs, Tab
} from 'react-bootstrap';
import SVG from 'react-inlinesvg';
import _ from 'lodash';
import ElementCollectionLabels from './ElementCollectionLabels';
import StructureEditorModal from './structure_editor/StructureEditorModal';
import UIStore from './stores/UIStore';
import UIActions from './actions/UIActions';

import ElementActions from './actions/ElementActions';
import DetailActions from './actions/DetailActions';
import ResearchPlansFetcher from './fetchers/ResearchPlansFetcher';
import ResearchPlansLiteratures from './DetailsTabLiteratures';
import QuillEditor from './QuillEditor';
import Attachment from './models/Attachment';
import Utils from './utils/Functions';

export default class ResearchPlanDetails extends Component {
  constructor(props) {
    super(props);
    const { research_plan } = props;
    this.state = {
      research_plan,
      activeTab: UIStore.getState().screen.activeTab,
      files: [],
      attachments: research_plan.attachments,
      showStructureEditor: false,
      loadingMolecule: false,
      attachmentEditor: false,
    };
  }

  componentWillReceiveProps(nextProps) {
    const {research_plan} = nextProps;
    this.setState({ research_plan });
  }

  svgOrLoading(research_plan) {
    let svgPath = '';
    if (this.state.loadingMolecule) {
      svgPath = '/images/wild_card/loading-bubbles.svg';
    } else {
      svgPath = research_plan.svgPath;
    }
    const className = svgPath ? 'svg-container' : 'svg-container-empty';
    const imageDefault = !_.includes(svgPath, 'no_image_180.svg');

    return (
      <div>
        <Panel defaultExpanded={imageDefault} style={{ border: '0px', backgroundColor: 'white' }}>
          <Panel.Heading style={{ border: '0px', backgroundColor: 'white' }}>
            <Panel.Title toggle>
              <OverlayTrigger
                placement="bottom"
                overlay={<Tooltip id="closeresearch_plan">Expand/Collapse Image</Tooltip>}
              >
                <Button
                  bsSize="xsmall"
                  className="button-right"
                >
                  <i className="fa fa-picture-o" />
                </Button>
              </OverlayTrigger>
            </Panel.Title>
          </Panel.Heading>
          <Panel.Collapse style={{ border: '0px', backgroundColor: 'white' }}>
            <Panel.Body>
              <div
                className={className}
                onClick={this.showStructureEditor.bind(this)}
              >
                <Glyphicon className="pull-right" glyph="pencil" />
                <SVG key={svgPath} src={svgPath} className="molecule-mid" />
              </div>
            </Panel.Body>
          </Panel.Collapse>
        </Panel>
      </div>
    );
  }

  handleStructureEditorSave(sdf_file, svg_file) {
    let {research_plan} = this.state;

    research_plan.sdf_file = sdf_file;

    this.setState({loadingMolecule: true});
    ResearchPlansFetcher.updateSVGFile(svg_file).then((json) => {
      research_plan.svg_file = json.svg_path;

      this.setState({research_plan: research_plan, loadingMolecule: false});

      this.hideStructureEditor();
    });
  }

  handleStructureEditorCancel() {
    this.hideStructureEditor()
  }

  structureEditorButton(isDisabled) {
    return (
      <Button onClick={this.showStructureEditor.bind(this)} disabled={isDisabled}>
        <Glyphicon glyph='pencil'/>
      </Button>
    )
  }

  structureEditorModal(research_plan) {
    const molfile = research_plan.sdf_file;
    return(
      <StructureEditorModal
        key={research_plan.id}
        showModal={this.state.showStructureEditor}
        onSave={this.handleStructureEditorSave.bind(this)}
        onCancel={this.handleStructureEditorCancel.bind(this)}
        molfile={molfile} />
    )
  }

  handleSubmit() {
    const { research_plan } = this.state;

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

  handleInputChange(type, event) {
    let {research_plan} = this.state;
    const value = event.target.value;
    switch (type) {
      case 'name':
        research_plan.name = value;
        break;
      case 'description':
        research_plan.description = value;
        break;
    }
    this.setState({
      research_plan: research_plan
    });
  }

  showStructureEditor() {
    this.setState({
      showStructureEditor: true
    });
  }

  hideStructureEditor() {
    this.setState({
      showStructureEditor: false
    });
  }

  researchPlanHeader(research_plan) {
    let saveBtnDisplay = research_plan.isEdited ? '' : 'none'

    return (
      <div>
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
                  style={{display: saveBtnDisplay}} >
            <i className="fa fa-floppy-o "></i>
          </Button>
        </OverlayTrigger>
        <OverlayTrigger placement="bottom"
            overlay={<Tooltip id="fullSample">Fullresearch_plan</Tooltip>}>
        <Button bsStyle="info" bsSize="xsmall" className="button-right"
          onClick={() => this.props.toggleFullScreen()}>
          <i className="fa fa-expand"></i>
        </Button>
        </OverlayTrigger>
      </div>
    )
  }

  researchPlanInfo(research_plan) {
    const style = {height: 'auto'};
    return (
      <Row style={style}>
        <Col md={2}>
          <h4>{research_plan.name}</h4>
        </Col>
        <Col md={10}>
          {this.svgOrLoading(research_plan)}
        </Col>
      </Row>
    )
  }


// http://localhost:3000/editor?fileName=sample.docx
// <a href="/docx?fileName=CHI20180920.docx" target="_blank" class="try-editor document">Document</a>
// <input type="file" id="fileupload" name="file" data-url="<%= upload_path %>" />
// <a href="/sample?fileExt=docx" target="_blank" class="try-editor document">Document</a>
  files() {
    return (
       <a href="/editor?fileName=sample.docx" target="_blank" class="try-editor document">Document</a>
    )
  }

  dropzone() {
    return (
      <Dropzone
        onDrop={files => this.handleFileDrop(files)}
        style={{ height: 50, width: '100%', border: '3px dashed lightgray' }}
      >
        <div style={{ textAlign: 'center', paddingTop: 12, color: 'gray' }}>
          Drop Files, or Click to Select.
        </div>
      </Dropzone>
    );
  }

  handleFileDrop(files) {
    const { research_plan } = this.state;
    const attachments = files.map(f => Attachment.fromFile(f));
    research_plan.attachments = research_plan.attachments.concat(attachments);
    this.setState({ research_plan });
  }

  handleUndo(attachment) {
    const { research_plan } = this.state;
    const index = research_plan.attachments.indexOf(attachment);

    research_plan.attachments[index].is_deleted = false;
    this.setState({ research_plan });
  }

  handleEdit(attachment) {
    const { research_plan } = this.state;

    this.setState({ research_plan });
  }

  attachments() {
    const { research_plan } = this.state;
    if (research_plan.attachments && research_plan.attachments.length > 0) {
      return (
        <ListGroup>
        {research_plan.attachments.map(attachment => {
          return (
            <ListGroupItem key={attachment.id}>
              {this.listGroupItem(attachment)}
            </ListGroupItem>
          )
        })}
        </ListGroup>
      );
    }
    return (
      <div style={{ padding: 5 }}>
        There are currently no Datasets.<br />
      </div>
    );
  }

  listGroupItem(attachment) {
    const { attachmentEditor } = this.state;

    if (attachment.is_deleted) {
      return (
        <div>
          <Row>
            <Col md={10}>
              <strike>{attachment.filename}</strike>
            </Col>
            <Col md={2}>
              <Button
                style={{ display: 'none' }}
                bsSize="xsmall"
                bsStyle="success"
                disabled
              >
                <i className="fa fa-pencil" />
              </Button>{' '}
              <Button
                bsSize="xsmall"
                bsStyle="danger"
                onClick={() => this.handleUndo(attachment)}
              >
                <i className="fa fa-undo" />
              </Button>
            </Col>
          </Row>
        </div>
      );
    }

    return (
      <div>
        <Row>
          <Col md={10}>
            <a onClick={() => this.handleAttachmentDownload(attachment)} style={{cursor: 'pointer'}}>{attachment.filename}</a>
          </Col>
          <Col md={2}>
            <Button
              style={{ display: 'none' }}
              bsSize="xsmall"
              bsStyle="success"
              disabled={!attachmentEditor || attachment.is_new}
              onClick={() => this.handleEdit(attachment)}
            >
              <i className="fa fa-pencil" />
            </Button>{' '}
            {this.removeAttachmentButton(attachment)}
          </Col>
        </Row>
      </div>
    );
  }

  handleAttachmentRemove(attachment) {
    const { research_plan } = this.state;
    const index = research_plan.attachments.indexOf(attachment);

    research_plan.attachments[index].is_deleted = true;
    this.setState({ research_plan });
  }

  removeAttachmentButton(attachment) {
    return (
      <Button bsSize="xsmall" bsStyle="danger" onClick={() => this.handleAttachmentRemove(attachment)}>
        <i className="fa fa-trash-o" />
      </Button>
    );
  }

  handleAttachmentDownload(attachment) {
      Utils.downloadFile({contents: `/api/v1/attachments/${attachment.id}`, name: attachment.filename});
  }


    propertiesTab(research_plan){
      const { name, description } = research_plan;
      const submitLabel = research_plan.isNew ? "Create" : "Save";

      return (

            <ListGroup fill>
              <ListGroupItem>
                <Row>
                  <Col md={4}>
                    <FormGroup>
                      <ControlLabel>Name</ControlLabel>
                      <FormControl
                        type="text"
                        value={name || ''}
                        onChange={event => this.handleInputChange('name', event)}
                        disabled={research_plan.isMethodDisabled('name')}
                      />
                    </FormGroup>
                  </Col>
                </Row>
                <Row>
                  <Col md={12}>
                    <FormGroup>
                      <ControlLabel>Description</ControlLabel>
                      <QuillEditor value={research_plan.description}
                        onChange={event => this.handleInputChange('description', {target: {value: event}})}
                        disabled={research_plan.isMethodDisabled('description')}
                      />
                    </FormGroup>
                  </Col>
                  <Col md={12}>
                    <FormGroup>
                      <ControlLabel>Files</ControlLabel>
                      {this.attachments()}
                      {this.dropzone()}
                    </FormGroup>
                  </Col>
                </Row>
              </ListGroupItem>
            </ListGroup>
      );
    }


    literatureTab(research_plan){
      const { name, description } = research_plan;
      const submitLabel = research_plan.isNew ? "Create" : "Save";

      return (
        <ResearchPlansLiteratures
          element={research_plan}
        />
      );
    }

    handleSelect(eventKey) {
      UIActions.selectTab({tabKey: eventKey, type: 'screen'});
      this.setState({
        activeTab: eventKey
      })
    }

  render() {
    const { research_plan } = this.state;
    const { name, description } = research_plan;

    const submitLabel = research_plan.isNew ? "Create" : "Save";

    return (
      <Panel bsStyle={research_plan.isPendingToSave ? 'info' : 'primary'}
             className="panel-detail">
        <Panel.Heading>{this.researchPlanHeader(research_plan)}</Panel.Heading>
        <Panel.Body>
        {this.researchPlanInfo(research_plan)}
          <Tabs activeKey={this.state.activeTab} onSelect={key => this.handleSelect(key)}
             id="screen-detail-tab">
            <Tab eventKey={0} title={'Properties'}>
              {this.propertiesTab(research_plan)}
            </Tab>
            <Tab eventKey={1} title={'Literatures'}>
              {this.literatureTab(research_plan)}
            </Tab>
          </Tabs>
          {this.structureEditorModal(research_plan)}
          <ButtonToolbar>
            <Button bsStyle="primary" onClick={() => DetailActions.close(research_plan)}>Close</Button>
            <Button bsStyle="warning" onClick={() => this.handleSubmit()}>{submitLabel}</Button>
          </ButtonToolbar>
        </Panel.Body>
      </Panel>
    );
  }
}

ResearchPlanDetails.propTypes = {
  research_plan: PropTypes.object,
  toggleFullScreen: PropTypes.func,
}
