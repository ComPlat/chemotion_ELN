/* eslint-disable react/forbid-prop-types */
import React, { Component } from 'react';
import PropTypes from 'prop-types';
import Dropzone from 'react-dropzone';
import {
  FormGroup,
  Button,
  Row,
  Col,
  Tooltip,
  ListGroup,
  ListGroupItem,
  OverlayTrigger,
} from 'react-bootstrap';
import { last, findKey, values } from 'lodash';
import EditorFetcher from 'src/fetchers/EditorFetcher';
import ImageModal from 'src/components/common/ImageModal';
import SpinnerPencilIcon from 'src/components/common/SpinnerPencilIcon';
import { previewContainerImage } from 'src/utilities/imageHelper';
import Utils from 'src/utilities/Functions';
import NotificationActions from 'src/stores/alt/actions/NotificationActions';
import ControlLabel from 'src/components/legacyBootstrap/ControlLabel'

const editorTooltip = (exts) => (
  <Tooltip id="editor_tooltip">
    Available extensions:
    {' '}
    {exts}
  </Tooltip>
);
const downloadTooltip = (
  <Tooltip id="download_tooltip">Download attachment</Tooltip>
);
const defaultImgStyle = { position: 'absolute', width: 60, height: 60 };

export default class GenericAttachments extends Component {
  constructor(props) {
    super(props);
    this.state = { attachmentEditor: false, extension: null };
    this.editorInitial = this.editorInitial.bind(this);
  }

  componentDidMount() {
    this.editorInitial();
  }

  handleEdit(att) {
    const { onEdit } = this.props;
    const attachment = att;
    const fileType = last(attachment.filename.split('.'));
    const docType = this.documentType(attachment.filename);
    EditorFetcher.startEditing({ attachment_id: attachment.id }).then(
      (result) => {
        if (result.token) {
          // eslint-disable-next-line max-len
          const url = `/editor?id=${attachment.id}&docType=${docType}&fileType=${fileType}&title=${attachment.filename}&key=${result.token}&only_office_token=${result.only_office_token}`;
          window.open(url, '_blank');
          attachment.aasm_state = 'oo_editing';
          attachment.updated_at = new Date();
          onEdit(attachment);
        } else {
          NotificationActions.add({
            message: 'Unauthorized to edit this file.',
            level: 'error',
            position: 'tc',
          });
        }
      }
    );
  }

  documentType(filename) {
    const { extension } = this.state;
    const ext = last(filename.split('.'));
    const docType = findKey(extension, (o) => o.includes(ext));
    if (typeof docType === 'undefined' || !docType) {
      return null;
    }
    return docType;
  }

  editorInitial() {
    EditorFetcher.initial().then((result) => {
      this.setState({
        attachmentEditor: result.installed,
        extension: result.ext,
      });
    });
  }

  renderRemoveAttachmentButton(attachment) {
    const { onDelete, readOnly } = this.props;
    return (
      <Button
        size="sm"
        variant="danger"
        onClick={() => onDelete(attachment, true)}
        disabled={readOnly}
      >
        <i className="fa fa-trash-o" aria-hidden="true" />
      </Button>
    );
  }

  renderListGroupItem(attachment) {
    const { attachmentEditor, extension } = this.state;
    const { onDelete } = this.props;
    const updateTime = new Date(attachment.updated_at);
    updateTime.setTime(updateTime.getTime() + 15 * 60 * 1000);
    const fetchId = attachment.id;
    const previewImg = typeof fetchId !== 'number'
      ? attachment.preview
      : previewContainerImage({
        preview_img: { preview: attachment?.thumbnail || 'not available' },
      });
    let imgStyle = { ...defaultImgStyle, cursor: 'pointer' };
    let hasPop = true;
    let fetchNeeded = true;
    if (
      previewImg.includes('/images/wild_card/not_available.svg')
      || typeof fetchId !== 'number'
    ) {
      imgStyle = defaultImgStyle;
      hasPop = false;
      fetchNeeded = false;
    }
    const isEditing = attachment.aasm_state === 'oo_editing'
      && new Date().getTime() < updateTime;
    const docType = this.documentType(attachment.filename);
    const editDisable = !attachmentEditor || isEditing || attachment.is_new || docType === null;
    const styleEditor = !attachmentEditor || docType === null ? 'none' : '';
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
                size="sm"
                variant="danger"
                onClick={() => onDelete(attachment, false)}
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
            <div
              className="analysis-header order"
              style={{ width: '60px', height: '60px' }}
            >
              <div
                className="preview"
                style={{ width: '60px', height: '60px' }}
              >
                <ImageModal
                  imageStyle={imgStyle}
                  hasPop={hasPop}
                  previewObject={{ src: previewImg }}
                  popObject={{
                    title: attachment.filename,
                    src: previewImg,
                    fetchNeeded,
                    fetchId,
                  }}
                />
              </div>
            </div>
          </Col>
          <Col md={9}>{attachment.filename}</Col>
          <Col md={2}>
            {this.renderRemoveAttachmentButton(attachment)}
            <OverlayTrigger placement="top" overlay={downloadTooltip}>
              <Button
                size="sm"
                variant="primary"
                onClick={() => Utils.downloadFile({
                  contents: `/api/v1/attachments/${attachment.id}`,
                  name: attachment.filename,
                })}
              >
                <i className="fa fa-download" aria-hidden="true" />
              </Button>
            </OverlayTrigger>
            <OverlayTrigger
              placement="left"
              overlay={editorTooltip(values(extension).join(','))}
            >
              <Button
                style={{ display: styleEditor }}
                size="sm"
                variant="success"
                disabled={editDisable}
                onClick={() => this.handleEdit(attachment)}
              >
                <SpinnerPencilIcon
                  spinningLock={!attachmentEditor || isEditing}
                />
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
          {attachments.map((attachment) => (
            <ListGroupItem key={attachment.id}>
              {this.renderListGroupItem(attachment)}
            </ListGroupItem>
          ))}
        </ListGroup>
      );
    }
    return (
      <div>
        There are currently no attachments.
        <br />
      </div>
    );
  }

  renderDropzone() {
    const { onDrop, readOnly } = this.props;
    return (
      <div
        className={`research-plan-dropzone-${
          readOnly ? 'disable' : 'enable'
        }`}
      >
        <Dropzone onDrop={(files) => onDrop(files)} className="zone">
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

GenericAttachments.propTypes = {
  attachments: PropTypes.arrayOf(PropTypes.object),
  onDrop: PropTypes.func.isRequired,
  onDelete: PropTypes.func.isRequired,
  onEdit: PropTypes.func.isRequired,
  readOnly: PropTypes.bool.isRequired,
};

GenericAttachments.defaultProps = { attachments: [] };
