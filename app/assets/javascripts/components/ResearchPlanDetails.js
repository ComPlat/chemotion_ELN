import React, { Component } from 'react';
import PropTypes from 'prop-types';
import Dropzone from 'react-dropzone';
import {
  FormGroup, ControlLabel, FormControl, Panel, ListGroup, ListGroupItem,
  ButtonToolbar, Button, Tooltip, OverlayTrigger, Glyphicon, Row, Col, Tabs, Tab
} from 'react-bootstrap';
import SVG from 'react-inlinesvg';
import { includes, last, findKey, values } from 'lodash';
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
import EditorFetcher from './fetchers/EditorFetcher';
import SpinnerPencilIcon from './common/SpinnerPencilIcon';
import ImageModal from './common/ImageModal';
import LoadingActions from './actions/LoadingActions';

const editorTooltip = exts => <Tooltip id="editor_tooltip">Available extensions: {exts}</Tooltip>;

const downloadTooltip = <Tooltip id="download_tooltip">Download attachment</Tooltip>;

const imageStyle = {
  style: {
    position: 'absolute',
    width: 60,
    height: 60
  }
};

const previewImage = (attachment) => {
  const noAttSvg = '/images/wild_card/no_attachment.svg';
  if (attachment.thumb) {
    return `/images/thumbnail/${attachment.identifier}`;
  }
  return noAttSvg;
};

export default class ResearchPlanDetails extends Component {
  constructor(props) {
    super(props);
    const { research_plan } = props;
    this.state = {
      research_plan,
      showStructureEditor: false,
      loadingMolecule: false,
      attachmentEditor: false,
      extension: null
    };
    this.editorInitial = this.editorInitial.bind(this);
  }

  componentDidMount() {
    this.editorInitial();

  }

  componentWillReceiveProps(nextProps) {
    const {research_plan} = nextProps;
    this.setState({ research_plan });
  }

  editorInitial() {
    EditorFetcher.initial()
      .then((result) => {
        this.setState({
          attachmentEditor: result.installed,
          extension: result.ext
        });
      });
  }

  svgOrLoading(research_plan) {
    let svgPath = '';
    if (this.state.loadingMolecule) {
      svgPath = '/images/wild_card/loading-bubbles.svg';
    } else {
      svgPath = research_plan.svgPath;
    }
    const className = svgPath ? 'svg-container' : 'svg-container-empty';
    const imageDefault = !includes(svgPath, 'no_image_180.svg');

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

  handleStructureEditorSave(sdf_file, svg_file, config = null) {
    let {research_plan} = this.state;
    research_plan.changed = true;
    research_plan.sdf_file = sdf_file;
    const smiles = config ? config.smiles : null;

    this.setState({loadingMolecule: true});

    const isChemdraw = smiles ? true : false

    ResearchPlansFetcher.updateSVGFile(svg_file, isChemdraw).then((json) => {
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

  documentType(filename) {
    const { extension } = this.state;
    const ext = last(filename.split('.'));
    const docType = findKey(extension, o => o.includes(ext));
    if (typeof (docType) === 'undefined' || !docType) {
      return null;
    }
    return docType;
  }

  handleInputChange(type, event) {
    let {research_plan} = this.state;
    research_plan.changed = true;
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
    let saveBtnDisplay = research_plan.changed ? '' : 'none';
    const titleTooltip = `Created at: ${research_plan.created_at} \n Updated at: ${research_plan.updated_at}`;

    return (
      <div>
        <OverlayTrigger placement="bottom" overlay={<Tooltip id="rpDates">{titleTooltip}</Tooltip>}>
          <span>
            <i className="fa fa-file-text-o" />
            &nbsp; <span>{research_plan.name}</span> &nbsp;
          </span>
        </OverlayTrigger>
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
    research_plan.changed = true;
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

    const fileType = last(attachment.filename.split('.'));
    const docType = this.documentType(attachment.filename);

    EditorFetcher.startEditing({ attachment_id: attachment.id })
      .then((result) => {
        if (result.token) {
          const url = `/editor?id=${attachment.id}&docType=${docType}&fileType=${fileType}&title=${attachment.filename}&key=${result.token}`;
          window.open(url, '_blank');
          attachment.aasm_state = 'oo_editing';
          attachment.updated_at = new Date();
          research_plan.attachments.map((a) => {
            if (a.id === attachment.id) return attachment;
          })
          this.setState({ research_plan });
          this.forceUpdate();
        } else {
          alert('Unauthorized to edit this file.');
        }
      });

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
    const updateTime = new Date(attachment.updated_at);
    updateTime.setTime(updateTime.getTime() + (15 * 60 * 1000));

    const hasPop = false;
    const fetchNeeded = false;
    const fetchId = attachment.id;

    const previewImg = previewImage(attachment);
    const isEditing = attachment.aasm_state === 'oo_editing' && new Date().getTime() < updateTime
    const { attachmentEditor } = this.state;
    const docType = this.documentType(attachment.filename);
    const editDisable = !attachmentEditor || isEditing || attachment.is_new || docType === null
    const styleEditorBtn = !attachmentEditor || docType === null ? 'none' : ''

    if (attachment.is_deleted) {
      return (
        <div>
          <Row>
            <Col md={10}>
              <strike>{attachment.filename}</strike>
            </Col>
            <Col md={2}>
              <Button
                bsSize="xsmall"
                bsStyle="success"
                disabled
              >
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
          <Col md={1}>
            <div className="analysis-header order" style={{ width: '60px', height: '60px' }}>
              <div className="preview" style={{ width: '60px', height: '60px' }} >
                <ImageModal
                  imageStyle={imageStyle}
                  hasPop={hasPop}
                  preivewObject={{
                    src: previewImg
                  }}
                  popObject={{
                    title: attachment.filename,
                    src: previewImg,
                    fetchNeeded,
                    fetchId
                  }}
                />
              </div>
            </div>
          </Col>
          <Col md={9}>
            {attachment.filename}
          </Col>
          <Col md={2}>
            {this.removeAttachmentButton(attachment)}
            <OverlayTrigger placement="top" overlay={downloadTooltip} >
            <Button
              bsSize="xsmall"
              className="button-right"
              bsStyle="primary"
              onClick={() => this.handleAttachmentDownload(attachment)}
            >
              <i className="fa fa-download" />
            </Button>
            </OverlayTrigger>
            <OverlayTrigger placement="left" overlay={editorTooltip(values(this.state.extension).join(','))} >
              <Button
                style={{ display: styleEditorBtn }}
                bsSize="xsmall"
                className="button-right"
                bsStyle="success"
                disabled={editDisable}
                onClick={() => this.handleEdit(attachment)}
              >
                <SpinnerPencilIcon spinningLock={!attachmentEditor || isEditing} />
              </Button>
            </OverlayTrigger>

          </Col>
        </Row>
      </div>
    );
  }

  handleAttachmentRemove(attachment) {
    const { research_plan } = this.state;
    const index = research_plan.attachments.indexOf(attachment);
    research_plan.changed = true;
    research_plan.attachments[index].is_deleted = true;
    this.setState({ research_plan });
  }

  removeAttachmentButton(attachment) {
    return (
      <Button bsSize="xsmall" bsStyle="danger" className="button-right" onClick={() => this.handleAttachmentRemove(attachment)}>
        <i className="fa fa-trash-o" />
      </Button>
    );
  }

  handleAttachmentDownload(attachment) {
      Utils.downloadFile({contents: `/api/v1/attachments/${attachment.id}`, name: attachment.filename});
  }


  propertiesTab(research_plan) {
    const { name, description } = research_plan;
    const submitLabel = research_plan.isNew ? "Create" : "Save";
    return (
      <ListGroup fill="true">
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
            <Tab eventKey={1} title={'Literature'}>
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
