/* eslint-disable react/destructuring-assignment */
import Dropzone from 'react-dropzone';
import EditorFetcher from 'src/fetchers/EditorFetcher';
import ElementActions from 'src/stores/alt/actions/ElementActions';
import ImageModal from 'src/components/common/ImageModal';
import LoadingActions from 'src/stores/alt/actions/LoadingActions';
import PropTypes from 'prop-types';
import React, { Component } from 'react';
import SpinnerPencilIcon from 'src/components/common/SpinnerPencilIcon';
import ImageAnnotationModalSVG from 'src/apps/mydb/elements/details/researchPlans/ImageAnnotationModalSVG';
import ImageAnnotationEditButton from 'src/apps/mydb/elements/details/researchPlans/ImageAnnotationEditButton';
import Utils from 'src/utilities/Functions';
import {
  Button, ButtonGroup, Glyphicon, Overlay, OverlayTrigger, Tooltip, Dropdown, MenuItem
} from 'react-bootstrap';
import { last, findKey, values } from 'lodash';
import AttachmentFetcher from 'src/fetchers/AttachmentFetcher';
import ImageAttachmentFilter from 'src/utilities/ImageAttachmentFilter';
import SaveResearchPlanWarning from 'src/apps/mydb/elements/details/researchPlans/SaveResearchPlanWarning';

const editorTooltip = (exts) => (
  <Tooltip id="editor_tooltip">
    Available extensions:&nbsp;
    {exts}
  </Tooltip>
);

export default class ResearchPlanDetailsAttachments extends Component {
  static isImageFile(fileName) {
    const acceptedImageTypes = ['png', 'jpg', 'bmp', 'tif', 'svg', 'jpeg', 'tiff'];
    const dataType = last(fileName.split('.'));
    return acceptedImageTypes.includes(dataType);
  }

  constructor(props) {
    super(props);
    this.importButtonRefs = [];

    this.state = {
      attachmentEditor: false,
      extension: null,
      imageEditModalShown: false,
      showImportConfirm: [],
      filteredAttachments: [...props.attachments],
      filterText: '',
      sortBy: 'name'
    };
    this.editorInitial = this.editorInitial.bind(this);
    this.createAttachmentPreviews = this.createAttachmentPreviews.bind(this);
  }

  componentDidMount() {
    this.editorInitial();
    this.createAttachmentPreviews();
  }

  componentDidUpdate(prevProps) {
    const { attachments } = this.props;
    if (attachments !== prevProps.attachments) {
      this.createAttachmentPreviews();
    }
    if (prevProps.attachments !== this.props.attachments) {
      this.setState({ filteredAttachments: [...this.props.attachments] }, this.filterAndSortAttachments);
    }
  }

  /* eslint-disable no-param-reassign */
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
  /* eslint-enable no-param-reassign */

  onImport(attachment) {
    const { researchPlan, onAttachmentImportComplete } = this.props;
    const researchPlanId = researchPlan.id;
    LoadingActions.start();
    ElementActions.importTableFromSpreadsheet(
      researchPlanId,
      attachment.id,
      onAttachmentImportComplete
    );
    LoadingActions.stop();
  }

  handleFilterChange = (e) => {
    this.setState({ filterText: e.target.value }, this.filterAndSortAttachments);
  };

  handleSortChange = (e) => {
    this.setState({ sortBy: e.target.value }, this.filterAndSortAttachments);
  };

  toggleSortDirection = () => {
    this.setState((prevState) => ({
      sortDirection: prevState.sortDirection === 'asc' ? 'desc' : 'asc'
    }), this.filterAndSortAttachments);
  };

  handleDownloadOriginal = (attachment) => {
    this.props.onDownload(attachment);
  };

  handleDownloadAnnotated = (attachment) => {
    const isImageFile = ResearchPlanDetailsAttachments.isImageFile(attachment.filename);
    if (isImageFile && !attachment.isNew) {
      Utils.downloadFile({
        contents: `/api/v1/attachments/${attachment.id}/annotated_image`,
        name: attachment.filename
      });
    }
  };

  filterAndSortAttachments() {
    const { filterText, sortBy } = this.state;

    const filter = new ImageAttachmentFilter();
    let filteredAttachments = filter.filterAttachmentsWhichAreInBody(
      this.props.researchPlan.body,
      this.props.attachments
    );

    filteredAttachments = filteredAttachments.filter(
      (attachment) => attachment.filename.toLowerCase().includes(filterText.toLowerCase())
    );

    filteredAttachments.sort((a, b) => {
      let comparison = 0;
      switch (sortBy) {
        case 'name':
          comparison = a.filename.localeCompare(b.filename);
          break;
        case 'size':
          comparison = a.filesize - b.filesize;
          break;
        default:
          break;
      }
      return this.state.sortDirection === 'asc' ? comparison : -comparison;
    });

    this.setState({ filteredAttachments });
  }

  /* eslint-disable no-param-reassign */
  createAttachmentPreviews() {
    const { attachments } = this.props;
    attachments.map((attachment) => {
      if (attachment.thumb) {
        AttachmentFetcher.fetchThumbnail({ id: attachment.id }).then(
          (result) => {
            if (result != null) {
              attachment.preview = `data:image/png;base64,${result}`;
              this.forceUpdate();
            }
          }
        );
      } else {
        attachment.preview = '/images/wild_card/not_available.svg';
        this.forceUpdate();
      }
      return attachment;
    });
  }
  /* eslint-enable no-param-reassign */

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

  renderDownloadSplitButton = (attachment) => {
    const isImageFile = ResearchPlanDetailsAttachments.isImageFile(attachment.filename);
    return (
      <Dropdown id={`dropdown-download-${attachment.id}`}>
        <Dropdown.Toggle style={{ height: '30px' }} bsSize="xs" bsStyle="primary">
          <i className="fa fa-download" aria-hidden="true" />
        </Dropdown.Toggle>
        <Dropdown.Menu>
          <MenuItem
            eventKey="1"
            onClick={() => this.handleDownloadOriginal(attachment)}
          >
            Download Original
          </MenuItem>
          <MenuItem
            eventKey="2"
            onClick={() => this.handleDownloadAnnotated(attachment)}
            disabled={!isImageFile || attachment.isNew}
          >
            Download Annotated
          </MenuItem>
        </Dropdown.Menu>
      </Dropdown>
    );
  };

  renderRemoveAttachmentButton(attachment) {
    const { onDelete, readOnly } = this.props;
    return (
      <OverlayTrigger placement="top" overlay={<Tooltip id="delete_tooltip">Delete attachment</Tooltip>}>
        <Button
          bsSize="xs"
          bsStyle="danger"
          className="attachment-button-size"
          onClick={() => onDelete(attachment)}
          disabled={readOnly}
        >
          <i className="fa fa-trash-o" aria-hidden="true" />
        </Button>
      </OverlayTrigger>
    );
  }

  renderImageEditModal() {
    const { chosenAttachment, imageEditModalShown } = this.state;
    const { onEdit } = this.props;
    return (
      <ImageAnnotationModalSVG
        attachment={chosenAttachment}
        isShow={imageEditModalShown}
        handleSave={
          () => {
            const newAnnotation = document.getElementById('svgEditId').contentWindow.svgEditor.svgCanvas.getSvgString();
            chosenAttachment.updatedAnnotation = newAnnotation;
            this.setState({ imageEditModalShown: false });
            onEdit(chosenAttachment);
          }
        }
        handleOnClose={() => { this.setState({ imageEditModalShown: false }); }}
      />
    );
  }

  renderAnnotateImageButton(attachment) {
    const isImageFile = ResearchPlanDetailsAttachments.isImageFile(attachment.filename);
    return (
      <ImageAnnotationEditButton
        parent={this}
        attachment={attachment}
        className={`attachment-button-size ${!isImageFile ? 'attachment-gray-button' : ''}`}
        disabled={!isImageFile}
      />
    );
  }

  renderEditAttachmentButton(attachment, extension, attachmentEditor, isEditing, styleEditorBtn, editDisable) {
    return (
      <OverlayTrigger placement="left" overlay={editorTooltip(values(extension).join(','))}>
        <Button
          className="attachment-button-size"
          style={{
            display: styleEditorBtn,
          }}
          bsSize="xs"
          bsStyle="success"
          disabled={editDisable}
          onClick={() => this.handleEdit(attachment)}
        >
          <SpinnerPencilIcon spinningLock={!attachmentEditor || isEditing} />
        </Button>
      </OverlayTrigger>
    );
  }

  renderImportAttachmentButton(attachment) {
    const { showImportConfirm } = this.state;
    const { researchPlan } = this.props;
    const show = showImportConfirm[attachment.id];
    // TODO: import disabled when?
    const importDisabled = researchPlan.changed;
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
            bsSize="xs"
            onClick={() => this.confirmAttachmentImport(attachment)}
          >
            Yes
          </Button>
          <Button
            bsStyle="warning"
            bsSize="xs"
            onClick={() => this.hideImportConfirm(attachment.id)}
          >
            No
          </Button>
        </ButtonGroup>
      </Tooltip>
    );

    return (
      <div>
        <OverlayTrigger placement="top" overlay={importTooltip}>
          <div style={{ float: 'right' }}>
            <Button
              bsSize="xs"
              bsStyle="success"
              disabled={importDisabled || extension !== 'xlsx'}
              ref={(ref) => {
                this.importButtonRefs[attachment.id] = ref;
              }}
              className={`attachment-button-size ${importDisabled || extension !== 'xlsx'
                ? 'attachment-gray-button' : ''}`}
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

  renderActions(attachment) {
    const { attachmentEditor, extension } = this.state;
    const { onUndoDelete } = this.props;

    const updateTime = new Date(attachment.updated_at);
    updateTime.setTime(updateTime.getTime() + 15 * 60 * 1000);

    const isEditing = attachment.aasm_state === 'oo_editing'
      && new Date().getTime() < updateTime;

    const docType = this.documentType(attachment.filename);
    const editDisable = !attachmentEditor || isEditing || attachment.is_new || docType === null;
    const styleEditorBtn = !attachmentEditor || docType === null ? 'none' : '';
    const isAnnotationUpdated = attachment.updatedAnnotation;
    if (attachment.is_deleted) {
      return (
        <div>
          <Button
            bsSize="xs"
            bsStyle="danger"
            className="attachment-button-size"
            onClick={() => onUndoDelete(attachment)}
          >
            <i className="fa fa-undo" aria-hidden="true" />
          </Button>
        </div>
      );
    }

    return (
      <div>
        <SaveResearchPlanWarning visible={isAnnotationUpdated} />
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {this.renderDownloadSplitButton(attachment)}
          {this.renderEditAttachmentButton(
            attachment,
            extension,
            attachmentEditor,
            isEditing,
            styleEditorBtn,
            styleEditorBtn,
            editDisable
          )}
          {this.renderAnnotateImageButton(attachment)}
          {this.renderImportAttachmentButton(attachment)}
          {this.renderRemoveAttachmentButton(attachment)}
        </div>
      </div>
    );
  }

  renderDropzone() {
    return (
      <Dropzone
        onDrop={this.props.onDrop}
        className="attachment-dropzone"
      >
        Drop files here, or click to upload.
      </Dropzone>

    );
  }

  renderSortingAndFilteringUI() {
    const isAscending = this.state.sortDirection === 'asc';

    return (
      <div style={{
        marginBottom: '20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between'
      }}
      >
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <label style={{ marginRight: '10px' }}>Sort by: </label>
          <select
            onChange={this.handleSortChange}
            className="sorting-row-style"
            style={{ width: '100px' }}
          >
            <option value="name">Name</option>
            <option value="size">Size</option>
          </select>
          <button
            onClick={this.toggleSortDirection}
            className="sort-icon-style"
            type="button"
          >
            {isAscending ? '▲' : '▼'}
          </button>
        </div>
        <div>
          <label style={{ marginRight: '10px' }}>Filter: </label>
          <input
            type="text"
            placeholder="Filter by name..."
            onChange={this.handleFilterChange}
            className="sorting-row-style"
            style={{ width: '250px' }}
          />
        </div>
      </div>
    );
  }

  renderAttachmentRow(attachment) {
    const maxCharsWithoutTooltip = 40;
    const uploadDate = new Date(attachment.created_at).toLocaleDateString('en-US');
    const renderText = (
      <div className="attachment-row-text">
        {attachment.filename}
        <div className="attachment-row-subtext">
          Added on:&nbsp;
          {uploadDate}
        </div>
      </div>
    );
    const renderTooltip = (
      <OverlayTrigger
        placement="top"
        overlay={(
          <Tooltip id={`tooltip-${attachment.id}`}>
            {attachment.filename}
          </Tooltip>
    )}
      >
        {renderText}
      </OverlayTrigger>
    );

    const formatFileSize = (sizeInKB) => {
      if (sizeInKB >= 1024) {
        return `${(sizeInKB / 1024).toFixed(2)} MB`;
      }
      return `${sizeInKB} KB`;
    };

    const fetchNeeded = false;
    const hasPop = false;

    return (
      <div className="attachment-row">
        <div className="attachment-row-image">
          <ImageModal
            imageStyle={{
              width: '60px',
              height: '60px',
              borderRadius: '5px',
              objectFit: 'cover',
              boxShadow: '0 2px 10px rgba(0, 0, 0, 0.1)',
              transition: 'transform 0.2s ease-in-out, box-shadow 0.2s ease-in-out',
            }}
            hasPop={hasPop}
            alt="thumbnail"
            previewObject={{
              src: attachment.preview,
            }}
            popObject={{
              title: attachment.filename,
              src: attachment.preview,
              fetchNeeded,
              fetchId: attachment.id,
            }}
          />
        </div>

        {attachment.filename.length > maxCharsWithoutTooltip ? renderTooltip : renderText}

        <div className="attachment-row-size">
          <span style={{ fontWeight: 'bold' }}>
            Size:&nbsp;
            <span style={{ fontWeight: 'bold', color: '#444' }}>
              {formatFileSize(attachment.filesize)}
            </span>
          </span>
        </div>

        <div className="attachment-row-actions">
          {this.renderActions(attachment)}
        </div>
      </div>
    );
  }

  render() {
    const { filteredAttachments } = this.state;
    return (
      <div className="attachment-main-container">
        {this.renderImageEditModal()}
        {this.renderDropzone()}
        {this.renderSortingAndFilteringUI()}
        {filteredAttachments.length === 0 ? (
          <div className="no-attachments-text">
            There are currently no attachments.
          </div>
        ) : (
          filteredAttachments.map((attachment) => this.renderAttachmentRow(attachment))
        )}
      </div>
    );
  }
}

ResearchPlanDetailsAttachments.propTypes = {
  researchPlan: PropTypes.shape({
    id: PropTypes.oneOfType([
      PropTypes.string,
      PropTypes.number
    ]).isRequired,
    changed: PropTypes.bool.isRequired,
    body: PropTypes.arrayOf(
      PropTypes.shape({
        id: PropTypes.string.isRequired,
        title: PropTypes.string.isRequired,
        type: PropTypes.string.isRequired,
      })
    ).isRequired,
    attachments: PropTypes.arrayOf(
      PropTypes.shape({
        id: PropTypes.oneOfType([
          PropTypes.string,
          PropTypes.number
        ]).isRequired,
        aasm_state: PropTypes.string.isRequired,
        content_type: PropTypes.string.isRequired,
        filename: PropTypes.string.isRequired,
        filesize: PropTypes.number.isRequired,
        identifier: PropTypes.oneOfType([
          PropTypes.string,
          PropTypes.number
        ]).isRequired,
        thumb: PropTypes.bool.isRequired
      })
    )
  }).isRequired,
  attachments: PropTypes.arrayOf(PropTypes.shape({
    id: PropTypes.oneOfType([
      PropTypes.string,
      PropTypes.number
    ]).isRequired,
    aasm_state: PropTypes.string.isRequired,
    content_type: PropTypes.string.isRequired,
    filename: PropTypes.string.isRequired,
    filesize: PropTypes.number.isRequired,
    identifier: PropTypes.oneOfType([
      PropTypes.string,
      PropTypes.number
    ]).isRequired,
    thumb: PropTypes.bool.isRequired
  })),
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
