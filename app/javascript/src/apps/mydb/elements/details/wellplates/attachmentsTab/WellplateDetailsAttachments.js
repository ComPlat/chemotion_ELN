/* eslint-disable no-param-reassign */
/* eslint-disable react/destructuring-assignment */
import React, { Component } from 'react';
import PropTypes from 'prop-types';
import UIStore from 'src/stores/alt/stores/UIStore';
import ImageAnnotationModalSVG from 'src/apps/mydb/elements/details/researchPlans/ImageAnnotationModalSVG';
import Utils from 'src/utilities/Functions';
import {
  Button, OverlayTrigger, Popover, Alert, Tooltip
} from 'react-bootstrap';
import AttachmentFetcher from 'src/fetchers/AttachmentFetcher';
import SaveEditedImageWarning from 'src/apps/mydb/elements/details/researchPlans/SaveEditedImageWarning';
import {
  downloadButton,
  removeButton,
  annotateButton,
  EditButton,
  importButton,
  customDropzone,
  sortingAndFilteringUI,
  formatFileSize,
  attachmentThumbnail,
  ThirdPartyAppButton,
} from 'src/apps/mydb/elements/list/AttachmentList';
import { formatDate, parseDate } from 'src/utilities/timezoneHelper';
import { StoreContext } from 'src/stores/mobx/RootStore';
import { observer } from 'mobx-react';
import UserStore from 'src/stores/alt/stores/UserStore';

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

export class WellplateDetailsAttachments extends Component {
  static contextType = StoreContext;

  constructor(props) {
    super(props);
    const {
      onImport
    } = props;
    const { thirdPartyApps } = UIStore.getState() || [];
    this.thirdPartyApps = thirdPartyApps;

    this.state = {
      onImport,
      imageEditModalShown: false,
      showImportConfirm: [],
      filteredAttachments: [...props.attachments],
      filterText: '',
      sortBy: 'name',
      sortDirection: 'asc',
    };
    this.createAttachmentPreviews = this.createAttachmentPreviews.bind(this);

    this.handleFilterChange = this.handleFilterChange.bind(this);
    this.handleSortChange = this.handleSortChange.bind(this);
    this.toggleSortDirection = this.toggleSortDirection.bind(this);
    this.confirmAttachmentImport = this.confirmAttachmentImport.bind(this);
    this.showImportConfirm = this.showImportConfirm.bind(this);
    this.hideImportConfirm = this.hideImportConfirm.bind(this);
  }

  componentDidMount() {
    const { attachments } = this.props;
    const updatedImportConfirm = attachments.reduce((acc, attachment) => {
      acc[attachment.id] = false;
      return acc;
    }, {});
    this.setState({ showImportConfirm: updatedImportConfirm });
    this.createAttachmentPreviews();
  }

  componentDidUpdate(prevProps) {
    const { attachments } = this.props;
    if (attachments !== prevProps.attachments) {
      this.createAttachmentPreviews();
      this.setState({ filteredAttachments: [...attachments] }, this.filterAndSortAttachments);
    }
  }

  handleTemplateDownload() {
    const { wellplate } = this.props;
    Utils.downloadFile({
      contents: `/api/v1/wellplates/template/${wellplate.id}`,
      name: 'wellplate_import_template.xlsx',
    });
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

  filterAndSortAttachments() {
    const { filterText, sortBy } = this.state;

    const filteredAttachments = this.props.attachments.filter(
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
        case 'date': {
          const dateA = parseDate(a.created_at);
          const dateB = parseDate(b.created_at);
          comparison = dateA.valueOf() - dateB.valueOf();
          break;
        }
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
      if (attachment.preview !== undefined && attachment.preview !== '') { return attachment; }
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
    const { wellplate } = this.props;
    // The template is built server-side from the stored wells, so a wellplate that is not saved
    // yet has nothing to build it from. A saved one always matches the screen: its only input,
    // the well positions, changes solely through a resize, which is persisted immediately.
    const disabled = wellplate.isNew;
    const templateButton = (
      <Button
        variant="light"
        disabled={disabled}
        onClick={() => this.handleTemplateDownload()}
      >
        <i className="fa fa-download" aria-hidden="true" />
        &nbsp;
        Download Import Template xlsx
      </Button>
    );
    const disabledTooltip = (
      <Tooltip id="template_download_tooltip">
        Please save the wellplate before downloading the import template
      </Tooltip>
    );

    return (
      <div className="d-flex align-items-center gap-1 mb-1">
        {disabled ? (
          <OverlayTrigger placement="bottom" overlay={disabledTooltip}>
            {/* The disabled button takes no mouse events or focus, so a focusable wrapper
                hosts the explanation for mouse and keyboard users alike. */}
            {/* eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex */}
            <span className="d-inline-block" tabIndex={0} style={{ cursor: 'not-allowed' }}>
              {templateButton}
            </span>
          </OverlayTrigger>
        ) : templateButton}
        <OverlayTrigger placement="bottom" overlay={templateInfo}>
          <Button variant="light">
            <i className="fa fa-info" aria-hidden="true" />
          </Button>
        </OverlayTrigger>
      </div>
    );
  }

  render() {
    const {
      filteredAttachments, sortDirection
    } = this.state;
    const {
      onUndoDelete, attachments, wellplate, readOnly, onEdit, onDelete, onDrop
    } = this.props;
    const { currentUser } = UserStore.getState();

    let combinedAttachments = filteredAttachments;
    if (this.context.attachmentNotificationStore) {
      combinedAttachments = this.context.attachmentNotificationStore.getCombinedAttachments(filteredAttachments, 'Wellplate', wellplate);
    }

    const showToolbar = !readOnly || attachments.length > 0;

    return (
      <div className="attachment-main-container">
        {!readOnly && this.renderTemplateDownload()}
        {this.renderImageEditModal()}
        {showToolbar && (
          <div className="d-flex justify-content-between align-items-center">
            {!readOnly && (
              <div className="flex-grow-1 align-self-center">
                {customDropzone(onDrop)}
              </div>
            )}
            <div className="ms-3 align-self-center">
              {
                attachments.length > 0
                && sortingAndFilteringUI(
                  sortDirection,
                  this.handleSortChange,
                  this.toggleSortDirection,
                  this.handleFilterChange,
                  true
                )
              }
            </div>
          </div>
        )}
        {combinedAttachments.length === 0 ? (
          <div className="d-flex align-items-center justify-content-between my-2">
            <span>There are currently no attachments.</span>
          </div>
        ) : (
          <>
            {combinedAttachments.map((attachment) => (
              <div className="attachment-row" key={attachment.id}>
                {attachmentThumbnail(attachment)}

                <div className="attachment-row-text" title={attachment.filename}>
                  {attachment.is_deleted ? (
                    <strike>{attachment.filename}</strike>
                  ) : (
                    attachment.filename
                  )}
                  <div className="attachment-row-subtext">
                    <div>
                      Created:&nbsp;
                      {formatDate(attachment.created_at)}
                    </div>
                    <span className="mx-2">|</span>
                    <div>
                      Size:&nbsp;
                      <strong>
                        {formatFileSize(attachment.filesize)}
                      </strong>
                    </div>
                  </div>
                </div>
                <div className="attachment-row-actions d-flex align-items-center gap-1">
                  {attachment.is_deleted ? (
                    !readOnly && (
                      <Button
                        size="sm"
                        variant="danger"
                        className="attachment-button-size"
                        onClick={() => onUndoDelete(attachment)}
                      >
                        <i className="fa fa-undo" aria-hidden="true" />
                      </Button>
                    )
                  ) : (
                    <>
                      {downloadButton(attachment)}
                      <ThirdPartyAppButton attachment={attachment} options={this.thirdPartyApps} />
                      {!readOnly && (
                        <>
                          <EditButton attachment={attachment} onChange={onEdit} />
                          {annotateButton(attachment, () => {
                            this.setState({
                              imageEditModalShown: true,
                              chosenAttachment: attachment,
                            });
                          })}
                          {importButton(
                            attachment,
                            this.state.showImportConfirm,
                            wellplate.changed,
                            this.showImportConfirm,
                            this.hideImportConfirm,
                            this.confirmAttachmentImport
                          )}
                          &nbsp;
                          {removeButton(attachment, onDelete, false)}
                        </>
                      )}
                    </>
                  )}
                </div>
                {attachment.updatedAnnotation && <SaveEditedImageWarning visible />}
              </div>
            ))}
            {!readOnly && (
              <Alert variant="warning" show={UserStore.isUserQuotaExceeded(filteredAttachments)}>
                Uploading attachments will fail; User quota
                {currentUser !== null ? ` (${currentUser.allocated_space / 1024 / 1024} MB) ` : ' '}
                will be exceeded.
              </Alert>
            )}
          </>
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
    changed: PropTypes.bool,
    isNew: PropTypes.bool,
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
  onEdit: PropTypes.func.isRequired,
  readOnly: PropTypes.bool.isRequired,
  onImport: PropTypes.func.isRequired,
};

WellplateDetailsAttachments.defaultProps = {
  attachments: [],
};

export default observer(WellplateDetailsAttachments);
