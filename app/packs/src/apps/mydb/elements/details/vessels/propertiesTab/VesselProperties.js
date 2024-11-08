/* eslint-disable react/function-component-definition */
import React, { useContext } from 'react';
import { Accordion } from 'react-bootstrap';
import { observer } from 'mobx-react';
import PropTypes from 'prop-types';
import { StoreContext } from 'src/stores/mobx/RootStore';
import VesselProperty from 'src/apps/mydb/elements/details/vessels/propertiesTab/VesselProperty'; // Adjust the import path as needed
import InvalidPropertyWarning from 'src/apps/mydb/elements/details/cellLines/propertiesTab/InvalidPropertyWarning';

const VesselProperties = ({ item, readOnly }) => {

  console.log('item: ', item);
  const { vesselDetailsStore } = useContext(StoreContext);
  // const vesselItem = vesselDetailsStore.getVessel(item.id);
  const vesselItem = item;
  const vesselTemplate = item.vessel_template;
  console.log('vesselItem in VesselProperties: ', vesselItem);
  const vesselId = vesselItem.id;

  return (
    <Accordion className="vessel-properties" defaultActiveKey="common-properties">
      <Accordion.Item eventKey="common-properties">
        <Accordion.Header>
          {/* <InvalidPropertyWarning item={item} propsToCheck={['name', 'material_type']} /> */}
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
            value={vesselTemplate.details || ''}
            onChange={(e) => vesselDetailsStore.changeDetails(vesselId, e.target.value)}
            readOnly={readOnly}
            optional
          />
          <VesselProperty
            label="Material Type"
            value={vesselTemplate.material_type || ''}
            onChange={(e) => vesselDetailsStore.changeMaterialType(vesselId, e.target.value)}
            readOnly={readOnly}
          />
          <VesselProperty
            label="Vessel Type"
            value={vesselTemplate.vessel_type || ''}
            onChange={(e) => vesselDetailsStore.changeVesselType(vesselId, e.target.value)}
            readOnly={readOnly}
            optional
          />
          <VesselProperty
            label="Volume Amount"
            value={vesselTemplate.volume_amount || ''}
            onChange={(e) => vesselDetailsStore.changeVolumeAmount(vesselId, parseFloat(e.target.value))}
            readOnly={readOnly}
            isNumeric
            optional
          />
          <VesselProperty
            label="Volume Unit"
            value={vesselItem.volume_unit}
            onChange={(e) => vesselDetailsStore.changeVolumeAmount(vesselId, parseFloat(e.target.value))}
            readOnly={readOnly}
            optional
          />
          <VesselProperty
            label="Weight Amount"
            value={vesselItem.weight_amount}
            onChange={(e) => vesselDetailsStore.changeWeightAmount(vesselId, parseFloat(e.target.value))}
            readOnly={readOnly}
            isNumeric
            optional
          />
          <VesselProperty
            label="Weight Unit"
            value={vesselItem.weight_amount}
            onChange={(e) => vesselDetailsStore.changeWeightAmount(vesselId, parseFloat(e.target.value))}
            readOnly={readOnly}
            optional
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
