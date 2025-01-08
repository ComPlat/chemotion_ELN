import React, { useContext, useState } from 'react';
import { StoreContext } from 'src/stores/mobx/RootStore';
import { observer } from 'mobx-react';
import { Button } from 'react-bootstrap';
import Container from 'src/models/Container';
import ElementStore from 'src/stores/alt/stores/ElementStore';
import AttachmentDropzone from 'src/components/container/AttachmentDropzone';
import ContainerDatasetModal from 'src/components/container/ContainerDatasetModal';
import AttachmentsModal from 'src/apps/mydb/elements/details/vessels/attachmentsTab/AttachmentsModal';

const AttachmentsContainer = ({ item }) => {
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
  
    const handleModalHide = (setModal) => {
      setModal((prevModal) => ({
        ...prevModal,
        show: false,
        datasetContainer: null,
      }));
    
      // Ensure the body class is updated
      document.body.className = document.body.className.replace('modal-open', '');
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
        handleChange(updatedContainer);

    }
    
  const  handleChange = (updatedContainer, changed = false) => {
        // const { item } = this.props;
        if (changed) {
          const { vesselDetailsStore } = context;
          vesselDetailsStore.getVessel(item.id).markChanged(true);
        }
        setContainer(updatedContainer);
  }
    
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
        onChange(updatedContainer);
      };
  

  return (
    <div className='bg-gray-200'>
    <div className="border rounded p-2 mb-2">
      <p>There are currently no attachments.</p>
      <div className="list-group">
        <div key="attachmentdropzone" className="list-group-item disabled">
          <AttachmentDropzone
            handleAddWithAttachments={handleAddWithAttachments}
          />
        </div>
      </div>
      <div className="d-flex justify-content-end mt-2 mb-0">
        <Button size="sm" variant="success" onClick={handleAdd}>
            <i className="fa fa-plus" />
        </Button>
      </div>
      {modal.show && modal.datasetContainer && (
        <AttachmentsModal
         onHide={() => handleModalHide(setModal)}
         onChange={(datasetContainer) => handleChange(datasetContainer)}
         kind={null}
         show={modal.show}
         readOnly={false}
         datasetContainer={modal.datasetContainer}
         analysisContainer={modal.analysisContainer}
         disabled={false}
        />
       )}
    </div>
  </div>
  )
}

export default AttachmentsContainer;
