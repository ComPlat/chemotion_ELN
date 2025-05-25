import React, { useContext, useState } from 'react';
import { StoreContext } from 'src/stores/mobx/RootStore';
import { observer } from 'mobx-react';
import { Button } from 'react-bootstrap';
import ElementStore from 'src/stores/alt/stores/ElementStore';
import ContainerDatasets from 'src/components/container/ContainerDatasets';
import PropTypes from 'prop-types';
import VesselsFetcher from 'src/fetchers/VesselsFetcher';
import UIStore from 'src/stores/alt/stores/UIStore';

function VesselAttachmentsContainer({ item, targetTemplateAttachments = false }) {
  const { vesselDetailsStore } = useContext(StoreContext);
  const { currentElement } = ElementStore.getState();
  const { currentCollection } = UIStore.getState();
  const collectionId = currentCollection?.id;
  const currentContainer = item?.container?.children?.[0] || { children: [] };

  const [container, setContainer] = useState(currentContainer);

  const handleAddAttachment = () => {
    const newContainer = vesselDetailsStore.addEmptyContainer(item.id);
    const vessel = vesselDetailsStore.getVessel(item.id);
    if (!vessel) return;
  
    const updatedChildren = [...(vessel.container?.children || []), newContainer];
    const updatedContainer = {
      ...vessel.container,
      children: updatedChildren,
    };
  
    vesselDetailsStore.setContainer(item.id, updatedContainer);
    setContainer(updatedContainer);
  }; 

  const handleChange = async (updatedContainer) => {
    const vessel = vesselDetailsStore.getVessel(item.id);

    if (!vessel) return;
  
    vesselDetailsStore.setContainer(item.id, updatedContainer);
  
    if (targetTemplateAttachments && vessel.vesselTemplateId) {
      try {
        if (!vessel.container?.id) {
          const root = await fetch('/api/v1/containers', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Accept: 'application/json',
            },
            credentials: 'same-origin',
            body: JSON.stringify({
              container_type: 'root',
              containable_id: vessel.vesselTemplateId,
              containable_type: 'VesselTemplate',
            }),
          }).then(res => res.json());
  
          updatedContainer.id = root.id;
          updatedContainer.is_new = false;
        }
  
        await VesselsFetcher.updateVesselTemplate(
          vessel.vesselTemplateId,
          { ...vessel, container: updatedContainer },
          collectionId
        );
      } catch (e) {
        console.error('Error saving template attachments:', e);
        NotificationActions.add(errorMessageParameter);
      }
    }
  
    setContainer(updatedContainer);
  };

  return (
    <div className="analysis-container">
      {container.children.length === 0 ? (
        <Button variant="success" size="xsm" onClick={handleAddAttachment}>
          Add Attachment
        </Button>
      ) : (
        <ContainerDatasets
          container={container}
          readOnly={false}
          disabled={false}
          onChange={handleChange}
        />
      )}
    </div>
  );
}

VesselAttachmentsContainer.propTypes = {
  item: PropTypes.shape({
    id: PropTypes.string.isRequired,
  }).isRequired,
};

export default observer(VesselAttachmentsContainer);
