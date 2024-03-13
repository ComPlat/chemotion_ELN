import React, { useContext, useEffect } from 'react';
import { Button } from 'react-bootstrap';

import EditorFetcher from 'src/fetchers/EditorFetcher';
import AttachmentFetcher from 'src/fetchers/AttachmentFetcher';
import Attachment from 'src/models/Attachment';

import ImageAnnotationModalSVG from 'src/apps/mydb/elements/details/researchPlans/ImageAnnotationModalSVG';
import { last, findKey } from 'lodash';
import ImageAttachmentFilter from 'src/utilities/ImageAttachmentFilter';
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
  attachmentThumbnail
} from 'src/apps/mydb/elements/list/AttachmentList';
import { formatDate, parseDate } from 'src/utilities/timezoneHelper';

import ElementActions from 'src/stores/alt/actions/ElementActions';
import LoadingActions from 'src/stores/alt/actions/LoadingActions';
import { observer } from 'mobx-react';
import { StoreContext } from 'src/stores/mobx/RootStore';

const AttachmentForm = ({ readonly }) => {
  const deviceDescriptionsStore = useContext(StoreContext).deviceDescriptions;
  let deviceDescription = deviceDescriptionsStore.device_description;

  useEffect(() => {
    console.log('init');
    editorInitial();
    deviceDescriptionsStore.setFilteredAttachments(deviceDescription.attachments);
  }, []);

  useEffect(() => {
    console.log('did update', deviceDescription.updated, deviceDescription);
    if (deviceDescription.updated) {
      deviceDescriptionsStore.setFilteredAttachments(deviceDescription.attachments);
    }
  }, [deviceDescription.attachments]);

  const editorInitial = () => {
    EditorFetcher.initial().then((result) => {
      deviceDescriptionsStore.setAttachmentEditor(result.installed);
      deviceDescriptionsStore.setAttachmentExtension(result.ext);
    });
  }

  const handleAttachmentImportComplete = () => {
    //this.setState({ activeTab: 0 });
  }

  const handleSortChange = (e) => {
    deviceDescriptionsStore.setAttachmentSortBy(e.target.value);
    filterAndSortAttachments();
  }

  const toggleSortDirection = () => {
    const sortDirection = deviceDescriptionsStore.attachment_sort_direction === 'asc' ? 'desc' : 'asc';
    deviceDescriptionsStore.setAttachmentSortDirectory(sortDirection);
    filterAndSortAttachments();
  }

  const handleFilterChange = (e) => {
    deviceDescriptionsStore.setAttachmentFilterText(e.target.value);
    filterAndSortAttachments();
  }

  const filterAndSortAttachments = () => {
    const filterText = deviceDescriptionsStore.attachment_filter_text.toLowerCase();
    const sortBy = deviceDescriptionsStore.attachment_sort_by;

    const filteredAttachments = deviceDescription.attachments.filter((attachment) => {
      return attachment.filename.toLowerCase().includes(filterText)
    });

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
      return deviceDescriptionsStore.attachment_sort_direction === 'asc' ? comparison : -comparison;
    });

    deviceDescriptionsStore.setFilteredAttachments(filteredAttachments);
  }

  const handleAttachmentDrop = (files) => {
    const newAttachments = files.map((file) => Attachment.fromFile(file));
    const updatedAttachments = deviceDescription.attachments.concat(newAttachments);
    deviceDescriptionsStore.changeDeviceDescription('attachments', updatedAttachments);
    deviceDescriptionsStore.setFilteredAttachments(deviceDescriptionsStore.device_description.attachments);
  }

  const handleEdit = () => {
    LoadingActions.start();
    const deviceDescriptionId = deviceDescription.id;
    const attachmentId = attachment.id;

    //ElementActions.importWellplateSpreadsheet(deviceDescriptionId, attachmentId);
  }

  const onUndoDelete = (attachment) => {
    const index = deviceDescription.attachments.indexOf(attachment);
    deviceDescriptionsStore.changeAttachment(index, 'is_deleted', false);
  }

  const onDelete = (attachment) => {
    const index = deviceDescription.attachments.indexOf(attachment);
    deviceDescriptionsStore.changeAttachment(index, 'is_deleted', true);
  }

  const documentType = (filename) => {
    const ext = last(filename.split('.'));
    const docType = findKey(deviceDescriptionsStore.attachment_extension, (o) => o.includes(ext));

    if (typeof docType === 'undefined' || !docType) {
      return null;
    }

    return docType;
  }

  const showImportConfirm = (attachmentId) => {
    deviceDescriptionsStore.attachment_show_import_confirm[attachmentId] = true;
    deviceDescriptionsStore.setShowImportConfirm(deviceDescriptionsStore.attachment_show_import_confirm);
  }

  const hideImportConfirm = (attachmentId) => {
    deviceDescriptionsStore.attachment_show_import_confirm[attachmentId] = false;
    deviceDescriptionsStore.setShowImportConfirm(deviceDescriptionsStore.attachment_show_import_confirm);
  }

  const confirmAttachmentImport = (attachment) => {
    hideImportConfirm(attachment.id);
  }

  const attachmentRowActions = (attachment) => {
    if (attachment.is_deleted) {
      return (
        <div className="attachment-row-actions" style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
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

    const updatedAt = new Date(attachment.updated_at).getTime() + 15 * 60 * 1000;
    const isEditing = attachment.aasm_state === 'oo_editing' && new Date().getTime() < updatedAt;
    const editDisable =
      !deviceDescriptionsStore.attachment_editor || attachment.aasm_state === 'oo_editing'
      || attachment.is_new || documentType(attachment.filename) === null;
    const importButtonRefs = [];

    return (
      <div className="attachment-row-actions" style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
        {downloadButton(attachment)}
        {editButton(
          attachment,
          deviceDescriptionsStore.attachment_extension,
          deviceDescriptionsStore.attachment_editor,
          isEditing,
          editDisable,
          handleEdit
        )}
        {annotateButton(attachment, this)}
        {importButton(
          attachment,
          deviceDescriptionsStore.attachment_show_import_confirm,
          deviceDescription.changed,
          importButtonRefs,
          showImportConfirm,
          hideImportConfirm,
          confirmAttachmentImport
        )}
        &nbsp;
        {removeButton(attachment, onDelete, readonly)}
      </div>
    );
  }

  const showList = () => {
    if (deviceDescriptionsStore.filteredAttachments.length === 0) {
      return (
        <div className="no-attachments-text">
          There are currently no attachments.
        </div>
      );
    }

    let attachmentList = [];

    deviceDescriptionsStore.filteredAttachments.map((attachment) => {
      attachmentList.push(
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
              &nbsp;&nbsp;&nbsp;|&nbsp;&nbsp;&nbsp;
              <div>
                Size:&nbsp;
                <span style={{ fontWeight: 'bold', color: '#444' }}>
                  {formatFileSize(attachment.filesize)}
                </span>
              </div>
            </div>
          </div>
          {attachmentRowActions(attachment)}
          {attachment.updatedAnnotation && <SaveEditedImageWarning visible />}
        </div>
      )
    });
    return attachmentList;
  }

  const showFilter = () => {
    if (deviceDescription.attachments.length === 0) { return null; }

    return (
      sortingAndFilteringUI(
        deviceDescriptionsStore.attachment_sort_direction,
        handleSortChange,
        toggleSortDirection,
        handleFilterChange,
        true
      )
    );
  }

  const renderImageEditModal = () => {
    //const { chosenAttachment, imageEditModalShown } = this.state;
    //const { onEdit } = this.props;
    //return (
    //  <ImageAnnotationModalSVG
    //    attachment={chosenAttachment}
    //    isShow={imageEditModalShown}
    //    handleSave={
    //      () => {
    //        const newAnnotation = document.getElementById('svgEditId').contentWindow.svgEditor.svgCanvas.getSvgString();
    //        chosenAttachment.updatedAnnotation = newAnnotation;
    //        this.setState({ imageEditModalShown: false });
    //        onEdit(chosenAttachment);
    //      }
    //    }
    //    handleOnClose={() => { this.setState({ imageEditModalShown: false }); }}
    //  />
    //);
    return null;
  }

  return (
    <div className="attachment-main-container">
      {renderImageEditModal()}
      <div>
        <div className="attachment-dropzone-filter">
          {customDropzone(handleAttachmentDrop)}
          {showFilter()}
        </div>
      </div>
      <div style={{ marginBottom: '10px' }}>
        {showList()}
      </div>
    </div>
  );
}

export default observer(AttachmentForm);
