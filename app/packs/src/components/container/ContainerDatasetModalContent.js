/* eslint-disable react/destructuring-assignment */
import React, { Component } from 'react';
import {
  Row, Col, FormGroup, FormControl, ControlLabel,
  ListGroupItem, Button, Overlay
} from 'react-bootstrap';
import Dropzone from 'react-dropzone';
import EditorFetcher from 'src/fetchers/EditorFetcher';
import ImageModal from 'src/components/common/ImageModal';
import SaveEditedImageWarning from 'src/apps/mydb/elements/details/researchPlans/SaveEditedImageWarning';
import debounce from 'es6-promise-debounce';
import {
  findIndex, cloneDeep, last, findKey
} from 'lodash';
import { absOlsTermId } from 'chem-generic-ui';
import Utils from 'src/utilities/Functions';
import Attachment from 'src/models/Attachment';
import AttachmentFetcher from 'src/fetchers/AttachmentFetcher';
import UserStore from 'src/stores/alt/stores/UserStore';
import GenericDS from 'src/models/GenericDS';
import GenericDSDetails from 'src/components/generic/GenericDSDetails';
import InboxActions from 'src/stores/alt/actions/InboxActions';
import InstrumentsFetcher from 'src/fetchers/InstrumentsFetcher';
import ChildOverlay from 'src/components/managingActions/ChildOverlay';
import HyperLinksSection from 'src/components/common/HyperLinksSection';
import ImageAnnotationModalSVG from 'src/apps/mydb/elements/details/researchPlans/ImageAnnotationModalSVG';
import PropTypes from 'prop-types';
import {
  downloadButton,
  removeButton,
  annotateButton,
  editButton,
  sortingAndFilteringUI,
  formatFileSize,
  isImageFile,
  moveBackButton
} from 'src/apps/mydb/elements/list/AttachmentList';
import { formatDate, parseDate } from 'src/utilities/timezoneHelper';

export default class ContainerDatasetModalContent extends Component {
  constructor(props) {
    super();
    const datasetContainer = { ...props.datasetContainer };
    this.state = {
      datasetContainer,
      instruments: null,
      valueBeforeFocus: null,
      timeoutReference: null,
      attachmentEditor: false,
      extension: null,
      imageEditModalShown: false,
      filteredAttachments: [...props.datasetContainer.attachments],
      filterText: '',
      sortBy: 'name',
      sortDirection: 'asc',
    };
    this.timeout = 6e2; // 600ms timeout for input typing
    this.doneInstrumentTyping = this.doneInstrumentTyping.bind(this);
    this.handleInputChange = this.handleInputChange.bind(this);
    this.handleAddLink = this.handleAddLink.bind(this);
    this.handleRemoveLink = this.handleRemoveLink.bind(this);
    this.handleDSChange = this.handleDSChange.bind(this);
    this.editorInitial = this.editorInitial.bind(this);
    this.createAttachmentPreviews = this.createAttachmentPreviews.bind(this);
    this.handleDownloadOriginal = this.handleDownloadOriginal.bind(this);
    this.handleDownloadAnnotated = this.handleDownloadAnnotated.bind(this);
    this.handleEdit = this.handleEdit.bind(this);
    this.handleFilterChange = this.handleFilterChange.bind(this);
    this.handleSortChange = this.handleSortChange.bind(this);
    this.toggleSortDirection = this.toggleSortDirection.bind(this);
    this.handleAttachmentRemove = this.handleAttachmentRemove.bind(this);
    this.handleAttachmentBackToInbox = this.handleAttachmentBackToInbox.bind(this);
  }

  componentDidMount() {
    this.editorInitial();
    this.createAttachmentPreviews();
  }

  componentDidUpdate(prevProps) {
    const { datasetContainer } = this.props;
    if (datasetContainer.attachments !== prevProps.datasetContainer.attachments) {
      this.createAttachmentPreviews();
      this.setState({ filteredAttachments: [...datasetContainer.attachments] }, this.filterAndSortAttachments);
    }
  }

  handleInputChange(type, event) {
    const { datasetContainer } = this.state;
    const { value } = event.target;
    switch (type) {
      case 'name':
        datasetContainer.name = value;
        break;
      case 'instrument':
        datasetContainer.extended_metadata.instrument = value;
        break;
      case 'description':
        datasetContainer.description = value;
        break;
      case 'dataset':
        datasetContainer.dataset = value;
        break;
      default:
        console.warn(`Unhandled input type: ${type}`);
        break;
    }
    this.setState({ datasetContainer });
  }

  handleDSChange(ds) {
    this.handleInputChange('dataset', { target: { value: ds } });
  }

  handleFileDrop(files) {
    const { datasetContainer } = this.state;
    const attachments = files.map((f) => Attachment.fromFile(f));
    const firstAttach = datasetContainer.attachments.length === 0;
    datasetContainer.attachments = datasetContainer.attachments.concat(attachments);
    if (firstAttach) {
      let attachName = attachments[0].filename;
      const splitted = attachName.split('.');
      if (splitted.length > 1) {
        splitted.splice(-1, 1);
        attachName = splitted.join('.');
      }
      datasetContainer.name = attachName;
    }

    this.setState({
      datasetContainer,
      filteredAttachments: [...datasetContainer.attachments]
    }, () => {
      this.props.onChange({ ...this.state.datasetContainer });
    });
  }

  handleAttachmentRemove(attachment) {
    const { datasetContainer } = this.state;
    const index = datasetContainer.attachments.indexOf(attachment);
    datasetContainer.attachments[index].is_deleted = true;
    this.setState({ datasetContainer });
  }

  handleAttachmentBackToInbox(attachment) {
    const { onChange } = this.props;
    const { datasetContainer } = this.state;
    const index = datasetContainer.attachments.indexOf(attachment);
    if (index !== -1) {
      InboxActions.backToInbox(attachment);
      datasetContainer.attachments.splice(index, 1);
      onChange(datasetContainer);
    }
  }

  handleUndo(attachment) {
    const { datasetContainer } = this.state;
    const index = datasetContainer.attachments.indexOf(attachment);

    datasetContainer.attachments[index].is_deleted = false;
    this.setState({ datasetContainer });
  }

  // the next method is used in ContainerDatasetModal.js please ignore eslint warning
  // eslint-disable-next-line react/no-unused-class-component-methods
  handleSave() {
    const { datasetContainer } = this.state;
    const { onChange, onModalHide } = this.props;
    onChange(datasetContainer);
    onModalHide();
  }

  handleInstrumentValueChange(event, doneInstrumentTyping) {
    const { value } = event.target;
    const { timeoutReference } = this.state;
    if (!value) {
      this.resetInstrumentComponent();
      return;
    }
    if (timeoutReference) {
      clearTimeout(timeoutReference);
    }
    this.setState({
      value,
      timeoutReference: setTimeout(() => {
        doneInstrumentTyping();
      }, this.timeout),
    });
    this.handleInputChange('instrument', event);
  }

  handleAddLink(link) {
    const { datasetContainer } = this.state;
    if (datasetContainer.extended_metadata.hyperlinks == null) {
      datasetContainer.extended_metadata.hyperlinks = [link];
    } else {
      datasetContainer.extended_metadata.hyperlinks.push(link);
    }
    this.setState({ datasetContainer });
  }

  handleRemoveLink(link) {
    const { datasetContainer } = this.state;
    const index = datasetContainer.extended_metadata.hyperlinks.indexOf(link);
    if (index !== -1) {
      datasetContainer.extended_metadata.hyperlinks.splice(index, 1);
    }
    this.setState({ datasetContainer });
  }

  handleDownloadAnnotated = (attachment) => {
    const isImage = isImageFile(attachment.filename);
    if (isImage && !attachment.isNew) {
      Utils.downloadFile({
        contents: `/api/v1/attachments/${attachment.id}/annotated_image`,
        name: attachment.filename
      });
    }
  };

  handleDownloadOriginal = (attachment) => {
    Utils.downloadFile({
      contents: `/api/v1/attachments/${attachment.id}`,
      name: attachment.filename,
    });
  };

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

          this.props.onChange(attachment);
        } else {
          alert('Unauthorized to edit this file.');
        }
      });
  }

  toggleSortDirection = () => {
    this.setState((prevState) => ({
      sortDirection: prevState.sortDirection === 'asc' ? 'desc' : 'asc'
    }), this.filterAndSortAttachments);
  };

  handleFilterChange = (e) => {
    this.setState({ filterText: e.target.value }, this.filterAndSortAttachments);
  };

  handleSortChange = (e) => {
    this.setState({ sortBy: e.target.value }, this.filterAndSortAttachments);
  };

  filterAndSortAttachments() {
    const { filterText, sortBy } = this.state;

    const filteredAttachments = this.props.datasetContainer.attachments.filter((
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

  resetInstrumentComponent() {
    const { datasetContainer } = this.state;
    this.setState({
      value: '',
      showInstruments: false,
      instruments: null,
      valueBeforeFocus: null,
      error: '',
    });
    datasetContainer.extended_metadata.instrument = '';
  }

  doneInstrumentTyping() {
    const { value } = this.state;
    if (!value) {
      this.resetInstrumentComponent();
    } else {
      this.fetchInstruments(value);
    }
  }

  fetchInstruments(value, show = true) {
    const debounced = debounce((query) => InstrumentsFetcher.fetchInstrumentsForCurrentUser(query), 200);
    debounced(value)
      .then((result) => {
        const newState = {};
        if (result.length > 0) {
          newState.instruments = result;
          newState.showInstruments = show;
        } else {
          newState.instruments = null;
          newState.error = '';
          newState.showInstruments = false;
        }
        this.setState(newState);
      })
      .catch((error) => console.log(error));
  }

  selectInstrument() {
    const { datasetContainer, timeoutReference, value } = this.state;

    this.setState({
      showInstruments: false,
      valueBeforeFocus: null,
    });

    if (!value || value.trim() === '') {
      this.setState({ value: '' });
      return 0;
    }
    datasetContainer.extended_metadata.instrument = value;
    clearTimeout(timeoutReference);
    return value;
  }

  focusInstrument(newFocus) {
    const { instruments, valueBeforeFocus } = this.state;
    const newState = {};
    if (!valueBeforeFocus) {
      newState.valueBeforeFocus = instruments[newFocus].name;
    }
    newState.value = instruments[newFocus].name;
    this.setState(newState);
  }

  abortAutoSelection() {
    const { valueBeforeFocus } = this.state;
    this.setState({
      value: valueBeforeFocus,
      valueBeforeFocus: null,
    });
  }

  createAttachmentPreviews() {
    const { datasetContainer } = this.props;
    datasetContainer.attachments.map((attachment) => {
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

  customDropzone() {
    return (
      <Dropzone
        onDrop={(files) => this.handleFileDrop(files)}
        className="attachment-dropzone"
      >
        Drop files here, or click to upload.
      </Dropzone>
    );
  }

  renderImageEditModal() {
    const { chosenAttachment, imageEditModalShown } = this.state;
    const { onChange } = this.props;
    return (
      <ImageAnnotationModalSVG
        attachment={chosenAttachment}
        isShow={imageEditModalShown}
        handleSave={
          () => {
            const newAnnotation = document.getElementById('svgEditId').contentWindow.svgEditor.svgCanvas.getSvgString();
            chosenAttachment.updatedAnnotation = newAnnotation;
            this.setState({ imageEditModalShown: false });
            onChange(chosenAttachment);
          }
        }
        handleOnClose={() => { this.setState({ imageEditModalShown: false }); }}
      />
    );
  }

  renderInstruments() {
    const { instruments, error } = this.state;

    if (instruments) {
      return (
        <div>
          {instruments.map((instrument, index) => (
            <ListGroupItem
              onClick={() => this.selectInstrument()}
              onMouseEnter={() => this.focusInstrument(index)}
              key={`instrument_${index}`}
              ref={`instrument_${index}`}
              header={instrument.name}
            />
          ))}
        </div>
      );
    } if (error) {
      return <ListGroupItem>{error}</ListGroupItem>;
    }
    return <div />;
  }

  renderAttachments() {
    const {
      filteredAttachments, sortDirection, attachmentEditor, extension
    } = this.state;
    const { datasetContainer } = this.props;

    return (
      <div className="attachment-main-container">
        {this.renderImageEditModal()}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ flex: '1', alignSelf: 'center' }}>
            {this.customDropzone()}
          </div>
          <div style={{ marginLeft: '20px', alignSelf: 'center' }}>
            {datasetContainer.attachments.length > 0
        && sortingAndFilteringUI(
          sortDirection,
          this.handleSortChange,
          this.toggleSortDirection,
          this.handleFilterChange
        )}
          </div>
        </div>
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
                    width: '45px',
                    height: '45px',
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
                  &nbsp;&nbsp;&nbsp;|&nbsp;&nbsp;&nbsp;
                  <div>
                    Size:&nbsp;
                    <span style={{ fontWeight: 'bold', color: '#444' }}>
                      {formatFileSize(attachment.filesize)}
                    </span>
                  </div>
                </div>

              </div>
              <div className="attachment-row-actions" style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                {attachment.is_deleted ? (
                  <Button
                    bsSize="xs"
                    bsStyle="danger"
                    className="attachment-button-size"
                    onClick={() => this.handleUndo(attachment)}
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
                    {moveBackButton(attachment, this.handleAttachmentBackToInbox, this.props.readOnly)}
                    &nbsp;
                    {removeButton(attachment, this.handleAttachmentRemove, this.props.readOnly)}
                  </>
                )}
              </div>
              {attachment.updatedAnnotation && <SaveEditedImageWarning visible />}
            </div>
          ))
        )}
        <HyperLinksSection
          data={this.state.datasetContainer.extended_metadata.hyperlinks}
          onAddLink={this.handleAddLink}
          onRemoveLink={this.handleRemoveLink}
          disabled={this.props.disabled}
        />
      </div>
    );
  }

  renderMetadata() {
    const { datasetContainer, showInstruments } = this.state;
    const { readOnly, disabled, kind } = this.props;
    const termId = absOlsTermId(kind);
    const klasses = (UserStore.getState() && UserStore.getState().dsKlasses) || [];
    let klass = {};
    const idx = findIndex(klasses, (o) => o.ols_term_id === termId);
    if (idx > -1) {
      klass = klasses[idx];
    }

    let genericDS = {};
    if (datasetContainer?.dataset?.id) {
      genericDS = datasetContainer.dataset;
    } else if (klass.ols_term_id !== undefined) {
      genericDS = GenericDS.buildEmpty(cloneDeep(klass), datasetContainer.id);
    }
    return (
      <>
        <FormGroup controlId="datasetInstrument">
          <ControlLabel>Instrument</ControlLabel>
          <FormControl
            type="text"
            value={datasetContainer.extended_metadata.instrument || ''}
            disabled={readOnly || disabled}
            onChange={(event) => this.handleInstrumentValueChange(
              event,
              this.doneInstrumentTyping
            )}
            ref={(input) => {
              this.autoComplete = input;
            }}
            autoComplete="off"
          />
          <Overlay
            placement="bottom"
            show={showInstruments}
            container={this}
            rootClose
            onHide={() => this.abortAutoSelection()}
          >
            <ChildOverlay
              dataList={this.renderInstruments()}
              overlayAttributes={{
                style: {
                  position: 'absolute',
                  width: 300,
                  marginTop: 144,
                  marginLeft: 17,
                },
              }}
            />
          </Overlay>
        </FormGroup>
        <FormGroup controlId="datasetDescription">
          <ControlLabel>Description</ControlLabel>
          <FormControl
            componentClass="textarea"
            value={datasetContainer.description || ''}
            disabled={readOnly || disabled}
            onChange={(event) => this.handleInputChange('description', event)}
            rows={4}
          />
        </FormGroup>
        <GenericDSDetails
          genericDS={genericDS}
          klass={klass}
          kind={kind}
          onChange={this.handleDSChange}
        />
      </>
    );
  }

  render() {
    const { mode } = this.props;

    return (
      <Row>
        <Col md={12}>
          {mode === 'attachments' && this.renderAttachments()}
          {mode === 'metadata' && this.renderMetadata()}
        </Col>
      </Row>
    );
  }
}

ContainerDatasetModalContent.propTypes = {
  datasetContainer: PropTypes.shape({
    name: PropTypes.string.isRequired,
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
  }).isRequired,
  onChange: PropTypes.func.isRequired,
  onModalHide: PropTypes.func.isRequired,
  readOnly: PropTypes.bool,
  disabled: PropTypes.bool,
  kind: PropTypes.string.isRequired,
  mode: PropTypes.oneOf(['attachments', 'metadata']),
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
};

ContainerDatasetModalContent.defaultProps = {
  mode: 'attachments',
  disabled: false,
  readOnly: false,
  attachments: [],
};
