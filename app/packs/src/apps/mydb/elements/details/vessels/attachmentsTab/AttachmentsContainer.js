import React, { useContext, useState } from 'react';
import { StoreContext } from 'src/stores/mobx/RootStore';
import { observer } from 'mobx-react';
import { Button } from 'react-bootstrap';
import Container from 'src/models/Container';
import ElementStore from 'src/stores/alt/stores/ElementStore';
import AttachmentDropzone from 'src/components/container/AttachmentDropzone';
import AttachmentsModal from 'src/apps/mydb/elements/details/vessels/attachmentsTab/AttachmentsModal';
import ContainerDatasetField from 'src/components/container/ContainerDatasetField';

function AttachmentsContainer({ item }) {
  const { currentElement } = ElementStore.getState();
  const context = useContext(StoreContext);
  const [container, setContainer] = useState({
    children: [],
  });
  const [modal, setModal] = useState({
    show: false,
    datasetContainer: null,
  });

  const handleModalOpen = (datasetContainer = {}) => {
    setModal({
      ...modal,
      datasetContainer,
      show: true,
    });
  };

  const handleModalHide = () => {
    setModal({
      show: false,
      datasetContainer: null,
    });
    document.body.className = document.body.className.replace('modal-open', '');
  };

  const handleChange = (updatedDatasetContainer) => {
    const updatedChildren = container.children.map((child) =>
      child.id === updatedDatasetContainer.id ? updatedDatasetContainer : child
    );
    const updatedContainer = {
      ...container,
      children: updatedChildren,
    };
    setContainer(updatedContainer);
  };

  const handleAdd = () => {
    const datasetContainer = Container.buildEmpty();
    datasetContainer.container_type = 'dataset';

    const updatedContainer = {
      ...container,
      children: [...container.children, datasetContainer],
    };

    setContainer(updatedContainer);
    handleModalOpen(datasetContainer);
  };

  const handleAddWithAttachments = (attachments) => {
    const datasetContainer = Container.buildEmpty();
    datasetContainer.container_type = 'dataset';

    attachments.forEach((attachment) => {
      datasetContainer.attachments.push(attachment);
    });

    const updatedContainer = {
      ...container,
      children: [...container.children, datasetContainer],
    };

    setContainer(updatedContainer);
    handleModalOpen(datasetContainer);
  };

  const handleRemove = (datasetContainer) => {
    const updatedChildren = container.children.map((child) =>
      child.id === datasetContainer.id ? { ...child, is_deleted: true } : child
    );
    setContainer({
      ...container,
      children: updatedChildren,
    });
  };

  const handleUndo = (datasetContainer) => {
    const updatedChildren = container.children.map((child) =>
      child.id === datasetContainer.id ? { ...child, is_deleted: false } : child
    );
    setContainer({
      ...container,
      children: updatedChildren,
    });
  };

  const addButton = () => (
    <div className="d-flex justify-content-end mt-2 mb-0">
      <Button size="sm" variant="success" onClick={handleAdd}>
        <i className="fa fa-plus" />
      </Button>
    </div>
  );

  if (container.children.length > 0) {
    return (
      <div>
        <div className="border rounded p-2 mb-2">
          <div className="list-group">
            {container.children.map((datasetContainer, key) => (
              <div key={key} className="list-group-item">
                <ContainerDatasetField
                  datasetContainer={datasetContainer}
                  onChange={() => handleChange(datasetContainer)}
                  handleRemove={() => handleRemove(datasetContainer)}
                  handleUndo={() => handleUndo(datasetContainer)}
                  handleModalOpen={() => handleModalOpen(datasetContainer)}
                  disabled={false}
                  readOnly={false}
                />
              </div>
            ))}
            <div key="attachmentdropzone" className="list-group-item disabled">
              <AttachmentDropzone
                handleAddWithAttachments={handleAddWithAttachments}
              />
            </div>
          </div>
          {addButton()}
        </div>
        {modal.show && modal.datasetContainer && (
          <AttachmentsModal
            onHide={handleModalHide}
            onChange={handleChange}
            show={modal.show}
            readOnly={false}
            datasetContainer={modal.datasetContainer}
            analysisContainer={modal.analysisContainer}
            disabled={false}
          />
        )}
      </div>
    );
  }

  return (
    <div className="bg-gray-200">
      <div className="border rounded p-2 mb-2">
        <p>There are currently no attachments.</p>
        <div className="list-group">
          <div key="attachmentdropzone" className="list-group-item disabled">
            <AttachmentDropzone
              handleAddWithAttachments={handleAddWithAttachments}
            />
          </div>
        </div>
        {addButton()}
      </div>
    </div>
  );
}

export default AttachmentsContainer;
