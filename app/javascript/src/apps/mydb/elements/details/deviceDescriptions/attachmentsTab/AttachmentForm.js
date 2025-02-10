import React, { useContext, useEffect } from 'react';
import { ButtonToolbar } from 'react-bootstrap';

import EditorFetcher from 'src/fetchers/EditorFetcher';
import Attachment from 'src/models/Attachment';

import ImageAnnotationModalSVG from 'src/apps/mydb/elements/details/researchPlans/ImageAnnotationModalSVG';
import { last, findKey } from 'lodash';
import SaveEditedImageWarning from 'src/apps/mydb/elements/details/researchPlans/SaveEditedImageWarning';
import {
  undoButton,
  downloadButton,
  removeButton,
  editButton,
  importButton,
  annotateButton,
  customDropzone,
  sortingAndFilteringUI,
  formatFileSize,
  attachmentThumbnail,
  ThirdPartyAppButton
} from 'src/apps/mydb/elements/list/AttachmentList';
import { formatDate, parseDate } from 'src/utilities/timezoneHelper';

import UIStore from 'src/stores/alt/stores/UIStore';
import { observer } from 'mobx-react';
import { StoreContext } from 'src/stores/mobx/RootStore';

const AttachmentForm = ({ readonly }) => {
  const deviceDescriptionsStore = useContext(StoreContext).deviceDescriptions;
  let deviceDescription = deviceDescriptionsStore.device_description;
  const { thirdPartyApps } = UIStore.getState() || [];

  useEffect(() => {
    editorInitial();
    createAttachmentPreviewImage();
  }, []);

  useEffect(() => {
    if (deviceDescription.updated) {
      createAttachmentPreviewImage();
    }
  }, [deviceDescription.attachments]);

  const editorInitial = () => {
    EditorFetcher.initial().then((result) => {
      deviceDescriptionsStore.setAttachmentEditor(result.installed);
      deviceDescriptionsStore.setAttachmentExtension(result.ext);
    });
  }

  const createAttachmentPreviewImage = () => {
    const attachments = deviceDescription.attachments.map((attachment) => {
      if (attachment.preview !== undefined && attachment.preview !== '') { return attachment; }

      attachment.preview = attachment.thumb
        ? `data:image/png;base64,${attachment.thumbnail}`
        : '/images/wild_card/not_available.svg';
      return attachment;
    });
    deviceDescriptionsStore.setFilteredAttachments(attachments);
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

  const updateEditedAttachment = (attachment) => {
    let attachments = [];
    deviceDescription.attachments.map((currentAttachment) => {
      if (currentAttachment.id === attachment.id) {
        attachments.push(attachment);
      } else {
        attachments.push(currentAttachment);
      }
    });
    deviceDescriptionsStore.changeDeviceDescription('attachments', attachments);
    deviceDescriptionsStore.setFilteredAttachments(deviceDescriptionsStore.device_description.attachments);
  }

  const handleEditAnnotation = (annotation) => {
    let selectedAttachment = { ...deviceDescriptionsStore.attachment_selected };
    selectedAttachment.updatedAnnotation = annotation;
    updateEditedAttachment(selectedAttachment);
  }

  const handleEditAttachment = (attachment) => {
    const fileType = last(attachment.filename.split('.'));
    const docType = documentType(attachment.filename);

    EditorFetcher.startEditing({ attachment_id: attachment.id })
      .then((result) => {
        if (result.token) {
          const url = `/editor?id=${attachment.id}&docType=${docType}
          &fileType=${fileType}&title=${attachment.filename}&key=${result.token}
          &only_office_token=${result.only_office_token}`;
          window.open(url, '_blank');

          attachment.aasm_state = 'oo_editing';
          attachment.updated_at = new Date();

          updateEditedAttachment(attachment);
        } else {
          alert('Unauthorized to edit this file.');
        }
      });
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

  const openAnnotateModal = (attachment) => {
    deviceDescriptionsStore.toogleAttachmentModal();
    deviceDescriptionsStore.setAttachmentSelected(attachment);
  }

  const attachmentRowActions = (attachment) => {
    const updatedAt = new Date(attachment.updated_at).getTime() + 15 * 60 * 1000;
    const isEditing = attachment.aasm_state === 'oo_editing' && new Date().getTime() < updatedAt;
    const editDisable =
      !deviceDescriptionsStore.attachment_editor || attachment.aasm_state === 'oo_editing'
      || attachment.is_new || documentType(attachment.filename) === null;

    return (
      <ButtonToolbar className="gap-1">
        {downloadButton(attachment)}
        <ThirdPartyAppButton attachment={attachment} options={thirdPartyApps} />
        {editButton(
          attachment,
          deviceDescriptionsStore.attachment_extension,
          deviceDescriptionsStore.attachment_editor,
          isEditing,
          editDisable,
          handleEditAttachment
        )}
        {annotateButton(attachment, () => openAnnotateModal(attachment))}
        {importButton(
          attachment,
          deviceDescriptionsStore.attachment_show_import_confirm,
          deviceDescription.changed,
          showImportConfirm,
          hideImportConfirm,
          confirmAttachmentImport
        )}
        <div className="ms-2">
          {removeButton(attachment, onDelete, readonly)}
        </div>
      </ButtonToolbar>
    );
  }

  const showList = () => {
    let attachmentList = [];

    deviceDescriptionsStore.filteredAttachments.map((attachment) => {
      const rowTextClass = attachment.is_deleted ? ' text-decoration-line-through' : '';

      attachmentList.push(
        <div className="attachment-row" key={attachment.id}>
          {
            attachment.is_deleted
              ? <i className="fa fa-ban text-body-tertiary fs-2 text-center d-block" />
              : attachmentThumbnail(attachment)
          }
          <div className={`attachment-row-text ${rowTextClass}`} title={attachment.filename}>
            {attachment.filename}
            <div className="attachment-row-subtext">
              <div>
                Created:
                <span className="ms-1">{formatDate(attachment.created_at)}</span>
              </div>
              <span className="ms-2 me-2">|</span>
              <div>
                Size:
                <span className="fw-bold text-gray-700 ms-1">
                  {formatFileSize(attachment.filesize)}
                </span>
              </div>
            </div>
          </div>
          <div className="attachment-row-actions d-flex justify-content-end align-items-center gap-1">
            {
              attachment.is_deleted
                ? undoButton(attachment, onUndoDelete)
                : attachmentRowActions(attachment)
            }
          </div>
          {attachment.updatedAnnotation && (
            <div className="position-absolute top-50 start-50 translate-middle text-nowrap h-auto lh-base">
              <SaveEditedImageWarning visible />
            </div>
          )}
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
    if (!deviceDescriptionsStore.attachment_image_edit_modal_shown) { return null; }

    return (
      <ImageAnnotationModalSVG
        attachment={deviceDescriptionsStore.attachment_selected}
        isShow={deviceDescriptionsStore.attachment_image_edit_modal_shown}
        handleSave={
          () => {
            const newAnnotation = document.getElementById('svgEditId').contentWindow.svgEditor.svgCanvas.getSvgString();
            deviceDescriptionsStore.toogleAttachmentModal();
            handleEditAnnotation(newAnnotation);
          }
        }
        handleOnClose={() => { deviceDescriptionsStore.toogleAttachmentModal() }}
      />
    );
  }

  return (
    <div className="p-3">
      {renderImageEditModal()}
      <div className="d-flex justify-content-between align-items-center gap-4 mb-4">
        <div className="flex-grow-1">
          {customDropzone(handleAttachmentDrop)}
        </div>
        {showFilter()}
      </div>
      {
        deviceDescriptionsStore.filteredAttachments.length === 0
          ? <div className="text-center text-gray-500 fs-5">There are currently no attachments.</div>
          : showList()
      }
    </div>
  );
}

export default observer(AttachmentForm);
