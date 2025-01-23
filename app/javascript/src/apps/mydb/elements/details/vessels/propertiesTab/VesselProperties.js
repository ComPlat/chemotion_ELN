/* eslint-disable react/function-component-definition */
import React, { useContext } from 'react';
import { Accordion } from 'react-bootstrap';
import { observer } from 'mobx-react';
import PropTypes from 'prop-types';
import { StoreContext } from 'src/stores/mobx/RootStore';
import VesselProperty from 'src/apps/mydb/elements/details/vessels/propertiesTab/VesselProperty';
import VesselName from 'src/apps/mydb/elements/details/vessels/propertiesTab/VesselName';

const VesselProperties = ({ item, readOnly }) => {
  const { vesselDetailsStore } = useContext(StoreContext);
  const vesselId = item.id;
  const vesselItem = vesselDetailsStore.getVessel(vesselId);

  return (
    <Accordion className="vessel-properties" defaultActiveKey="common-properties">
      <Accordion.Item eventKey="common-properties">
        <Accordion.Header>
          Common vessel properties
        </Accordion.Header>
        <Accordion.Body>
          <VesselName
            id={vesselId}
            name={vesselItem?.vesselName || ''}
            readOnly={readOnly}
          />
          <VesselProperty
            label="Details"
            value={vesselItem?.details || ''}
            onChange={(e) => vesselDetailsStore.changeDetails(vesselId, e.target.value)}
            readOnly={readOnly}
            optional
          />
          <VesselProperty
            label="Material type"
            value={vesselItem?.materialType || ''}
            onChange={(e) => vesselDetailsStore.changeMaterialType(vesselId, e.target.value)}
            readOnly={readOnly}
          />
          <VesselProperty
            label="Vessel type"
            value={vesselItem?.vesselType || ''}
            onChange={(e) => vesselDetailsStore.changeVesselType(vesselId, e.target.value)}
            readOnly={readOnly}
            optional
          />
          <VesselProperty
            label="Volume amount"
            value={vesselItem?.volumeAmount || 0}
            onChange={(e) => vesselDetailsStore.changeVolumeAmount(vesselId, parseFloat(e.target.value))}
            readOnly={readOnly}
            isNumeric
            optional
          />
          <VesselProperty
            label="Volume unit"
            value={vesselItem?.volumeUnit || ''}
            onChange={(e) => vesselDetailsStore.changeVolumeUnit(vesselId, e.target.value)}
            readOnly={readOnly}
            optional
          />
          <VesselProperty
            label="Weight amount"
            value={vesselItem?.weightAmount || 0}
            onChange={(e) => vesselDetailsStore.changeWeightAmount(vesselId, parseFloat(e.target.value))}
            readOnly={readOnly}
            isNumeric
            optional
          />
          <VesselProperty
            label="Weight unit"
            value={vesselItem?.weightUnit || ''}
            onChange={(e) => vesselDetailsStore.changeWeightUnit(vesselId, e.target.value)}
            readOnly={readOnly}
            optional
          />
        </Accordion.Body>
      </Accordion.Item>

      <Accordion.Item eventKey="specific-properties">
        <Accordion.Header>
          Item specific vessel properties
        </Accordion.Header>
        <Accordion.Body>
          <VesselProperty
            label="Vessel instance name"
            value={vesselItem?.vesselInstanceName}
            onChange={(e) => vesselDetailsStore.changeVesselInstanceName(vesselId, e.target.value)}
            readOnly={readOnly}
          />
          <VesselProperty
            label="Vessel instance description"
            value={vesselItem?.vesselInstanceDescription}
            onChange={(e) => vesselDetailsStore.changeVesselInstanceDescription(vesselId, e.target.value)}
            readOnly={readOnly}
          />
          <VesselProperty
            label="Barcode"
            value={vesselItem?.barCode}
            onChange={(e) => vesselDetailsStore.changeBarCode(vesselId, e.target.value)}
            readOnly={readOnly}
          />
          <VesselProperty
            label="QR Code"
            value={vesselItem?.qrCode}
            onChange={(e) => vesselDetailsStore.changeQrCode(vesselId, e.target.value)}
            readOnly={readOnly}
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
