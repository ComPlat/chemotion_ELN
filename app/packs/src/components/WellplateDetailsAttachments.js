import React, { Component } from 'react';
import PropTypes from 'prop-types';
import Dropzone from 'react-dropzone';
import { FormGroup, Button, ButtonGroup, Row, Col, Tooltip, ControlLabel, ListGroup, ListGroupItem, OverlayTrigger, Glyphicon, Popover, Overlay } from 'react-bootstrap';
import { last, findKey, values } from 'lodash';
import EditorFetcher from './fetchers/EditorFetcher';
import ImageModal from './common/ImageModal';
import SpinnerPencilIcon from './common/SpinnerPencilIcon';
import { previewAttachmentImage } from './utils/imageHelper';
import Utils from './utils/Functions';

const editorTooltip = exts => <Tooltip id="editor_tooltip">Available extensions: {exts}</Tooltip>;
const downloadTooltip = <Tooltip id="download_tooltip">Download attachment</Tooltip>;
const templateInfo = (
  <Popover id="popver-template-info" title="Template info">
    This template should be used to import well readouts.<br />
    The <strong>red</strong> column may not be altered at all.<br />
    The contents of the <strong>yellow</strong> columns may be altered, the headers may not.<br />
    The <strong>green</strong> columns must contain at least one <i>_Value</i> and <i>_Unit</i> pair
    with a matching prefix before the underscore.
    They may contain an arbitrary amount of readout pairs.
  </Popover>
);
const imageStyle = {
  style: {
    position: 'absolute',
    width: 60,
    height: 60
  }
};

export default class WellplateDetailsAttachments extends Component {
  constructor(props) {
    super(props);
    this.importButtonRefs = [];
    const {
      attachments, wellplateChanged, onDrop, onDelete, onUndoDelete, onDownload, onImport, onEdit
    } = props;
    this.state = {
      onDrop,
      onDelete,
      onUndoDelete,
      onDownload,
      onImport,
      onEdit,
      attachmentEditor: false,
      extension: null,
      showImportConfirm: [],
    };
    this.editorInitial = this.editorInitial.bind(this);
  }

  componentDidMount() {
    this.editorInitial();
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

  documentType(filename) {
    const { extension } = this.state;

    const ext = last(filename.split('.'));
    const docType = findKey(extension, o => o.includes(ext));

    if (typeof (docType) === 'undefined' || !docType) {
      return null;
    }

    return docType;
  }

  handleEdit(attachment) {
    const { onEdit } = this.state;
    const fileType = last(attachment.filename.split('.'));
    const docType = this.documentType(attachment.filename);

    EditorFetcher.startEditing({ attachment_id: attachment.id })
      .then((result) => {
        if (result.token) {
          const url = `/editor?id=${attachment.id}&docType=${docType}&fileType=${fileType}&title=${attachment.filename}&key=${result.token}`;
          window.open(url, '_blank');

          attachment.aasm_state = 'oo_editing';
          attachment.updated_at = new Date();

          onEdit(attachment);
        } else {
          alert('Unauthorized to edit this file.');
        }
      });
  }

  handleTemplateDownload() { // eslint-disable-line class-methods-use-this
    Utils.downloadFile({ contents: '/xlsx/wellplate_import_template.xlsx', name: 'wellplate_import_template.xlsx' });
  }

  showImportConfirm(attachmentId) {
    const { showImportConfirm } = this.state;
    showImportConfirm[attachmentId] = true;
    this.setState({ showImportConfirm });
  }

  hideImportConfirm(attachmentId) {
    const { showImportConfirm } = this.state;
    showImportConfirm[attachmentId] = false;
    this.setState({ showImportConfirm });
  }

  confirmAttachmentImport(attachment) {
    const { onImport } = this.state;
    onImport(attachment);
    this.hideImportConfirm(attachment.id);
  }

  renderImportAttachmentButton(attachment) {
    const show = this.state.showImportConfirm[attachment.id];
    const importDisabled = this.props.wellplateChanged;
    const extension = last(attachment.filename.split('.'));

    const importTooltip = importDisabled ?
      <Tooltip id="import_tooltip">Wellplate must be saved before import</Tooltip> :
      <Tooltip id="import_tooltip">Import attachment as Wellplate data</Tooltip>;

    const confirmTooltip = (
      <Tooltip placement="bottom" className="in" id="tooltip-bottom">
        Import data from Spreadsheet? This will overwrite existing Wellplate data.<br />
        <ButtonGroup>
          <Button
            bsStyle="danger"
            bsSize="xsmall"
            onClick={() => this.confirmAttachmentImport(attachment)}
          >
            Yes
          </Button>
          <Button
            bsStyle="warning"
            bsSize="xsmall"
            onClick={() => this.hideImportConfirm(attachment.id)}
          >
            No
          </Button>
        </ButtonGroup>
      </Tooltip>
    );

    if (extension === 'xlsx') {
      return (
        <div>
          <OverlayTrigger placement="top" overlay={importTooltip} >
            <div style={{ float: 'right' }}>
              <Button
                bsSize="xsmall"
                bsStyle="success"
                className="button-right"
                disabled={importDisabled}
                ref={(ref) => { this.importButtonRefs[attachment.id] = ref; }}
                style={importDisabled ? { pointerEvents: 'none' } : {}}
                onClick={() => this.showImportConfirm(attachment.id)}
              >
                <Glyphicon glyph="import" />
              </Button>
            </div>
          </OverlayTrigger>
          <Overlay
            show={show}
            placement="bottom"
            rootClose
            onHide={() => this.hideImportConfirm(attachment.id)}
            target={this.importButtonRefs[attachment.id]}
          >
            { confirmTooltip }
          </Overlay>

        </div>
      );
    }
    return true;
  }

  renderRemoveAttachmentButton(attachment) {
    const { onDelete } = this.state;

    return (
      <Button bsSize="xsmall" bsStyle="danger" className="button-right" onClick={() => onDelete(attachment)} disabled={this.props.readOnly}>
        <i className="fa fa-trash-o" aria-hidden="true" />
      </Button>
    );
  }

  renderListGroupItem(attachment) {
    const {
      attachmentEditor, extension, onUndoDelete, onDownload
    } = this.state;

    const updateTime = new Date(attachment.updated_at);
    updateTime.setTime(updateTime.getTime() + (15 * 60 * 1000));

    const hasPop = false;
    const fetchNeeded = false;
    const fetchId = attachment.id;

    const previewImg = previewAttachmentImage(attachment);
    const isEditing = attachment.aasm_state === 'oo_editing' && new Date().getTime() < updateTime;

    const docType = this.documentType(attachment.filename);
    const editDisable = !attachmentEditor || isEditing || attachment.is_new || docType === null;
    const styleEditorBtn = !attachmentEditor || docType === null ? 'none' : '';

    if (attachment.is_deleted) {
      return (
        <div>
          <Row>
            <Col md={1} />
            <Col md={9}>
              <strike>{attachment.filename}</strike>
            </Col>
            <Col md={2}>
              <Button
                bsSize="xsmall"
                bsStyle="danger"
                className="button-right"
                onClick={() => onUndoDelete(attachment)}
              >
                <i className="fa fa-undo" aria-hidden="true" />
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
            {this.renderRemoveAttachmentButton(attachment)}
            <OverlayTrigger placement="top" overlay={downloadTooltip} >
              <Button
                bsSize="xsmall"
                className="button-right"
                bsStyle="primary"
                onClick={() => onDownload(attachment)}
              >
                <i className="fa fa-download" aria-hidden="true" />
              </Button>
            </OverlayTrigger>
            <OverlayTrigger placement="left" overlay={editorTooltip(values(extension).join(','))} >
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
            {this.renderImportAttachmentButton(attachment)}
          </Col>
        </Row>
      </div>
    );
  }

  renderAttachments() {
    const { attachments } = this.props;
    if (attachments && attachments.length > 0) {
      return (
        <div>
          {this.renderTemplateDownload()}
          <ListGroup>
            {attachments.map(attachment => (
              <ListGroupItem key={attachment.id}>
                {this.renderListGroupItem(attachment)}
              </ListGroupItem>
              ))}
          </ListGroup>
        </div>
      );
    }
    return (
      <div>
        {this.renderTemplateDownload()}
        <div>
          There are currently no Datasets.<br />
        </div>
      </div>
    );
  }

  renderTemplateDownload() {
    return (
      <div style={{ marginBottom: '5px' }}>
        <Button
          bsStyle="primary"
          onClick={() => this.handleTemplateDownload()}
        >
          <i className="fa fa-download" aria-hidden="true" /> Download Wellplate import template xlsx
        </Button>
        <OverlayTrigger placement="bottom" overlay={templateInfo}>
          <Button
            bsStyle="info"
          >
            <i className="fa fa-info" aria-hidden="true" />
          </Button>
        </OverlayTrigger>
      </div>
    );
  }

  renderDropzone() {
    const { onDrop } = this.state;

    return (
      <div className={`research-plan-dropzone-${this.props.readOnly ? 'disable' : 'enable'}`}>
        <Dropzone
          onDrop={files => onDrop(files)}
          className="zone"
        >
          Drop Files, or Click to Select.
        </Dropzone>
      </div>
    );
  }

  render() {
    return (
      <Row>
        <Col md={12}>
          <FormGroup>
            <ControlLabel>Files</ControlLabel>
            {this.renderAttachments()}
            {this.renderDropzone()}
          </FormGroup>
        </Col>
      </Row>
    );
  }
}

WellplateDetailsAttachments.propTypes = {
  attachments: PropTypes.arrayOf(PropTypes.object).isRequired,
  wellplateChanged: PropTypes.bool.isRequired,
  onDrop: PropTypes.func.isRequired,
  onDelete: PropTypes.func.isRequired,
  onUndoDelete: PropTypes.func.isRequired,
  onDownload: PropTypes.func.isRequired,
  onImport: PropTypes.func.isRequired,
  onEdit: PropTypes.func.isRequired,
  readOnly: PropTypes.bool.isRequired
};

WellplateDetailsAttachments.defaultProps = {
};
