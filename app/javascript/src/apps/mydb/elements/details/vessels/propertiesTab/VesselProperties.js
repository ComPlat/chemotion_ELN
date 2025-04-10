/* eslint-disable react/function-component-definition */
import React, { useContext, useEffect, useState } from 'react';
import { Accordion, Button, Form, InputGroup, Row, Col } from 'react-bootstrap';
import { observer } from 'mobx-react';
import PropTypes from 'prop-types';
import { StoreContext } from 'src/stores/mobx/RootStore';
import VesselProperty from 'src/apps/mydb/elements/details/vessels/propertiesTab/VesselProperty';
import VesselSuggestProperties from 'src/apps/mydb/elements/details/vessels/propertiesTab/VesselSuggestProperties';

const VesselProperties = ({ item, readOnly }) => {
  const { vesselDetailsStore } = useContext(StoreContext);
  const vesselId = item.id;
  const vesselItem = vesselDetailsStore.getVessel(vesselId);
  const [templateData, setTemplateData] = useState(null);
  const [isMismatch, setIsMismatch] = useState(false);
  const [readyToCompare, setReadyToCompare] = useState(false);

  const isCreateMode = vesselItem?.is_new || false;
  const [activeKey, setActiveKey] = useState(isCreateMode ? 'common-properties' : null);

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

  useEffect(() => {
    if (isCreateMode) {
      setActiveKey('common-properties');
    }
    else {
      setActiveKey('instance-0');
    }
  }, [isCreateMode]);

  useEffect(() => {
    if (!templateData) return;

    const matches = templateData.vessel_type === vesselItem?.vesselType
      && templateData.material_type === vesselItem?.materialType
      && templateData.volume_amount === vesselItem?.volumeAmount
      && templateData.volume_unit === vesselItem?.volumeUnit;

    if (matches) {
      setReadyToCompare(true);
    }
  }, [
    vesselItem?.vesselType,
    vesselItem?.materialType,
    vesselItem?.volumeAmount,
    vesselItem?.volumeUnit,
    templateData,
  ]);

  useEffect(() => {
    if (!templateData || !readyToCompare) return;

    const mismatch = templateData.vessel_type !== vesselItem?.vesselType
      || templateData.material_type !== vesselItem?.materialType
      || templateData.volume_amount !== vesselItem?.volumeAmount
      || templateData.volume_unit !== vesselItem?.volumeUnit;

    setIsMismatch(mismatch);
    vesselDetailsStore.setNameDuplicateFlag(vesselId, mismatch);
  }, [
    templateData,
    readyToCompare,
    vesselItem?.vesselType,
    vesselItem?.materialType,
    vesselItem?.volumeAmount,
    vesselItem?.volumeUnit,
  ]);

  const handleVolumeChange = (e) => {
    const value = parseFloat(e.target.value);
    vesselDetailsStore.changeVolumeAmount(vesselId, value);
  };

  const handleUnitChange = () => {
    const newUnit = vesselItem?.volumeUnit === 'ml' ? 'l' : 'ml';
    vesselDetailsStore.changeVolumeUnit(vesselId, newUnit);
  };

  const handleWeightChange = (e) => {
    const value = parseFloat(e.target.value);
    vesselDetailsStore.changeWeightAmount(vesselId, value);
  };

  const handleWeightUnitChange = () => {
    const newUnit = vesselItem?.weightUnit === 'g' ? 'kg' : 'g';
    vesselDetailsStore.changeWeightUnit(vesselId, newUnit);
  };

  return (
    <Accordion
      className="vessel-properties"
      activeKey={activeKey}
      onSelect={(key) => setActiveKey(key)}
      >
      <Accordion.Item eventKey="common-properties">
        <Accordion.Header>Common Vessel Properties</Accordion.Header>
        <Accordion.Body>
          <VesselSuggestProperties
            id={vesselId}
            label="Vessel name"
            field="vessel_name"
            value={vesselItem?.vesselName}
            readOnly={!isCreateMode}
            storeUpdater={(id, value) => vesselDetailsStore.changeVesselName(id, value)}
            onTemplateSelect={(vesselData) => {
              setTemplateData(vesselData);
              setReadyToCompare(false);
            }}
            isMismatch={isMismatch}
          />
          <VesselSuggestProperties
            id={vesselId}
            label="Details"
            field="details"
            value={vesselItem?.details || ''}
            readOnly={!isCreateMode}
            storeUpdater={vesselDetailsStore.changeDetails}
          />
          <VesselSuggestProperties
            id={vesselId}
            label="Material Type"
            field="material_type"
            value={vesselItem?.materialType}
            readOnly={!isCreateMode}
            storeUpdater={vesselDetailsStore.changeMaterialType}
          />

          <VesselSuggestProperties
            id={vesselId}
            label="Vessel Type"
            field="vessel_type"
            value={vesselItem?.vesselType || ''}
            readOnly={!isCreateMode}
            storeUpdater={vesselDetailsStore.changeVesselType}
          />
          <VesselSuggestProperties
            id={vesselId}
            label="Material details"
            field="material_details"
            value={vesselItem?.materialDetails || ''}
            readOnly={!isCreateMode}
            storeUpdater={vesselDetailsStore.changeMaterialDetails}
          />
          <Form.Group as={Row} className="mt-3">
            <Form.Label column sm={3}>Volume</Form.Label>
            <Col sm={6}>
              <InputGroup>
                <Form.Control
                  name="vessel volume"
                  type="number"
                  step="any"
                  value={vesselItem?.volumeAmount}
                  disabled={!isCreateMode}
                  onChange={handleVolumeChange}
                  className="flex-grow-1"
                />
                <Button
                  disabled={!isCreateMode}
                  variant="success"
                  onClick={handleUnitChange}
                >
                  {vesselItem?.volumeUnit || 'ml'}
                </Button>
              </InputGroup>
            </Col>
          </Form.Group>
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
            <Form.Group as={Row} className="mt-3">
              <Form.Label column sm={3}>Weight</Form.Label>
              <Col sm={6}>
                <InputGroup>
                  <Form.Control
                    name="vessel weight"
                    type="number"
                    step="any"
                    value={vesselItem?.weightAmount}
                    disabled={false}
                    onChange={handleWeightChange}
                    className="flex-grow-1"
                  />
                  <Button
                    disabled={false}
                    variant="success"
                    onClick={handleWeightUnitChange}
                  >
                    {vesselItem?.weightUnit || 'g'}
                  </Button>
                </InputGroup>
              </Col>
            </Form.Group>
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
