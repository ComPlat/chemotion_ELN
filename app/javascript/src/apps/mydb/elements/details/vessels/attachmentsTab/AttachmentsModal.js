/* eslint-disable react/function-component-definition */
import React, { useState, useRef } from 'react';
import PropTypes from 'prop-types';
import {
  Modal, Button,
} from 'react-bootstrap';
import AttachmentsModalContent from 'src/apps/mydb/elements/details/vessels/attachmentsTab/AttachmentsModalContent';

const AttachmentsModal = ({
  show, onHide, onChange, readOnly = false, disabled = false, kind = null, datasetContainer,
}) => {
  const datasetInput = useRef(null);
  const [isNameEditing, setIsNameEditing] = useState(false);
  const [localName, setLocalName] = useState(datasetContainer.name);

  const handleSave = () => {
    if (datasetInput.current) {
      datasetInput.current.handleSave();
      const updatedAttachments = datasetInput.current.getUpdatedAttachments();
      const updatedDatasetContainer = {
        ...datasetContainer,
        attachments: updatedAttachments,
        name: localName,
      };
      onChange(updatedDatasetContainer);
      onHide();
    }
  };

  const handleModalClose = (event) => {
    if (event && event.type === 'keydown' && event.key === 'Escape') {
      handleSave();
    } else {
      onHide();
    }
  };

  const handleNameChange = (newName) => {
    setLocalName(newName);
  };

  const toggleNameEditing = () => {
    setIsNameEditing((prev) => !prev);
  };

  if (show) {
    return (
      <Modal
        centered
        show={show}
        size="xl"
        onHide={() => (disabled ? onHide() : handleModalClose())}
      >
        <Modal.Header>
          <Modal.Title className="d-flex justify-content-between align-items-center w-100">
            {isNameEditing ? (
              <div className="d-flex flex-grow-1 align-items-center">
                <input
                  type="text"
                  value={localName}
                  onBlur={toggleNameEditing}
                  onKeyPress={(event) => {
                    if (event.key === 'Enter') {
                      handleNameChange(event.target.value);
                      toggleNameEditing();
                    }
                  }}
                  onChange={(e) => { handleNameChange(e.target.value); }}
                />
              </div>
            ) : (
              <div className="d-flex flex-grow-1">
                <span className="me-2">{localName}</span>
                {!readOnly && (
                  <i
                    className="fa fa-pencil text-primary mt-1"
                    aria-hidden="true"
                    onClick={toggleNameEditing}
                    role="button"
                  />
                )}
              </div>
            )}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <AttachmentsModalContent
            ref={datasetInput}
            readOnly={false}
            datasetContainer={datasetContainer}
            onModalHide={onHide}
            onChange={onChange}
          />
        </Modal.Body>
        <Modal.Footer className="d-flex justify-content-between align-items-center modal-footer border-0">
          <div>
            <small>
              Changes are kept for this session. Remember to save the element itself to persist changes.
            </small>
          </div>
          <Button
            variant="primary"
            className="align-self-center ms-auto"
            onClick={handleSave}
          >
            Keep Changes
          </Button>
        </Modal.Footer>
      </Modal>
    );
  }
  return null;
};

AttachmentsModal.propTypes = {
  show: PropTypes.bool.isRequired,
  datasetContainer: PropTypes.shape({
    name: PropTypes.string.isRequired,
    extended_metadata: PropTypes.shape({
      instrument: PropTypes.string,
    }),
  }).isRequired,
  onHide: PropTypes.func.isRequired,
  onChange: PropTypes.func.isRequired,
  readOnly: PropTypes.bool,
  disabled: PropTypes.bool,
  kind: PropTypes.string,
};

export default AttachmentsModal;
