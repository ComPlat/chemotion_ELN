import React, { Component } from 'react'
import PropTypes from 'prop-types'
import Dropzone from 'react-dropzone'
import { FormGroup, Button, Row, Col, Tooltip, ControlLabel, ListGroup, ListGroupItem, OverlayTrigger } from 'react-bootstrap'
import { includes, last, findKey, values } from 'lodash'

import EditorFetcher from '../fetchers/EditorFetcher'
import ImageModal from '../common/ImageModal';
import SpinnerPencilIcon from '../common/SpinnerPencilIcon';


const editorTooltip = exts => <Tooltip id="editor_tooltip">Available extensions: {exts}</Tooltip>

const downloadTooltip = <Tooltip id="download_tooltip">Download attachment</Tooltip>

const imageStyle = {
  style: {
    position: 'absolute',
    width: 60,
    height: 60
  }
}

const previewImage = (attachment) => {
  const noAttSvg = '/images/wild_card/no_attachment.svg';
  if (attachment.thumb) {
    return `/images/thumbnail/${attachment.identifier}`;
  }
  return noAttSvg;
}

export default class ResearchPlanDetailsAttachments extends Component {

  constructor(props) {
    super(props);
    const { attachments, onDrop, onDelete, onUndoDelete, onDownload, onEdit } = props;
    this.state = {
      attachments,
      onDrop,
      onDelete,
      onUndoDelete,
      onDownload,
      onEdit,
      attachmentEditor: false,
      extension: null,
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

          onEdit(attachment)
        } else {
          alert('Unauthorized to edit this file.');
        }
      });
  }

  renderRemoveAttachmentButton(attachment) {
    const { onDelete } = this.state;

    return (
      <Button bsSize="xsmall" bsStyle="danger" className="button-right" onClick={() => onDelete(attachment)}>
        <i className="fa fa-trash-o" />
      </Button>
    );
  }

  renderListGroupItem(attachment) {
    const { attachmentEditor, extension, onUndoDelete, onDownload } = this.state;

    const updateTime = new Date(attachment.updated_at);
    updateTime.setTime(updateTime.getTime() + (15 * 60 * 1000));

    const hasPop = false;
    const fetchNeeded = false;
    const fetchId = attachment.id;

    const previewImg = previewImage(attachment);
    const isEditing = attachment.aasm_state === 'oo_editing' && new Date().getTime() < updateTime

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
                onClick={() => onUndoDelete(attachment)}
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
            {this.renderRemoveAttachmentButton(attachment)}
            <OverlayTrigger placement="top" overlay={downloadTooltip} >
            <Button
              bsSize="xsmall"
              className="button-right"
              bsStyle="primary"
              onClick={() => onDownload(attachment)}
            >
              <i className="fa fa-download" />
            </Button>
            </OverlayTrigger>
            <OverlayTrigger placement="left" overlay={editorTooltip(values(extension).join(','))} >
              <Button
                style={{ display: styleEditorBtn }}
                bsSize="xsmall"
                className="button-right"
                bsStyle="success"
                disabled={editDisable}
                onClick={() => this.handleEdit(attachment).bind(this)}
              >
                <SpinnerPencilIcon spinningLock={!attachmentEditor || isEditing} />
              </Button>
            </OverlayTrigger>

          </Col>
        </Row>
      </div>
    );
  }

  renderAttachments() {
    let { attachments } = this.state

    if (attachments && attachments.length > 0) {
      return (
        <ListGroup>
          {attachments.map(attachment => {
            return (
              <ListGroupItem key={attachment.id}>
                {this.renderListGroupItem(attachment)}
              </ListGroupItem>
            )
          })}
        </ListGroup>
      );
    }
    return (
      <div>
        There are currently no Datasets.<br />
      </div>
    );
  }

  renderDropzone() {
    let { onDrop } = this.state

    return (
      <Dropzone
        onDrop={files => onDrop(files)}
        style={{ height: 50, width: '100%', border: '3px dashed lightgray' }}
      >
        <div style={{ textAlign: 'center', paddingTop: 12, color: 'gray' }}>
          Drop Files, or Click to Select.
        </div>
      </Dropzone>
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
    )
  }

}

ResearchPlanDetailsAttachments.propTypes = {
  attachments: PropTypes.array,
  onDrop: PropTypes.func,
  onDelete: PropTypes.func,
  onUndoDelete: PropTypes.func,
  onDownload: PropTypes.func,
  onEdit: PropTypes.func
}
