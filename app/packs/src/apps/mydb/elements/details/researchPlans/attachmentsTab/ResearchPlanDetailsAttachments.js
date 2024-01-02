import Dropzone from 'react-dropzone';
import EditorFetcher from 'src/fetchers/EditorFetcher';
import ElementActions from 'src/stores/alt/actions/ElementActions';
import ImageModal from 'src/components/common/ImageModal';
import LoadingActions from 'src/stores/alt/actions/LoadingActions';
import PropTypes from 'prop-types';
import React, { Component } from 'react';
import SpinnerPencilIcon from 'src/components/common/SpinnerPencilIcon';
import NotificationActions from 'src/stores/alt/actions/NotificationActions';

import ImageAnnotationModalSVG from 'src/apps/mydb/elements/details/researchPlans/ImageAnnotationModalSVG';
import ImageAnnotationEditButton from 'src/apps/mydb/elements/details/researchPlans/ImageAnnotationEditButton';
import Utils from 'src/utilities/Functions';
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
import ImageAttachmentFilter from 'src/utilities/ImageAttachmentFilter';
import ThirdPartyAppFetcher from 'src/fetchers/ThirdPartyAppFetcher';
import UsersFetcher from 'src/fetchers/UsersFetcher';
import SaveResearchPlanWarning from 'src/apps/mydb/elements/details/researchPlans/SaveResearchPlanWarning';

const editorTooltip = (exts) => (
  <Tooltip id="editor_tooltip">
    Available extensions:
    {' '}
    {exts}
  </Tooltip>
);
const downloadTooltip = <Tooltip id="download_tooltip">Download original attachment</Tooltip>;
const downloadAnnotationTooltip = <Tooltip id="download_tooltip">Download annotated attachment</Tooltip>;

const imageStyle = { position: 'absolute', width: 60, height: 60 };
const sendThirdPartyAppTip = <Tooltip id="inchi_tooltip">send to third party app</Tooltip>;
const chooseThirdPartyAppTip = <Tooltip id="inchi_tooltip">choose third party app</Tooltip>;


export default class ResearchPlanDetailsAttachments extends Component {
  constructor(props) {
    super(props);
    this.importButtonRefs = [];
    const {
      attachments, onDrop, onDelete, onUndoDelete, onDownload, onEdit
    } = props;

    this.state = {
      attachmentEditor: false,
      extension: null,
      imageEditModalShown: false,
      showImportConfirm: [],
      thirdPartyAppNames: [],
      thirdPartyAppIPList: {},
      selectedThirdPartyApp: {},
      updateDropDownThirdPartyApps: false,
      currentUser: '',
      attachmentToken: '',
      publicURL: '',
    };
    this.editorInitial = this.editorInitial.bind(this);
    this.createAttachmentPreviews = this.createAttachmentPreviews.bind(this);
    this.thirdPartyAppSelect = this.thirdPartyAppSelect.bind(this);
  }

  componentDidMount() {
    this.editorInitial();
    this.createAttachmentPreviews();
    this.getThirdPartyAppName();
    this.getCurrentUser();
    this.initThirdPartyAppIPList();
    this.initPublicURL();
  }

  componentDidUpdate(prevProps) {
    if (this.props.attachments !== prevProps.attachments) {
      this.createAttachmentPreviews();
    }
  }

  editorInitial() {
    EditorFetcher.initial().then((result) => {
      this.setState({
        attachmentEditor: result.installed,
        extension: result.ext,
      });
    });
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

  isImageFile(fileName) {
    const acceptedImageTypes = ['png', 'jpg', 'bmp', 'tif', 'svg', 'jpeg', 'tiff'];
    const dataType = last(fileName.split('.'));
    return acceptedImageTypes.includes(dataType);
  }

  handleEdit(attachment) {
    const fileType = last(attachment.filename.split('.'));
    const docType = this.documentType(attachment.filename);

    EditorFetcher.startEditing({ attachment_id: attachment.id })
    .then((result) => {
      if (result.token) {
        const url = `/editor?id=${attachment.id}&docType=${docType}
        &fileType=${fileType}&title=${attachment.filename}&key=${result.token}
        &only_office_token=${result.only_office_token}`;
        window.open(url, '_blank');

        attachment.aasm_state = 'oo_editing';
        attachment.updated_at = new Date();

        this.props.onEdit(attachment);
      } else {
        alert('Unauthorized to edit this file.');
      }
    });
  }

  createAttachmentPreviews() {
    const { attachments } = this.props;
    attachments.map((attachment) => {
      if (attachment.thumb) {
        AttachmentFetcher.fetchThumbnail({ id: attachment.id }).then(
          (result) => {
            if (result != null) {
              attachment.preview = `data:image/png;base64,${result}`;
            }
          }
        );
      } else {
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
    );
    LoadingActions.stop();
  }

  renderRemoveAttachmentButton(attachment) {
    return (
      <div style={{ float: 'right' }}>
        <Button
        bsSize="xsmall"
        bsStyle="danger"
        className="button-righ"
        onClick={() => this.props.onDelete(attachment)}
        disabled={this.props.readOnly}
      >
          <i className="fa fa-trash-o" aria-hidden="true" />
        </Button>
      </div>
    );
  }

  getThirdPartyAppName() {
    ThirdPartyAppFetcher.fetchThirdPartyAppNames()
      .then((result) => {
        this.setState({
          thirdPartyAppNames: result === null || result.length === 0 ? [] : result
        })
      });
  }

  initThirdPartyAppIPList() {
    this.setState({
      thirdPartyAppIPList: {}
    });
  }

  initPublicURL() {
      ThirdPartyAppFetcher.fetchPublicURL()
      .then((result) => {
        this.setState({
          publicURL: result
        })
      });
  }

  renderThirdPartyAppList(attachment) {

    return (
      <div style={{ float: 'right' }}>
        <select id="dropdown" className="button" value={this.state.selectedThirdPartyApp[attachment.id] || ''} onChange={event => this.thirdPartyAppSelect(event, attachment)}>
          <option value="">--Third Party Apps--</option>
          {this.state.thirdPartyAppNames.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </div>
    );

  }

  thirdPartyAppSelect(event, attachment) {

    const { attachments } = this.props;
    const attID = attachment.id;
    let selectedThirdPartyApp = this.state.selectedThirdPartyApp;

    selectedThirdPartyApp[attID] = event.target.value;

    const len = attachments.length;
    let arrIdx = [];
    for (let i = 0; i < len; i++) {
      const id = attachments[i].id;
      const obj = { i, id }
      arrIdx.push(obj);
    }

    Promise.all([ThirdPartyAppFetcher.fetchThirdPartyAppIp(event.target.value)
      .then((result) => {

        const ipObj = this.state.thirdPartyAppIPList;
        const obj = result;
        ipObj[attID] = { obj };
        return ipObj;
      })
    ]).then(([iPList]) => {

      this.setState({
        selectedThirdPartyApp: selectedThirdPartyApp,
        thirdPartyAppIPList: iPList
      });
    })

  }

  getCurrentUser() {
    UsersFetcher.fetchCurrentUser()
      .then((result) => {
        this.setState({
          currentUser: result
        })
      });
  }

  getAttachmentToken(attachment, nameThirdPartyApp) {
    const userID = this.state.currentUser.user.id;
    const attID = attachment.id;
    return ThirdPartyAppFetcher.fetchAttachmentToken(attID, userID, nameThirdPartyApp)
      .then((result) => {
        this.setState({
          attachmentToken: result
        });
      });
  }

  thirdPartyAppCall(attachment) {

    const { attachments } = this.props;

    const len = attachments.length;
    let arrIdx = [];
    for (let i = 0; i < len; i++) {
      const id = attachments[i].id;
      const obj = { i, id }
      arrIdx.push(obj);
    }

    const currentAttachment = arrIdx.find(entry => entry.id === attachment.id);
    const index = currentAttachment.i;
    const nameThirdPartyApp = this.state.thirdPartyAppNames[index]
    this.getAttachmentToken(attachment, nameThirdPartyApp)
      .then(() => {
        const ip = this.state.thirdPartyAppIPList[attachment.id];

        if (!ip || !this.state.attachmentToken) {
          NotificationActions.removeByUid('createUserLabel');
          const notification = {
            title: 'No third party app selected',
            message: 'No third party app selected',
            level: 'error',
            dismissible: 'button',
            autoDismiss: 5,
            position: 'tr',
            uid: 'chooseThirdPartyApp'
          };
          NotificationActions.add(notification);
        } else {
          const url = `${ip.obj}?token=${this.state.attachmentToken}&url=${this.state.publicURL}`;
          window.open(url, '_blank');
        }

      });
  }

  renderSendToThirdPartyApp(attachment) {
    return (
      <div style={{ float: 'right' }}>
        <Button bsSize="xsmall" bsStyle="primary" className="button" onClick={() => this.thirdPartyAppCall(attachment)} disabled={this.props.readOnly}>
          Send&nbsp;<i className="fa" />
        </Button>
      </div>
    );
  }

  renderImageEditModal() {
    return (
      <ImageAnnotationModalSVG
        attachment={this.state.choosenAttachment}
        isShow={this.state.imageEditModalShown}
        handleSave={
          () => {
            const newAnnotation = document.getElementById('svgEditId').contentWindow.svgEditor.svgCanvas.getSvgString();
            this.state.choosenAttachment.updatedAnnotation = newAnnotation;
            this.setState({ imageEditModalShown: false });
            this.props.onEdit(this.state.choosenAttachment);
          }
        }
        handleOnClose={() => { this.setState({ imageEditModalShown: false }); }}
      />
    );
  }

  renderAnnotateImageButton(attachment) {
    return (
      <ImageAnnotationEditButton
        parent={this}
        attachment={attachment}
        horizontalAlignment="button-right"
      />
    );
  }

  renderListGroupItem(attachment) {
    const { attachmentEditor, extension } = this.state;

    const updateTime = new Date(attachment.updated_at);
    updateTime.setTime(updateTime.getTime() + 15 * 60 * 1000);

    const hasPop = false;
    const fetchNeeded = false;
    const fetchId = attachment.id;
    const isEditing = attachment.aasm_state === 'oo_editing'
      && new Date().getTime() < updateTime;

    const docType = this.documentType(attachment.filename);
    const editDisable = !attachmentEditor || isEditing || attachment.is_new || docType === null;
    const styleEditorBtn = !attachmentEditor || docType === null ? 'none' : '';
    const isAnnotationUpdated = attachment.updatedAnnotation;
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
                className="button"
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
        <SaveResearchPlanWarning visible={isAnnotationUpdated} />
        <Row>
          <Col md={1}>
            <div className="analysis-header order" style={{ width: '60px', height: '60px' }}>
              <div className="preview" style={{ width: '60px', height: '60px' }}>
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
                    fetchId,
                  }}
                />
              </div>
            </div>
          </Col>
          <Col md={4}>
            {attachment.filename}
          </Col>
          <Col md={7}>
            <OverlayTrigger placement="bottom" overlay={sendThirdPartyAppTip} >
              {this.renderSendToThirdPartyApp(attachment)}
            </OverlayTrigger>

            <OverlayTrigger placement="bottom" overlay={chooseThirdPartyAppTip} >
              {this.renderThirdPartyAppList(attachment)}
            </OverlayTrigger>

            {this.renderRemoveAttachmentButton(attachment)}
            {this.renderDownloadOriginalButton(attachment, downloadTooltip)}
            {this.renderEditAttachmentButton(
              attachment,
              extension,
              attachmentEditor,
              isEditing,
              styleEditorBtn,
              styleEditorBtn,
              editDisable
            )}
            {this.renderDownloadAnnotatedImageButton(attachment)}
            {this.renderAnnotateImageButton(attachment)}
            {this.renderImportAttachmentButton(attachment)}
          </Col>
        </Row>
      </div>
    );
  }

  renderEditAttachmentButton(attachment, extension, attachmentEditor, isEditing, styleEditorBtn, editDisable) {
    return (
      <OverlayTrigger placement="left" overlay={editorTooltip(values(extension).join(','))}>
        <Button
          style={{ display: styleEditorBtn }}
          bsSize="xsmall"
          className="button-right"
          bsStyle="success"
          disabled={editDisable}
          onClick={() => this.handleEdit(attachment)}>

          <SpinnerPencilIcon spinningLock={!attachmentEditor || isEditing}/>
        </Button>
      </OverlayTrigger>

    );
  }

  renderDownloadOriginalButton(attachment, downloadTooltip) {
    return (
      <OverlayTrigger placement="top" overlay={downloadTooltip}>
        <Button
          bsSize="xsmall"
          className="button-right"
          bsStyle="primary"
          onClick={() => this.props.onDownload(attachment)}
        >
          <i className="fa fa-download" aria-hidden="true" />
        </Button>
      </OverlayTrigger>
    );
  }

  renderDownloadAnnotatedImageButton(attachment) {
    if (!this.isImageFile(attachment.filename)) {
      return null;
    }
    return (
    <OverlayTrigger placement="top" overlay={downloadAnnotationTooltip}>
      <div className="research-plan-attachments-annotation-download">
        <Button
          bsSize="xsmall"
          className="button-right"
          bsStyle="primary"
          disabled={attachment.isNew}
          onClick={() =>{
            Utils.downloadFile({ contents: `/api/v1/attachments/${attachment.id}/annotated_image`, name: attachment.filename });
          }}
        >
          <i className="fa fa-download" aria-hidden="true" />
        </Button>
      </div>
    </OverlayTrigger>
    );
  }

  renderAttachments() {
    const { attachments } = this.props;
    if (attachments && attachments.length > 0) {
      const filter = new ImageAttachmentFilter();
      const filteredAttachments = filter.filterAttachmentsWhichAreInBody(
        this.props.researchPlan.body,
        this.props.researchPlan.attachments
      );

      return (
        <ListGroup>
          {filteredAttachments.map((attachment) => (
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
    return (
      <Dropzone
        onDrop={(files) => this.props.onDrop(files)}
        className={`research-plan-dropzone-${this.props.readOnly ? 'disable' : 'enable'}`}
      >
        <div className="zone">Drop Files, or Click to Select.</div>
      </Dropzone>
    );
  }

  renderImportAttachmentButton(attachment) {
    const show = this.state.showImportConfirm[attachment.id];
    // TODO: import disabled when?
    const importDisabled = this.props.researchPlan.changed;
    const extension = last(attachment.filename.split('.'));

    const importTooltip = importDisabled
      ? <Tooltip id="import_tooltip">Research Plan must be saved before import</Tooltip>
      : <Tooltip id="import_tooltip">Import spreadsheet as research plan table</Tooltip>;

    const confirmTooltip = (
      <Tooltip placement="bottom" className="in" id="tooltip-bottom">
        Import data from Spreadsheet?
        <br />
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
          <OverlayTrigger placement="top" overlay={importTooltip}>
            <div style={{ float: 'right' }}>
              <Button
                bsSize="xsmall"
                bsStyle="success"
                className="button"
                disabled={importDisabled}
                ref={(ref) => {
                  this.importButtonRefs[attachment.id] = ref;
                }}
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
