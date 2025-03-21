import React, { useState, useContext, useEffect, useRef } from 'react';
import { StoreContext } from 'src/stores/mobx/RootStore';
import PropTypes from 'prop-types';
import { Card, Button, Form, Row, Col, Table, OverlayTrigger, Popover } from 'react-bootstrap';
import DetailActions from 'src/stores/alt/actions/DetailActions';
import VesselsFetcher from 'src/fetchers/VesselsFetcher';
import ElementActions from 'src/stores/alt/actions/ElementActions';
import { observer } from 'mobx-react';

function VesselTemplateDetails({ vessels, toggleFullScreen }) {
  const closeBtnRef = useRef(null);
  const { vesselDetailsStore } = useContext(StoreContext);
  const [isTemplateUpdated, setIsTemplateUpdated] = useState(false);
  const [showConfirmPopover, setShowConfirmPopover] = useState(false);
  const [popoverTarget, setPopoverTarget] = useState(null);


  useEffect(() => {
    vessels.forEach((vessel) => {
      vesselDetailsStore.convertVesselToModel(vessel);
    });
  }, [vessels]);

  if (!vessels.length) return null;

  const templateId = vessels[0].id;
  const templateStoreItem = vesselDetailsStore.getVessel(templateId);
  const instanceStoreItems = vessels.map(v => vesselDetailsStore.getVessel(v.id)).filter(Boolean);

  const renderEnlargenButton = () => (
    <Button
      variant="info"
      size="xxsm"
      onClick={toggleFullScreen}
    >
      <i className="fa fa-expand" />
    </Button>
  );

  const handleClose = () => {
    const mobXItem = vesselDetailsStore.getVessel(templateId);
  
    if (!mobXItem.changed) {
      vesselDetailsStore.removeVesselFromStore(templateId);
      DetailActions.close(mobXItem, true);
      return;
    }
  
    // Otherwise, trigger popover
    setShowConfirmPopover(true);
  };
  
  const confirmClose = () => {
    vesselDetailsStore.removeVesselFromStore(templateId);
    DetailActions.close(templateStoreItem, true);
    setShowConfirmPopover(false);
  };
  
  const cancelClose = () => {
    setShowConfirmPopover(false);
  };
  
  const renderCloseHeaderButton = () => (
    <OverlayTrigger
      trigger="click"
      show={showConfirmPopover}
      placement="left"
      target={closeBtnRef.current}
      overlay={(
        <Popover id="close-confirm-popover">
          <Popover.Header as="h3">Confirm Close</Popover.Header>
          <Popover.Body>
            Unsaved data will be lost. Close anyway?
            <div className="d-flex justify-content-end gap-2 mt-2">
              <Button size="sm" variant="danger" onClick={confirmClose}>
                Yes
              </Button>
              <Button size="sm" variant="secondary" onClick={cancelClose}>
                No
              </Button>
            </div>
          </Popover.Body>
        </Popover>
      )}
      rootClose
      onToggle={() => setShowConfirmPopover(false)}
    >
      <Button
        ref={closeBtnRef}
        variant="danger"
        size="xxsm"
        onClick={handleClose}
      >
        <i className="fa fa-times" />
      </Button>
    </OverlayTrigger>
  );
  
  // const renderCloseHeaderButton = () => (
  //   <Button
  //   variant="danger"
  //   size="xxsm"
  //   onClick={() => { DetailActions.close(templateStoreItem, true); }}
  //   >
  //     <i className="fa fa-times" />
  //   </Button>
  // );
  
  // const handleClose = (vesselItem) => {
  //   const { vesselDetailsStore } = context;
  //   const mobXItem = vesselDetailsStore.getVessel(vesselItem.id);

  //   if (!mobXItem.changed || window.confirm('Unsaved data will be lost. Close sample?')) {
  //     vesselDetailsStore.removeVesselFromStore(vesselItem.id);
  //     DetailActions.close(vesselItem, true);
  //   }
  // };

  const renderHeaderContent = () => (
    <div className="d-flex align-items-center justify-content-between">
      <div className="d-flex gap-2">
        <span>
          <i className="icon-vessel me-1" />
          {templateStoreItem?.vesselName}
        </span>
      </div>
      <div className="d-flex gap-1">
        {renderEnlargenButton()}
        {renderCloseHeaderButton()}
      </div>
    </div>
  );

  const formatLabel = (field) => field.replace('_', ' ').toLowerCase().replace(/^\w/, (c) => c.toUpperCase());

  const handleTemplateChange = (field, value) => {
    const actions = {
      vesselName: vesselDetailsStore.changeVesselName,
      details: vesselDetailsStore.changeDetails,
      vesselType: vesselDetailsStore.changeVesselType,
      materialType: vesselDetailsStore.changeMaterialType,
      materialDetails: vesselDetailsStore.changeMaterialDetails,
      volumeAmount: (id, val) => vesselDetailsStore.changeVolumeAmount(id, parseFloat(val) || 0),
      volumeUnit: vesselDetailsStore.changeVolumeUnit,
    };

    if (actions[field]) {
      actions[field](templateId, value);
      setIsTemplateUpdated(true);
    }
    // setVesselTemplate((prev) => ({ ...prev, [field]: value }));
    // setIsTemplateUpdated(true);
  };

  const updateTemplate = () => {
    const vesselToUpdate = vessels.find((v) => v.id === templateId);
    const updatedVessel = vesselDetailsStore.getVessel(templateId);

    vesselToUpdate.adoptPropsFromMobXModel(updatedVessel);

    VesselsFetcher.update(vesselToUpdate)
      .then(() => setIsTemplateUpdated(false))
      .catch((err) => console.error('Error updating template:', err));
    
    
    // ElementActions.updateVessel(templateStoreItem);
    // VesselsFetcher.updateVesselTemplate(vesselTemplate.id, vesselTemplate);
    // setIsTemplateUpdated(false);
  };

  const handleInstanceChange = (vesselId, field, value) => {
    const instanceActions = {
      vesselInstanceName: vesselDetailsStore.changeVesselInstanceName,
      vesselInstanceDescription: vesselDetailsStore.changeVesselInstanceDescription,
      barCode: vesselDetailsStore.changeBarCode,
      qrCode: vesselDetailsStore.changeQrCode,
      weightAmount: (id, val) => vesselDetailsStore.changeWeightAmount(id, parseFloat(val) || 0),
      weightUnit: vesselDetailsStore.changeWeightUnit,
    };

    if (instanceActions[field]) {
      instanceActions[field](vesselId, value);
    }

    // setInstances((prevInstances) => {
    //   const updatedInstances = [...prevInstances];
    //   updatedInstances[index] = { ...updatedInstances[index], [field]: value };
    //   return updatedInstances;
    // });
  };

  const updateInstance = (vesselId) => {
    const vesselToUpdate = vessels.find((v) => v.id === vesselId);
    const updatedVessel = vesselDetailsStore.getVessel(vesselId);

    vesselToUpdate.adoptPropsFromMobXModel(updatedVessel);

    VesselsFetcher.update(vesselToUpdate)
      .catch((err) => console.error(`Error updating instance ${vesselId}:`, err));
    // VesselsFetcher.updateVesselInstance(instances[index].id, instances[index]);
  };

  return (
    <>
      <Card className="detail-card shadow-sm">
        <Card.Header>
          {renderHeaderContent()}
        </Card.Header>
        <Card.Body className="bg-light">
          <Card.Title className="mb-3">Vessel template details</Card.Title>
          <Form>
            {['vesselName',
              'details',
              'vesselType',
              'materialType',
              'materialDetails',
              'volumeAmount',
              'volumeUnit',
            ].map((field) => (
                <Form.Group as={Row} key={field} className="mb-2 align-items-center">
                  <Form.Label column sm={3} className="text-capitalize">
                    {field}:
                  </Form.Label>
                  <Col sm={5}>
                    <Form.Control
                      type={['volumeAmount'].includes(field) ? 'number' : 'text'}
                      value={templateStoreItem?.[field] || ''}
                      onChange={(e) => handleTemplateChange(field, e.target.value)}
                    />
                  </Col>
                </Form.Group>
              ))}
            <div>
              <Button
                variant="primary"
                size="sm"
                className="mt-2"
                onClick={updateTemplate}
                disabled={!isTemplateUpdated}
              >
                Update Template
              </Button>
            </div>
          </Form>
        </Card.Body>
      </Card>
      <Card className="detail-card shadow-sm">
        <Card.Body>
          <Card.Title classNME="mb-3">Vessel Instances</Card.Title>
          <Table bordered hover responsive striped className="table-sm border-rounded">
            <thead className="table-light">
              <tr>
                <th>Name</th>
                <th>Description</th>
                <th>Barcode</th>
                <th>QR Code</th>
                <th>Weight amount</th>
                <th>Weight unit</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {instanceStoreItems.map((instance) => (
                <tr key={instance.id}>
                  {['vesselInstanceName',
                    'vesselInstanceDescription',
                    'barCode',
                    'qrCode',
                    'weightAmount',
                    'weightUnit',
                  ].map((field) => (
                    <td key={field} className="p-1">
                      <Form.Control
                        type={field === 'weightAmount' ? 'number' : 'text'}
                        className="border-0 bg-transparent"
                        value={instance[field] ?? ''}
                        onChange={(e) => handleInstanceChange(instance.id, field, e.target.value)}
                      />
                    </td>
                  ))}
                  <td>
                    <Button variant="primary" size="xsm" onClick={() => updateInstance(instance.id)}>
                      Update
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        </Card.Body>
      </Card>
    </>
  );
}

VesselTemplateDetails.propTypes = {
  toggleFullScreen: PropTypes.func.isRequired,
  vessels: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string.isRequired,
    })
  ).isRequired,
};

export default observer(VesselTemplateDetails);
