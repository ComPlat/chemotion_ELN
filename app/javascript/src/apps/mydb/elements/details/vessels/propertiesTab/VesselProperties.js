/* eslint-disable react/function-component-definition */
import React, { useContext, useEffect, useState } from 'react';
import { Accordion, Button, Form, InputGroup, Row, Col } from 'react-bootstrap';
import { observer } from 'mobx-react';
import PropTypes from 'prop-types';
import { StoreContext } from 'src/stores/mobx/RootStore';
import VesselProperty from 'src/apps/mydb/elements/details/vessels/propertiesTab/VesselProperty';
import VesselSuggestProperties from 'src/apps/mydb/elements/details/vessels/propertiesTab/VesselSuggestProperties';
import BulkInstanceModal from 'src/apps/mydb/elements/details/vessels/propertiesTab/BulkInstanceModal';
import VesselsFetcher from 'src/fetchers/VesselsFetcher';
import UIStore from 'src/stores/alt/stores/UIStore';
import UserStore from 'src/stores/alt/stores/UserStore';
import NotificationActions from 'src/stores/alt/actions/NotificationActions';
import ElementStore from 'src/stores/alt/stores/ElementStore';
import { getNextVesselIndex } from 'src/utilities/VesselUtilities';

const VesselProperties = ({ item, readOnly }) => {
  const { vesselDetailsStore } = useContext(StoreContext);
  const { currentCollection } = UIStore.getState();
  const vesselId = item.id;
  const vesselItem = vesselDetailsStore.getVessel(vesselId);
  const [templateData, setTemplateData] = useState(null);
  const [isMismatch, setIsMismatch] = useState(false);
  const [readyToCompare, setReadyToCompare] = useState(false);
  const collectionId = currentCollection.id;

  const isCreateMode = vesselItem?.is_new || false;
  const [activeKey, setActiveKey] = useState(isCreateMode ? 'common-properties' : null);
  const [showBulkModal, setShowBulkModal] = useState(false);

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

  const validateTemplateFields = () => {
    const vessel = vesselDetailsStore.getVessel(vesselId);
    const missingFields = [];
    if (!vessel.vesselName?.trim()) missingFields.push('Vessel name');
    if (!vessel.materialType?.trim()) missingFields.push('Material type');
    if (!vessel.vesselType?.trim()) missingFields.push('Vessel type');
    if (!vessel.volumeAmount || vessel.volumeAmount <= 0) missingFields.push('Volume amount');
    if (!vessel.volumeUnit?.trim()) missingFields.push('Volume unit');

    if (missingFields.length > 0) {
      const message = `Please complete the following before creating instances:\n- ${missingFields.join('\n- ')}`;
      NotificationActions.add({
        title: 'Missing Template Fields',
        message,
        level: 'error',
        autoDismiss: 7,
        position: 'tr',
      });
      return message;
    }
    return '';
  };

  const handleBulkCreate = async (count) => {
    const vessel = vesselDetailsStore.getVessel(vesselId);
    const { currentUser } = UserStore.getState();
    const initials = currentUser?.initials;

    const vesselsState = ElementStore.getState().elements?.vessels;
    const existingVessels = Array.isArray(vesselsState?.elements) ? vesselsState.elements : [];

    const startIndex = getNextVesselIndex(existingVessels, initials);

    const shortLabels = Array.from({ length: count }, (_, i) => `${initials}-V${startIndex + i}`);

    const response = await VesselsFetcher.bulkCreateInstances({
      templateName: vessel.vesselName,
      collectionId,
      count,
      details: vessel.details,
      materialType: vessel.materialType,
      vesselType: vessel.vesselType,
      volumeAmount: vessel.volumeAmount,
      volumeUnit: vessel.volumeUnit,
      shortLabels,
      currentUser,
    });

    vesselDetailsStore.replaceInstances(vesselId, response);
  };

  return (
    <>
      <Accordion
        className="vessel-properties"
        activeKey={activeKey}
        onSelect={(key) => setActiveKey(key)}
      >
        <Accordion.Item eventKey="common-properties">
          <Accordion.Header>Vessel Template Properties</Accordion.Header>
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
                readOnly
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
                      value={isCreateMode ? (instance.weightAmount || '') : (vesselItem?.weightAmount || '')}
                      disabled={readOnly}
                      onChange={(e) => {
                        const value = parseFloat(e.target.value) || '';
                        if (isCreateMode) {
                          vesselDetailsStore.updateInstance(vesselId, index, 'weightAmount', value);
                        } else {
                          vesselDetailsStore.changeWeightAmount(vesselId, value);
                        }
                      }}
                      className="flex-grow-1"
                    />
                    <Button
                      disabled={readOnly}
                      variant="success"
                      onClick={() => {
                        const currentUnit = isCreateMode ? instance.weightUnit : vesselItem?.weightUnit;
                        const newUnit = currentUnit === 'g' ? 'kg' : 'g';
                        if (isCreateMode) {
                          vesselDetailsStore.updateInstance(vesselId, index, 'weightUnit', newUnit);
                        } else {
                          vesselDetailsStore.changeWeightUnit(vesselId, newUnit);
                        }
                      }}
                    >
                      {isCreateMode ? (instance.weightUnit || 'g') : (vesselItem?.weightUnit || 'g')}
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
              Create a vessel instance
            </Button>
            <Button variant="outline-primary" size="xsm" className="ms-2" onClick={() => setShowBulkModal(true)}>
              Create bulk vessel instances
            </Button>
          </div>
        )}
      </Accordion>

      <BulkInstanceModal
        show={showBulkModal}
        onHide={() => setShowBulkModal(false)}
        onSubmit={handleBulkCreate}
        defaultBaseName={vesselItem?.vesselName}
        onValidate={validateTemplateFields}
      />
    </>
  );
};

VesselProperties.propTypes = {
  item: PropTypes.object.isRequired,
  readOnly: PropTypes.bool.isRequired,
};

export default observer(VesselProperties);
