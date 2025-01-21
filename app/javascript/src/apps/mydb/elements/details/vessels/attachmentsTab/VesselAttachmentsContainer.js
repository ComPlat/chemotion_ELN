import React, { useContext, useState } from 'react';
import { StoreContext } from 'src/stores/mobx/RootStore';
import { observer } from 'mobx-react';
import { Button } from 'react-bootstrap';
import ElementStore from 'src/stores/alt/stores/ElementStore';
import ContainerDatasets from 'src/components/container/ContainerDatasets';
import PropTypes from 'prop-types';

const VesselAttachmentsContainer = ({ item }) => {
  const { vesselDetailsStore } = useContext(StoreContext);
  const { currentElement } = ElementStore.getState();
  const currentContainer = currentElement?.container?.children?.[0] || { children: [] };
  const [container, setContainer] = useState(currentContainer);

  const handleAddAttachment = () => {
    const newContainer = vesselDetailsStore.addEmptyContainer(item.id);
    container.children.push(newContainer);
    setContainer({ ...container });
    vesselDetailsStore.getVessel(item.id).markChanged(true);
  };

  const handleChange = (updatedContainer) => {
    vesselDetailsStore.getVessel(item.id).markChanged(true);
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
};

VesselAttachmentsContainer.propTypes = {
  item: PropTypes.shape({
    id: PropTypes.string.isRequired,
  }).isRequired,
};

export default observer(VesselAttachmentsContainer);
