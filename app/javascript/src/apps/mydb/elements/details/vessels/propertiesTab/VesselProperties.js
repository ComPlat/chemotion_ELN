import React, { useContext } from 'react';
import { Accordion } from 'react-bootstrap';
import { observer } from 'mobx-react';
import PropTypes from 'prop-types';
import { StoreContext } from 'src/stores/mobx/RootStore';
import VesselProperty from 'src/apps/mydb/elements/details/vessels/propertiesTab/VesselProperty.js'; // Adjust the import path as needed
import InvalidPropertyWarning from 'src/apps/mydb/elements/details/cellLines/propertiesTab/InvalidPropertyWarning';

const VesselProperties = ({ item, readOnly }) => {
  const { vesselDetailsStore } = useContext(StoreContext);
  const vesselItem = vesselDetailsStore.vessels(item.id);
  const vesselId = item.id;

  return (
    <Accordion className="vessel-properties" defaultActiveKey="common-properties">
      <Accordion.Item eventKey="common-properties">
        <Accordion.Header>
          <InvalidPropertyWarning item={item} propsToCheck={['name', 'material_type']} />
          Vessel Properties
        </Accordion.Header>
        <Accordion.Body>
          <VesselProperty
            label="Name"
            value={vesselItem.name}
            onChange={(e) => vesselDetailsStore.changeName(vesselId, e.target.value)}
            readOnly={readOnly}
          />
          <VesselProperty
            label="Details"
            value={vesselItem.details}
            onChange={(e) => vesselDetailsStore.changeDetails(vesselId, e.target.value)}
            readOnly={readOnly}
            optional={true}
          />
          <VesselProperty
            label="Material Type"
            value={vesselItem.materialType}
            onChange={(e) => vesselDetailsStore.changeMaterialType(vesselId, e.target.value)}
            readOnly={readOnly}
          />
          <VesselProperty
            label="Vessel Type"
            value={vesselItem.vesselType}
            onChange={(e) => vesselDetailsStore.changeVesselType(vesselId, e.target.value)}
            readOnly={readOnly}
            optional={true}
          />
          <VesselProperty
            label="Volume Amount"
            value={vesselItem.volumeAmount}
            onChange={(e) => vesselDetailsStore.changeVolumeAmount(vesselId, parseFloat(e.target.value))}
            readOnly={readOnly}
            isNumeric={true}
          />
          <VesselProperty
            label="Volume Unit"
            value={vesselItem.volumeAmount}
            onChange={(e) => vesselDetailsStore.changeVolumeAmount(vesselId, parseFloat(e.target.value))}
            readOnly={readOnly}
            isNumeric={true}
          />
          <VesselProperty
            label="Weight Amount"
            value={vesselItem.weightAmount}
            onChange={(e) => vesselDetailsStore.changeWeightAmount(vesselId, parseFloat(e.target.value))}
            readOnly={readOnly}
            isNumeric={true}
          />
          <VesselProperty
            label="Weight Unit"
            value={vesselItem.weightAmount}
            onChange={(e) => vesselDetailsStore.changeWeightAmount(vesselId, parseFloat(e.target.value))}
            readOnly={readOnly}
            isNumeric={true}
          />
        </Accordion.Body>
      </Accordion.Item>
    </Accordion>
  );
};

VesselProperties.propTypes = {
  readOnly: PropTypes.bool.isRequired,
  item: PropTypes.shape({
    id: PropTypes.string.isRequired
  }).isRequired
};

export default observer(VesselProperties);
