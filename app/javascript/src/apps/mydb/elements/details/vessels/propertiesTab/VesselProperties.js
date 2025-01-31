/* eslint-disable react/function-component-definition */
import React, { useContext } from 'react';
import { Accordion, Button } from 'react-bootstrap';
import { observer } from 'mobx-react';
import PropTypes from 'prop-types';
import { StoreContext } from 'src/stores/mobx/RootStore';
import VesselProperty from 'src/apps/mydb/elements/details/vessels/propertiesTab/VesselProperty';
import VesselName from 'src/apps/mydb/elements/details/vessels/propertiesTab/VesselName';

const VesselProperties = ({ item, readOnly }) => {
  const { vesselDetailsStore } = useContext(StoreContext);
  const vesselId = item.id;
  const vesselFromStore = vesselDetailsStore.getVessel(vesselId);
  const vesselItem = vesselFromStore ? JSON.parse(JSON.stringify(vesselFromStore)) : {};

  const isCreateMode = vesselItem?.is_new || false;
  const instances = isCreateMode
    ? vesselDetailsStore.getInstances(vesselId)
    : [
      {
        vesselInstanceName: vesselItem?.vesselInstanceName || '',
        vesselInstanceDescription: vesselItem?.vesselInstanceDescription || '',
        barCode: vesselItem?.barCode || '',
        qrCode: vesselItem?.qrCode || '',
      },
    ];

  return (
    <Accordion className="vessel-properties" defaultActiveKey="common-properties">
      <Accordion.Item eventKey="common-properties">
        <Accordion.Header>Common Vessel Properties</Accordion.Header>
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

      {instances.map((instance, index) => (
        <Accordion.Item eventKey={`instance-${index}`} key={index}>
          <Accordion.Header>
            Item Specific Properties
            {index + 1}
          </Accordion.Header>
          <Accordion.Body>
            <VesselProperty
              label="Vessel Instance Name"
              value={instance.vesselInstanceName}
              onChange={(e) => (isCreateMode
                ? vesselDetailsStore.updateInstance(vesselId, index, 'vesselInstanceName', e.target.value)
                : vesselDetailsStore.changeVesselInstanceName(vesselId, e.target.value))}
              readOnly={readOnly}
            />
            <VesselProperty
              label="Vessel Instance Description"
              value={instance.vesselInstanceDescription}
              onChange={(e) => (isCreateMode
                ? vesselDetailsStore.updateInstance(vesselId, index, 'vesselInstanceDescription', e.target.value)
                : vesselDetailsStore.changeVesselInstanceDescription(vesselId, e.target.value))}
              readOnly={readOnly}
            />
            <VesselProperty
              label="Barcode"
              value={instance.barCode}
              onChange={(e) => (isCreateMode
                ? vesselDetailsStore.updateInstance(vesselId, index, 'barCode', e.target.value)
                : vesselDetailsStore.changeBarCode(vesselId, e.target.value))}
              readOnly={readOnly}
            />
            <VesselProperty
              label="QR Code"
              value={instance.qrCode}
              onChange={(e) => (isCreateMode
                ? vesselDetailsStore.updateInstance(vesselId, index, 'qrCode', e.target.value)
                : vesselDetailsStore.changeQrCode(vesselId, e.target.value))}
              readOnly={readOnly}
            />
            {isCreateMode && (
              <Button
                variant="danger"
                size="xsm"
                className="mt-2"
                onClick={() => vesselDetailsStore.removeInstance(vesselId, index)}
                disabled={instances.length === 1}
              >
                Remove Instance
              </Button>
            )}
          </Accordion.Body>
        </Accordion.Item>
      ))}
      {isCreateMode && (
        <div className="mt-3 ms-3">
          <Button variant="primary" size="xsm" onClick={() => vesselDetailsStore.addInstance(vesselId)}>
            Add vessel instance
          </Button>
        </div>
      )}
    </Accordion>
  );
};

VesselProperties.propTypes = {
  item: PropTypes.object.isRequired,
  readOnly: PropTypes.bool.isRequired,
};

export default observer(VesselProperties);
