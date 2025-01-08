/* eslint-disable react/display-name */
/* eslint-disable arrow-body-style */
import React, { useImperativeHandle, forwardRef, useState } from 'react';
import PropTypes from 'prop-types';
import { Button, ButtonToolbar } from 'react-bootstrap';
import Dropzone from 'react-dropzone';
import SaveEditedImageWarning from 'src/apps/mydb/elements/details/researchPlans/SaveEditedImageWarning';
import {
  downloadButton,
  removeButton,
  annotateButton,
  formatFileSize,
  attachmentThumbnail,
} from 'src/apps/mydb/elements/list/AttachmentList';
import { formatDate } from 'src/utilities/timezoneHelper';
import ImageAnnotationModalSVG from 'src/apps/mydb/elements/details/researchPlans/ImageAnnotationModalSVG';
import { observer } from 'mobx-react';

const classifyAttachments = (attachments) => {
  return {
    Pending: attachments.filter((attachment) => attachment.is_pending && !attachment.is_deleted) || [],
    Original: attachments.filter((attachment) => !attachment.is_pending && !attachment.is_deleted) || [],
  };
};

const AttachmentsModalContent = forwardRef(({ datasetContainer, onChange, readOnly }, ref) => {
  const [attachments, setAttachments] = useState([...datasetContainer.attachments]);
  const [attachmentGroups, setAttachmentGroups] = useState(classifyAttachments(datasetContainer.attachments));
  const [imageEditModalShown, setImageEditModalShown] = useState(false);
  const [chosenAttachment, setChosenAttachment] = useState(null);

  const updateAttachments = (newAttachments) => {
    setAttachments(newAttachments);
    setAttachmentGroups(classifyAttachments(newAttachments));
    onChange({ ...datasetContainer, attachments: newAttachments });
  };

  useImperativeHandle(ref, () => ({
    handleSave: () => {
      const savedAttachments = attachments.map((attachment) => ({
        ...attachment,
        is_pending: false,
      }));
      setAttachments(savedAttachments);
      setAttachmentGroups(classifyAttachments(savedAttachments));
      onChange({ ...datasetContainer, attachments: savedAttachments });
    },
    getUpdatedAttachments: () => attachments,
  }));

  const handleFileDrop = (files) => {
    const newAttachments = files.map((file) => ({
      id: Date.now(),
      filename: file.name,
      filesize: file.size,
      is_pending: true,
      is_deleted: false,
    }));

    const updatedAttachments = [...attachments, ...newAttachments];
    updateAttachments(updatedAttachments);
  };

  const handleAttachmentRemove = (attachment) => {
    const updatedAttachments = attachments.map((a) => (a.id === attachment.id ? { ...a, is_deleted: true } : a));
    updateAttachments(updatedAttachments);
  };

  const handleUndo = (attachment) => {
    const updatedAttachments = attachments.map((a) => (a.id === attachment.id ? { ...a, is_deleted: false } : a));
    updateAttachments(updatedAttachments);
  };

  const renderAttachmentRow = (attachment) => (
    <div className="attachment-row" key={attachment.id}>
      {attachmentThumbnail(attachment)}
      <div className="attachment-row-text" title={attachment.filename}>
        {attachment.is_deleted ? <strike>{attachment.filename}</strike> : attachment.filename}
        <div className="attachment-row-subtext">
          <div>
            Created:
            {' '}
            <span className="ms-1">
              {formatDate(attachment.created_at || Date.now())}
              {' '}
            </span>
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
        {attachment.is_deleted ? (
          <Button
            size="sm"
            variant="danger"
            className="attachment-button-size"
            onClick={() => handleUndo(attachment)}
          >
            <i className="fa fa-undo" aria-hidden="true" />
          </Button>
        ) : (
          <ButtonToolbar className="gap-1">
            {downloadButton(attachment)}
            {annotateButton(attachment, () => {
              setImageEditModalShown(true);
              setChosenAttachment(attachment);
            })}
            {removeButton(attachment, handleAttachmentRemove, readOnly)}
          </ButtonToolbar>
        )}
      </div>
      {attachment.updatedAnnotation && <SaveEditedImageWarning visible />}
    </div>
  );

  const renderGroup = (attachments, title) => (
    <div key={title} className="mt-2">
      <div className="fw-bold mb-2 border rounded p-1" style={{ backgroundColor: '#D3D3D3' }}>
        {title}
      </div>
      {attachments.map((attachment) => renderAttachmentRow(attachment))}
    </div>
  );

  const renderAttachments = () => (
    <div className="p-2 border rounded">
      {imageEditModalShown && (
        <ImageAnnotationModalSVG
          attachment={chosenAttachment}
          isShow={imageEditModalShown}
          handleSave={() => setImageEditModalShown(false)}
          handleOnClose={() => setImageEditModalShown(false)}
        />
      )}
      <div className="d-flex justify-content-between align-items-center">
        <Dropzone onDrop={handleFileDrop} className="attachment-dropzone">
          Drop files here, or click to upload.
        </Dropzone>
      </div>
      {attachmentGroups.Pending.length === 0 && attachmentGroups.Original.length === 0 ? (
        <div className="no-attachments-text">There are currently no attachments.</div>
      ) : (
        <>
          {attachmentGroups.Pending.length > 0
            && renderGroup(attachmentGroups.Pending, 'Pending')}
          {attachmentGroups.Original.length > 0
            && renderGroup(attachmentGroups.Original, 'Original')}
        </>
      )}
    </div>
  );
  return <div>{renderAttachments()}</div>;
});

AttachmentsModalContent.propTypes = {
  datasetContainer: PropTypes.shape({
    attachments: PropTypes.arrayOf(
      PropTypes.shape({
        id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
        filename: PropTypes.string.isRequired,
        filesize: PropTypes.number.isRequired,
        is_deleted: PropTypes.bool,
      })
    ),
  }).isRequired,
  onChange: PropTypes.func.isRequired,
  readOnly: PropTypes.bool,
  disabled: PropTypes.bool,
};

export default observer(AttachmentsModalContent);
