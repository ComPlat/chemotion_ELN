import React, { useContext, useEffect, useState } from 'react';
import { observer } from 'mobx-react';
import {
  Form, Button, Row, Col, InputGroup, Tabs, Tab, ButtonToolbar
} from 'react-bootstrap';
import { StoreContext } from 'src/stores/mobx/RootStore';
import Aviator from 'aviator';
import VesselSuggestProperties from 'src/apps/mydb/elements/details/vessels/propertiesTab/VesselSuggestProperties';
import VesselProperty from 'src/apps/mydb/elements/details/vessels/propertiesTab/VesselProperty';
import DetailCard from 'src/apps/mydb/elements/details/DetailCard';
import DetailActions from 'src/stores/alt/actions/DetailActions';
import VesselsFetcher from 'src/fetchers/VesselsFetcher';
import UIStore from 'src/stores/alt/stores/UIStore';

function VesselTemplateCreate({ vesselItem: initialVesselItem }) {
  const { vesselDetailsStore } = useContext(StoreContext);
  const isCreateMode = true;

  const [templateData, setTemplateData] = useState(null);
  const [readyToCompare, setReadyToCompare] = useState(false);
  const [isMismatch, setIsMismatch] = useState(false);
  const [vesselItem, setVesselItem] = useState(null);
  const [nameFocused, setNameFocused] = useState(false);

  const [activeTab, setActiveTab] = useState('tab1');

  useEffect(() => {
    if (initialVesselItem) {
      if (initialVesselItem.is_new) {
        vesselDetailsStore.convertVesselToModel(initialVesselItem);
      }
      const itemFromStore = vesselDetailsStore.getVessel(initialVesselItem.id);
      setVesselItem(itemFromStore);
    }
  }, [initialVesselItem, vesselDetailsStore]);

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
  }, [
    templateData,
    readyToCompare,
    vesselItem?.vesselType,
    vesselItem?.materialType,
    vesselItem?.volumeAmount,
    vesselItem?.volumeUnit,
  ]);

  if (!vesselItem || !vesselDetailsStore) {
    return (
      <DetailCard>
        <div>Loading Vessel Template...</div>
      </DetailCard>
    );
  }

  const isDuplicate = vesselDetailsStore.isNameDuplicate(vesselItem.id);

  const handleSubmit = () => {
    VesselsFetcher.createVesselTemplate(vesselItem).then((group) => {
      if (!Array.isArray(group) || group.length === 0) return;

      const template = group[0];
      const { currentCollection } = UIStore.getState();
      const collectionId = currentCollection?.id;

      DetailActions.close(vesselItem, true);

      Aviator.navigate(`/collection/${collectionId}/vessel_template/${template.vesselTemplateId}`);
    });
  };

  const handleTabChange = (eventKey) => {
    setActiveTab(eventKey);
  };

  const handleClose = (vesselItem) => {
    const { vesselDetailsStore } = context;
    const mobXItem = vesselDetailsStore.getVessel(vesselItem.id);

    if (!mobXItem.changed || window.confirm('Unsaved data will be lost. Close sample?')) {
      vesselDetailsStore.removeVesselFromStore(vesselItem.id);
      DetailActions.close(vesselItem, true);
    }
  };


  const renderCloseHeaderButton = () => (
    <Button
      variant="danger"
      size="xxsm"
      onClick={() => { handleClose(vesselItem); }}
    >
      <i className="fa fa-times" />
    </Button>
  );

  const handleVolumeChange = (e) => {
    vesselDetailsStore.changeVolumeAmount(vesselItem.id, parseFloat(e.target.value));
  };

  const handleUnitChange = () => {
    const currentUnit = vesselItem.volumeUnit || 'ml';
    const nextUnit = currentUnit === 'ml' ? 'L' : currentUnit === 'L' ? 'μL' : 'ml';
    vesselDetailsStore.changeVolumeUnit(vesselItem.id, nextUnit);
  };

  const applyTemplateToStore = (templateData) => {
    if (!templateData) return;

    vesselDetailsStore.changeDetails(vesselItem.id, templateData.details || '');
    vesselDetailsStore.changeMaterialDetails(vesselItem.id, templateData.material_details || '');
    vesselDetailsStore.changeMaterialType(vesselItem.id, templateData.material_type || '');
    vesselDetailsStore.changeVesselType(vesselItem.id, templateData.vessel_type || '');
    vesselDetailsStore.changeVolumeAmount(vesselItem.id, templateData.volume_amount || 0);
    vesselDetailsStore.changeVolumeUnit(vesselItem.id, templateData.volume_unit || '');
  };

  const isSubmitDisabled = !vesselItem.vesselName || isDuplicate;

  return (
    <DetailCard header={(
      <div className="d-flex justify-content-between align-items-center">
        <h5 className="mb-0">Create Vessel Template</h5>
        <div className="d-flex align-items-center">
          {renderCloseHeaderButton()}
        </div>
      </div>
      )}
    >
      <div className="tabs-container--with-borders">
        <Tabs activeKey={activeTab} onSelect={handleTabChange} id="vessel-details-tab">
          <Tab eventKey="tab1" title="Template Properties" key="tab1">
            <Form>

              <VesselProperty
                label="Vessel Template Name *"
                value={vesselItem.vesselName}
                onChange={(e) => {
                  setNameFocused(true);
                  vesselDetailsStore.changeVesselName(vesselItem.id, e.target.value);
                }}
                readOnly={false}
              />

              {nameFocused && isDuplicate && (
              <div className="text-danger mb-3 ms-2">
                A vessel template with this name already exists. Please choose a unique name.
              </div>
              )}

              <VesselSuggestProperties
                id={vesselItem.id}
                label="Copy Properties From"
                field="copy_properties"
                value={vesselItem.copiedFromName || ''}
                readOnly={false}
                isMismatch={isMismatch}
                storeUpdater={(id, value) => vesselDetailsStore.changeCopiedFromName(id, value)}
                onTemplateSelect={(vesselData) => {
                  if (vesselData) {
                    applyTemplateToStore(vesselData);
                    setTemplateData(vesselData);
                    setReadyToCompare(false);
                  }
                }}
              />
              <VesselSuggestProperties
                id={vesselItem.id}
                label="Details"
                field="details"
                value={vesselItem.details || ''}
                readOnly={!isCreateMode}
                storeUpdater={vesselDetailsStore.changeDetails}
              />
              <VesselSuggestProperties
                id={vesselItem.id}
                label="Material Type"
                field="material_type"
                value={vesselItem.materialType}
                readOnly={!isCreateMode}
                storeUpdater={vesselDetailsStore.changeMaterialType}
              />
              <VesselSuggestProperties
                id={vesselItem.id}
                label="Vessel Type"
                field="vessel_type"
                value={vesselItem.vesselType || ''}
                readOnly={!isCreateMode}
                storeUpdater={vesselDetailsStore.changeVesselType}
              />
              <VesselSuggestProperties
                id={vesselItem.id}
                label="Material Details"
                field="material_details"
                value={vesselItem.materialDetails || ''}
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
            </Form>
          </Tab>
        </Tabs>
      </div>

      <ButtonToolbar className="d-flex gap-1">
        <Button variant="primary" onClick={() => DetailActions.close(vesselItem, true)}>
          Cancel
        </Button>
        <Button variant="warning" disabled={isSubmitDisabled} onClick={handleSubmit}>
          Create Template
        </Button>
      </ButtonToolbar>
    </DetailCard>
  );
}

export default observer(VesselTemplateCreate);
