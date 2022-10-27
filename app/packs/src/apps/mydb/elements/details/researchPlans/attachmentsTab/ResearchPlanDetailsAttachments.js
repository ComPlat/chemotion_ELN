import Dropzone from 'react-dropzone';
import EditorFetcher from 'src/fetchers/EditorFetcher';
import ElementActions from 'src/stores/alt/actions/ElementActions';
import ImageModal from 'src/components/common/ImageModal';
import LoadingActions from 'src/stores/alt/actions/LoadingActions';
import PropTypes from 'prop-types';
import React, { Component } from 'react';
import {
  Button, ButtonGroup,
  Col, ControlLabel,
  FormGroup,
  Glyphicon,
  ListGroup, ListGroupItem,
  Overlay, OverlayTrigger,
  Row,
  Tooltip
} from 'react-bootstrap';
import { last, findKey, values } from 'lodash';
import AttachmentFetcher from 'src/fetchers/AttachmentFetcher';
import AttachmentEditButton from 'src/apps/mydb/elements/details/AttachmentEditButton'

const editorTooltip = exts => <Tooltip id="editor_tooltip">Available extensions: {exts}</Tooltip>;
const downloadTooltip = <Tooltip id="download_tooltip">Download attachment</Tooltip>;
const imageStyle = { position: 'absolute', width: 60, height: 60 };

export default class ResearchPlanDetailsAttachments extends Component {
  constructor(props) {
    super(props);
    this.importButtonRefs = [];
    this.state = {
      extension: null,
      showImportConfirm: []
    };

    this.createAttachmentPreviews = this.createAttachmentPreviews.bind(this);
  }

  componentDidMount() {
    this.createAttachmentPreviews();
  }

  componentDidUpdate(prevProps) {
    if (this.props.attachments !== prevProps.attachments) {
      this.createAttachmentPreviews();
    }
  }

  createAttachmentPreviews() {
    const { attachments } = this.props;
    attachments.map((attachment) => {
      if (attachment.thumb) {
        AttachmentFetcher.fetchThumbnail({ id: attachment.id }).then((result) => {
          if (result != null) {
            attachment.preview = `data:image/png;base64,${result}`;
          }
        });
      }
      else {
        attachment.preview = '/images/wild_card/not_available.svg';
      }
      return attachment;
    });
  }

  onImport(attachment) {
    const researchPlanId = this.props.researchPlan.id;
    LoadingActions.start();
    ElementActions.importTableFromSpreadsheet(
      researchPlanId,
      attachment.id,
      this.props.onAttachmentImportComplete
    )
    LoadingActions.stop();
  }

  renderRemoveAttachmentButton(attachment) {
    return (
      <Button bsSize="xsmall" bsStyle="danger" className="button-right" onClick={() => this.props.onDelete(attachment)} disabled={this.props.readOnly}>
        <i className="fa fa-trash-o" aria-hidden="true" />
      </Button>
    );
  }

  renderListGroupItem(attachment) {
    const { extension } = this.state;
    const hasPop = false;
    const fetchNeeded = false;
    const fetchId = attachment.id;

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
                onClick={() => this.props.onUndoDelete(attachment)}
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
                    src: attachment.preview,
                  }}
                  popObject={{
                    title: attachment.filename,
                    src: attachment.preview,
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
                onClick={() => this.props.onDownload(attachment)}
              >
                <i className="fa fa-download" aria-hidden="true" />
              </Button>
            </OverlayTrigger>
            <AttachmentEditButton
              attachment={attachment}
              className="button-right"
              overlay={editorTooltip(values(extension).join(','))}
              onEdit={this.props.onEdit}
            ></AttachmentEditButton>
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
        There are currently no attachments.<br />
      </div>
    );
  }

  renderDropzone() {

    return (
      <Dropzone
        onDrop={files => this.props.onDrop(files)}
        className={`research-plan-dropzone-${this.props.readOnly ? 'disable' : 'enable'}`}
      >
        <div className="zone">
          Drop Files, or Click to Select.
        </div>
      </Dropzone>
    );
  }

  renderImportAttachmentButton(attachment) {
    const show = this.state.showImportConfirm[attachment.id];
    // TODO: import disabled when?
    const importDisabled = this.props.researchPlan.changed;
    const extension = last(attachment.filename.split('.'));

    const importTooltip = importDisabled ?
      <Tooltip id="import_tooltip">Research Plan must be saved before import</Tooltip> :
      <Tooltip id="import_tooltip">Import spreadsheet as research plan table</Tooltip>;

    const confirmTooltip = (
      <Tooltip placement="bottom" className="in" id="tooltip-bottom">
        Import data from Spreadsheet?<br />
        <ButtonGroup>
          <Button
            bsStyle="success"
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
            {confirmTooltip}
          </Overlay>

        </div>
      );
    }
    return true;
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
    this.onImport(attachment);
    this.hideImportConfirm(attachment.id);
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

ResearchPlanDetailsAttachments.propTypes = {
  researchPlan: PropTypes.object.isRequired,
  attachments: PropTypes.array,
  onDrop: PropTypes.func.isRequired,
  onDelete: PropTypes.func.isRequired,
  onUndoDelete: PropTypes.func.isRequired,
  onDownload: PropTypes.func.isRequired,
  onAttachmentImportComplete: PropTypes.func,
  onEdit: PropTypes.func.isRequired,
  readOnly: PropTypes.bool.isRequired
};

ResearchPlanDetailsAttachments.defaultProps = {
  attachments: [],
  onAttachmentImportComplete: () => { }
};
