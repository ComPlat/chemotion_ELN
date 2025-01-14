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


  const handleChange = (changed = false) => {
    if (changed) {
      vesselDetailsStore.getVessel(item.id).markChanged(true);
    }
  };

  return (
    <div className="analysis-container">
        <ContainerDatasets
          container={currentElement.container.children[0]}
          readOnly={false} 
          disabled={false} 
          onChange={handleChange}
        />
    </div>
  );
};

VesselAttachmentsContainer.propTypes = {
  item: PropTypes.shape({
    id: PropTypes.string.isRequired,
  }).isRequired,
};

export default observer(VesselAttachmentsContainer);
