/* eslint-disable react/destructuring-assignment */
import React, { Component } from 'react';
import PropTypes from 'prop-types';
import EditorFetcher from 'src/fetchers/EditorFetcher';
import ImageModal from 'src/components/common/ImageModal';
import ImageAnnotationModalSVG from 'src/apps/mydb/elements/details/researchPlans/ImageAnnotationModalSVG';
import Utils from 'src/utilities/Functions';
import {
  Button, ButtonGroup, OverlayTrigger, Popover
} from 'react-bootstrap';
import { last, findKey } from 'lodash';
import AttachmentFetcher from 'src/fetchers/AttachmentFetcher';
import SaveEditedImageWarning from 'src/apps/mydb/elements/details/researchPlans/SaveEditedImageWarning';

import {
  downloadButton,
  removeButton,
  annotateButton,
  editButton,
  importButton,
  customDropzone,
  sortingAndFilteringUI,
  formatFileSize,
  isImageFile
} from 'src/apps/mydb/elements/list/AttachmentList';

const templateInfo = (
  <Popover id="popver-template-info" title="Template info">
    This template should be used to import well readouts. The&nbsp;
    <strong>red</strong>
    &nbsp;column may not be altered at all. The contents of the&nbsp;
    <strong>yellow</strong>
    &nbsp;columns may be altered, the headers may not. The&nbsp;
    <strong>green</strong>
    &nbsp;columns must contain at least one&nbsp;
    <i>_Value</i>
    &nbsp;and&nbsp;
    <i>_Unit</i>
    &nbsp;pair with a matching prefix before the underscore. They may contain an arbitrary amount of readout pairs.
  </Popover>
);

export default class WellplateDetailsAttachments extends Component {
  constructor(props) {
    super(props);
    this.importButtonRefs = [];
    const {
      onImport
    } = props;

    this.state = {
      onImport,
      attachmentEditor: false,
      extension: null,
      imageEditModalShown: false,
      showImportConfirm: [],
      filteredAttachments: [...props.attachments],
      filterText: '',
      sortBy: 'name',
      sortDirection: 'asc',
    };
    this.editorInitial = this.editorInitial.bind(this);
    this.createAttachmentPreviews = this.createAttachmentPreviews.bind(this);

    this.handleDownloadOriginal = this.handleDownloadOriginal.bind(this);
    this.handleDownloadAnnotated = this.handleDownloadAnnotated.bind(this);
    this.handleEdit = this.handleEdit.bind(this);
    this.handleFilterChange = this.handleFilterChange.bind(this);
    this.handleSortChange = this.handleSortChange.bind(this);
    this.toggleSortDirection = this.toggleSortDirection.bind(this);
    this.confirmAttachmentImport = this.confirmAttachmentImport.bind(this);
    this.showImportConfirm = this.showImportConfirm.bind(this);
    this.hideImportConfirm = this.hideImportConfirm.bind(this);
  }

  componentDidMount() {
    this.editorInitial();
    this.createAttachmentPreviews();
  }

  componentDidUpdate(prevProps) {
    const { attachments } = this.props;
    if (attachments !== prevProps.attachments) {
      this.createAttachmentPreviews();
      this.setState({ filteredAttachments: [...attachments] }, this.filterAndSortAttachments);
    }
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

  handleTemplateDownload() { // eslint-disable-line class-methods-use-this
    Utils.downloadFile({ contents: '/xlsx/wellplate_import_template.xlsx', name: 'wellplate_import_template.xlsx' });
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
    const isImage = isImageFile(attachment.filename);
    if (isImage && !attachment.isNew) {
      Utils.downloadFile({
        contents: `/api/v1/attachments/${attachment.id}/annotated_image`,
        name: attachment.filename
      });
    }
  };

  filterAndSortAttachments() {
    const { filterText, sortBy } = this.state;

    const filteredAttachments = this.props.attachments.filter((
      attachment
    ) => attachment.filename.toLowerCase().includes(filterText.toLowerCase()));

    filteredAttachments.sort((a, b) => {
      let comparison = 0;
      switch (sortBy) {
        case 'name':
          comparison = a.filename.localeCompare(b.filename);
          break;
        case 'size':
          comparison = a.filesize - b.filesize;
          break;
        case 'date':
          comparison = new Date(a.created_at) - new Date(b.created_at);
          break;
        default:
          break;
      }
      return this.state.sortDirection === 'asc' ? comparison : -comparison;
    });

    this.setState({ filteredAttachments });
  }

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
    const { onImport } = this.state;
    onImport(attachment);
    this.hideImportConfirm(attachment.id);
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

  renderTemplateDownload() {
    return (
      <div>
        <ButtonGroup style={{ marginBottom: '10px' }}>
          <Button
            bsStyle="primary"
            onClick={() => this.handleTemplateDownload()}
          >
            <i className="fa fa-download" aria-hidden="true" />
            &nbsp;
            Download Import Template xlsx
          </Button>
          <OverlayTrigger placement="bottom" overlay={templateInfo}>
            <Button
              bsStyle="info"
            >
              <i className="fa fa-info" aria-hidden="true" />
            </Button>
          </OverlayTrigger>
        </ButtonGroup>
      </div>
    );
  }

  render() {
    const {
      filteredAttachments, sortDirection, attachmentEditor, extension
    } = this.state;
    const { onUndoDelete } = this.props;

    return (
      <div className="attachment-main-container">
        {this.renderTemplateDownload()}
        {this.renderImageEditModal()}
        {customDropzone(this.props.onDrop)}
        {sortingAndFilteringUI(
          sortDirection,
          this.handleSortChange,
          this.toggleSortDirection,
          this.handleFilterChange
        )}
        {filteredAttachments.length === 0 ? (
          <div className="no-attachments-text">
            There are currently no attachments.
          </div>
        ) : (
          filteredAttachments.map((attachment) => (
            <div className="attachment-row" key={attachment.id}>
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
                  hasPop={false}
                  alt="thumbnail"
                  previewObject={{
                    src: attachment.preview,
                  }}
                  popObject={{
                    title: attachment.filename,
                    src: attachment.preview,
                    fetchNeeded: false,
                    fetchId: attachment.id,
                  }}
                />
              </div>
              <div className="attachment-row-text">
                {attachment.is_deleted ? (
                  <strike>{attachment.filename}</strike>
                ) : (
                  attachment.filename
                )}
                <div className="attachment-row-subtext">
                  Added on:&nbsp;
                  {new Date(attachment.created_at).toLocaleDateString('en-GB')}
                  ,&nbsp;
                  {new Date(attachment.created_at).toLocaleTimeString(
                    'en-GB',
                    { hour: '2-digit', minute: '2-digit', hour12: true }
                  )}

                </div>
              </div>
              <div className="attachment-row-size">
                <span style={{ fontWeight: 'bold' }}>
                  Size:&nbsp;
                  <span style={{ fontWeight: 'bold', color: '#444' }}>
                    {formatFileSize(attachment.filesize)}
                  </span>
                </span>
              </div>
              <div className="attachment-row-actions" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                {attachment.is_deleted ? (
                  <Button
                    bsSize="xs"
                    bsStyle="danger"
                    className="attachment-button-size"
                    onClick={() => onUndoDelete(attachment)}
                  >
                    <i className="fa fa-undo" aria-hidden="true" />
                  </Button>
                ) : (
                  <>
                    {downloadButton(attachment, this.handleDownloadOriginal, this.handleDownloadAnnotated)}
                    {editButton(
                      attachment,
                      extension,
                      attachmentEditor,
                      attachment.aasm_state === 'oo_editing' && new Date().getTime()
                          < (new Date(attachment.updated_at).getTime() + 15 * 60 * 1000),
                      attachmentEditor ? '' : 'none',
                      !attachmentEditor || attachment.aasm_state === 'oo_editing'
                          || attachment.is_new || this.documentType(attachment.filename) === null,
                      this.handleEdit
                    )}
                    {annotateButton(attachment, this)}
                    {importButton(
                      attachment,
                      this.state.showImportConfirm,
                      this.props.wellplate.changed,
                      this.importButtonRefs,
                      this.showImportConfirm,
                      this.hideImportConfirm,
                      this.confirmAttachmentImport
                    )}
                    {removeButton(attachment, this.props.onDelete, this.props.readOnly)}
                  </>
                )}
              </div>
              {attachment.updatedAnnotation && <SaveEditedImageWarning visible />}
            </div>
          ))
        )}
      </div>
    );
  }
}

WellplateDetailsAttachments.propTypes = {
  wellplate: PropTypes.shape({
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
  onEdit: PropTypes.func.isRequired,
  readOnly: PropTypes.bool.isRequired,
  onImport: PropTypes.func.isRequired,
};

WellplateDetailsAttachments.defaultProps = {
  attachments: [],
};
