import React, { Component } from 'react';
import PropTypes from 'prop-types';
import Dropzone from 'react-dropzone';
import { FormGroup, Button, Row, Col, Tooltip, ControlLabel, ListGroup, ListGroupItem, OverlayTrigger } from 'react-bootstrap';
import { last, findKey, values } from 'lodash';
import EditorFetcher from '../fetchers/EditorFetcher';
import ImageModal from '../common/ImageModal';
import SpinnerPencilIcon from '../common/SpinnerPencilIcon';
import ImageEditModal from './ImageEditModal';
import { previewAttachmentImage } from './../utils/imageHelper';

const editorTooltip = exts => <Tooltip id="editor_tooltip">Available extensions: {exts}</Tooltip>;
const downloadTooltip = <Tooltip id="download_tooltip">Download attachment</Tooltip>;
const annotateTooltip = <Tooltip id="annotate_tooltip">Annotate image</Tooltip>;
const imageStyle = { position: 'absolute', width: 60, height: 60 };

export default class ResearchPlanDetailsAttachments extends Component {
  constructor(props) {
    super(props);
    const {
      attachments, onDrop, onDelete, onUndoDelete, onDownload, onEdit
    } = props;
    this.state = {
      onDrop,
      onDelete,
      onUndoDelete,
      onDownload,
      onEdit,
      attachmentEditor: false,
      extension: null,
      imageEditModalShown:false
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

  isImageFile(fileName){
    const acceptedImageTypes=["png","jpg","bmp","tif","svg","jpeg"];
    const dataType = last(fileName.split('.'));
    return acceptedImageTypes.includes(dataType);
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

  renderRemoveAttachmentButton(attachment) {
    const { onDelete } = this.state;
    return (
      <Button bsSize="xsmall" bsStyle="danger" className="button-right" onClick={() => onDelete(attachment)} disabled={this.props.readOnly}>
        <i className="fa fa-trash-o" aria-hidden="true" />
      </Button>
    );
  }

  renderImageEditModal(){
    const { onDrop } = this.state;
    const { onDelete } = this.state;
    return <ImageEditModal
    imageName={this.state.imageName}
    isShow={this.state.imageEditModalShown}
    handleSave={(f)=>{
      this.state.onDrop(f);
      this.setState({imageEditModalShown:false});
      onDelete(this.state.choosenAttachment)    
    }
    
    }
    handleOnClose={()=>{this.setState({imageEditModalShown:false})}}
    />    
  }

  renderAnnotateImageButton(attachment){
     if(!this.isImageFile(attachment.filename)){
       return null;
     }
     return (
      <OverlayTrigger placement="top" overlay={annotateTooltip} >
        <Button
        bsSize="xsmall"
        bsStyle="warning"
        className="button-right"
        onClick={() => {this.setState(
          {imageEditModalShown:true,
          choosenAttachment:attachment,
          imageName:attachment.filename})}}>
          <i className="fa fa-pencil" aria-hidden="true" />
        </Button>
      </OverlayTrigger>
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
                  previewObject={{
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
            {this.renderAnnotateImageButton(attachment)}
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
          </Col>
        </Row>
      </div>
    );
  }

  renderAttachments() {
    const { attachments } = this.props;
    if (attachments && attachments.length > 0) {
      return (
        <ListGroup>
          {attachments.map(attachment => (
            <ListGroupItem key={attachment.id}>
              {this.renderListGroupItem(attachment)}
            </ListGroupItem>
            ))}
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
            {this.renderImageEditModal()}                       
            {this.renderAttachments()}
            {this.renderDropzone()}
          </FormGroup>
        </Col>
      </Row>
       
    );
  }
}

ResearchPlanDetailsAttachments.propTypes = {
  attachments: PropTypes.array,
  onDrop: PropTypes.func.isRequired,
  onDelete: PropTypes.func.isRequired,
  onUndoDelete: PropTypes.func.isRequired,
  onDownload: PropTypes.func.isRequired,
  onEdit: PropTypes.func.isRequired,
  readOnly: PropTypes.bool.isRequired
};

ResearchPlanDetailsAttachments.defaultProps = {
  attachments: []
};
