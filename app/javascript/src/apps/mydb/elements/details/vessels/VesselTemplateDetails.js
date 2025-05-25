/* eslint-disable react/jsx-one-expression-per-line */
/* eslint-disable arrow-parens */
import React, { useState, useContext, useEffect, useRef } from 'react';
import { StoreContext } from 'src/stores/mobx/RootStore';
import PropTypes from 'prop-types';
import { toJS } from 'mobx';
import {
  Card, Button, Form, Row, Col, Table, OverlayTrigger, Popover, InputGroup, Modal
} from 'react-bootstrap';
import DetailActions from 'src/stores/alt/actions/DetailActions';
import VesselsFetcher from 'src/fetchers/VesselsFetcher';
import ElementActions from 'src/stores/alt/actions/ElementActions';
import { observer } from 'mobx-react';
import UIStore from 'src/stores/alt/stores/UIStore';
import UserStore from 'src/stores/alt/stores/UserStore';
import ElementStore from 'src/stores/alt/stores/ElementStore';
import BulkInstanceModal from 'src/apps/mydb/elements/details/vessels/propertiesTab/BulkInstanceModal';
import { generateNextShortLabel } from 'src/utilities/VesselUtilities';

function VesselTemplateDetails({ vessels, toggleFullScreen }) {
  const closeBtnRef = useRef(null);
  const { currentCollection } = UIStore.getState();
  const { currentUser } = UserStore.getState();
  const { vesselDetailsStore } = useContext(StoreContext);

  const [isTemplateUpdated, setIsTemplateUpdated] = useState(false);
  const [showConfirmPopover, setShowConfirmPopover] = useState(false);
  const [popoverTarget, setPopoverTarget] = useState(null);
  const [newInstances, setNewInstances] = useState([]);
  const [showConfirm, setShowConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showBulkModal, setShowBulkModal] = useState(false);

  const collectionId = currentCollection.id;

  const openModal = () => setShowConfirm(true);
  const closeModal = () => setShowConfirm(false);

  useEffect(() => {
    vessels.forEach(vessel => vesselDetailsStore.removeVesselFromStore(vessel.id));
    vessels.forEach((vessel) => {
      vesselDetailsStore.convertVesselToModel(vessel);
    });
  }, [vessels]);


  if (!vessels.length) return null;

  const templateId = vessels[0].id;
  const { vesselTemplateId } = vessels[0];
  const templateStoreItem = vesselDetailsStore.getVessel(templateId);
  const instanceStoreItems = vessels
    .filter((v) => v.id !== templateId)
    .map((v) => vesselDetailsStore.getVessel(v.id))
    .filter(Boolean);


  const renderEnlargenButton = () => (
    <Button
      variant="info"
      size="xxsm"
      onClick={toggleFullScreen}
    >
      <i className="fa fa-expand" />
    </Button>
  );

  const getInstancesToRemoveFromStore = () => {
    const allOpenTabs = ElementStore.getState().selecteds;

    return vessels.filter((vessel) => {
      if (vessel.id === templateId) return true;

      const openIndividually = allOpenTabs.some((el) => {
        if (Array.isArray(el)) {
          const sameTemplate = el[0]?.vesselTemplateId === vessel.vesselTemplateId;
          return !sameTemplate && el.some((v) => v.id === vessel.id);
        }
        return el.id === vessel.id && el.type === 'vessel';
      });

      return !openIndividually;
    });
  };

  const handleClose = () => {
    const mobXItem = vesselDetailsStore.getVessel(templateId);

    if (!mobXItem.changed) {
      getInstancesToRemoveFromStore().forEach(v => vesselDetailsStore.removeVesselFromStore(v.id));
      DetailActions.close(vessels, true);
      return;
    }

    setShowConfirmPopover(true);
  };

  const confirmClose = () => {
    getInstancesToRemoveFromStore().forEach(v => vesselDetailsStore.removeVesselFromStore(v.id));
    DetailActions.close(vessels, true);
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


  const renderHeaderContent = () => (
    <div className="d-flex align-items-center justify-content-between">
      <div className="d-flex gap-2">
        <span>
          <i className="icon-vessel_template me-2" />
          {templateStoreItem?.vesselName}
        </span>
      </div>
      <div className="d-flex gap-1">
        {renderEnlargenButton()}
        {renderCloseHeaderButton()}
      </div>
    </div>
  );

  const syncTemplateAndInstances = (updatedVessels) => {
    vessels.forEach(v => vesselDetailsStore.removeVesselFromStore(v.id));
    updatedVessels.forEach(vesselDetailsStore.convertVesselToModel);

    const elementState = ElementStore.getState();
    const selectedIndex = elementState.activeKey;
    const updatedGroup = [...updatedVessels];
    elementState.selecteds[selectedIndex] = updatedGroup;
    DetailActions.select(selectedIndex);

    ElementActions.refreshElements('vessel');
    ElementActions.refreshElements('vessel_template');
    ElementActions.fetchVesselsByCollectionId(collectionId);
  };


  const handleAddNewInstance = () => {
    setNewInstances([...newInstances, {
      vesselInstanceName: '',
      vesselInstanceDescription: '',
      barCode: '',
      qrCode: '',
      weightAmount: '',
      weightUnit: 'g',
    }]);
  };

  const handleCreateNewInstance = (instance, index) => {
    const baseVessel = vessels[0];
    const { vesselTemplateId } = baseVessel;
    const collectionId = currentCollection.id;
    const shortLabel = generateNextShortLabel();

    const vesselToCreate = {
      collectionId,
      vesselTemplateId: baseVessel.vesselTemplateId,
      short_label: shortLabel,
      instances: [instance],
    };

    VesselsFetcher.createVesselInstance(vesselToCreate, currentUser)
      .then((createdVessel) => {
        if (createdVessel && createdVessel.id) {
          currentUser.vessels_count += 1;
          ElementActions.refreshElements('vessel');
          ElementActions.refreshElements('vessel_template');
        }
        return VesselsFetcher.fetchVesselTemplateById(vesselTemplateId, collectionId);
      })
      .then((updatedVessels) => {
        syncTemplateAndInstances(updatedVessels);
        setNewInstances((prev) => prev.filter((_, i) => i !== index));
      })
      .catch((error) => {
        console.error('Error creating vessel instance:', error);
      });
  };

  const handleBulkCreate = async (count) => {
    const baseVessel = vessels[0];
    const initials = currentUser?.initials;
    const vesselsState = ElementStore.getState().elements?.vessels;
    const existingVessels = Array.isArray(vesselsState?.elements) ? vesselsState.elements : [];
    const startIndex = getNextVesselIndex(existingVessels, initials);
    const shortLabels = Array.from({ length: count }, (_, i) => `${initials}-V${startIndex + i}`);

    const response = await VesselsFetcher.bulkCreateInstances({
      vesselTemplateId: baseVessel.vesselTemplateId,
      collectionId,
      count,
      shortLabels,
      user: currentUser,
    });

    vesselDetailsStore.replaceInstances(templateId, response);
    const updatedVessels = await VesselsFetcher.fetchVesselTemplateById(templateId, collectionId);
    syncTemplateAndInstances(updatedVessels);
  };


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
  };

  const HandleDeleteInstance = (vesselId, vesselTemplateId) => {
    setDeleting(true);

    VesselsFetcher.deleteVesselInstance(vesselId)
      .then(() => {
        setDeleting(false);
        setShowConfirm(false);

        return VesselsFetcher.fetchVesselTemplateById(vesselTemplateId, collectionId);
      })
      .then((updatedVessels) => {
        syncTemplateAndInstances(updatedVessels);
      });
  };

  const updateTemplate = () => {
    const vesselToUpdate = vessels.find((v) => v.id === templateId);
    const updatedVessel = vesselDetailsStore.getVessel(templateId);

    VesselsFetcher.updateVesselTemplate(templateId, updatedVessel, collectionId)
      .then(() => VesselsFetcher.fetchVesselTemplateById(templateId, collectionId))
      .then((updatedVessels) => {
        syncTemplateAndInstances(updatedVessels);
        setIsTemplateUpdated(false);
      })
      .catch((err) => {
        console.error('Error updating template:', err);
      });
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
  };

  const updateInstance = (vesselId) => {
    const updatedModel = vesselDetailsStore.getVessel(vesselId);
    const jsModel = toJS(updatedModel);

    VesselsFetcher.updateVesselInstance(jsModel)
      .then(() => VesselsFetcher.fetchVesselTemplateById(vesselTemplateId, collectionId))
      .then((updatedVessels) => {
        syncTemplateAndInstances(updatedVessels);
      })
      .catch((err) => {
        console.error('Error updating instance:', err);
      });
  };

  return (
    <>
      <Card className="detail-card shadow-sm">
        <Card.Header>
          {renderHeaderContent()}
        </Card.Header>
        <Card.Body className="bg-light">
          <Card.Title className="mb-3">Vessel Template Details</Card.Title>
          <Form>
            {['vesselName',
              'details',
              'vesselType',
              'materialType',
              'materialDetails',
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
            <Form.Group as={Row} className="mb-2 align-items-center">
              <Form.Label column sm={3} className="text-capitalize">
                Volume:
              </Form.Label>
              <Col sm={5}>
                <InputGroup>
                  <Form.Control
                    type="number"
                    value={templateStoreItem?.volumeAmount || ''}
                    onChange={(e) => handleTemplateChange('volumeAmount', parseFloat(e.target.value) || 0)}
                  />
                  <Button
                    variant="success"
                    onClick={() => {
                      const currentUnit = templateStoreItem?.volumeUnit || 'ml';
                      const newUnit = currentUnit === 'ml' ? 'l' : 'ml';
                      handleTemplateChange('volumeUnit', newUnit);
                    }}
                  >
                    {templateStoreItem?.volumeUnit || 'ml'}
                  </Button>
                </InputGroup>
              </Col>
            </Form.Group>
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
      <Card className="detail-card shadow-sm mt-3">
        <Card.Body>
          <Card.Title className="mb-3 d-flex">
            <span>Vessel Instances</span>
            <div className="ms-auto d-flex gap-2">
            <Button variant="primary" size="sm" onClick={() => setShowBulkModal(true)}>
                Bulk Create
              </Button>
              <Button variant="primary" size="sm" onClick={handleAddNewInstance}>
                <i className="fa fa-plus" title="Add instance" />
              </Button>
            </div>
          </Card.Title>
          <Table bordered hover responsive className="table-sm border-rounded">
            <thead className="table-light">
              <tr>
                <th>Name</th>
                <th>Description</th>
                <th>Barcode</th>
                <th>QR Code</th>
                <th>Weight</th>
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
                  ].map((field) => (
                    <td key={field} className="p-1">
                      <Form.Control
                        type={field === 'weightAmount' ? 'number' : 'text'}
                        readOnly={field === 'barCode'}
                        value={instance[field] ?? ''}
                        onChange={(e) => handleInstanceChange(instance.id, field, e.target.value)}
                        style={field === 'barCode' ? { cursor: 'not-allowed' } : undefined}
                      />
                    </td>
                  ))}
                  <td className="p-1">
                    <Form.Group className="m-0">
                      <InputGroup>
                        <Form.Control
                          type="number"
                          style={{ maxWidth: '100px' }}
                          value={instance.weightAmount ?? ''}
                          onChange={(e) => handleInstanceChange(instance.id, 'weightAmount', e.target.value)}
                        />
                        <Button
                          variant="success"
                          size="sm"
                          onClick={() => {
                            const units = ['g', 'kg', 'mg'];
                            const currentIndex = units.indexOf(instance.weightUnit);
                            const nextUnit = units[(currentIndex + 1) % units.length];
                            handleInstanceChange(instance.id, 'weightUnit', nextUnit);
                          }}
                        >
                          {instance.weightUnit || 'g'}
                        </Button>
                      </InputGroup>
                    </Form.Group>
                  </td>
                  <td className="align-middle">
                    <div className="d-flex flex-wrap gap-1 justify-content-center align-items-center">
                      <Button
                        variant="warning"
                        size="xxsm"
                        onClick={() => updateInstance(instance.id)}
                      >
                        <i className="fa fa-save" title="Save changes" />
                      </Button>
                      <Button
                        variant="warning"
                        size="xxsm"
                        onClick={openModal}
                      >
                        <i className="fa fa-minus-square" title="Remove from current collection" />
                      </Button>
                    </div>
                    <Modal
                      show={showConfirm}
                      onHide={closeModal}
                      backdropClassName="custom-backdrop"
                      centered
                    >
                      <Modal.Body>
                        Remove selected vessel instance from this collection?
                      </Modal.Body>
                      <Modal.Footer>
                        <Button variant="secondary" onClick={closeModal} disabled={deleting}>
                          Cancel
                        </Button>
                        <Button
                          variant="danger"
                          onClick={() => HandleDeleteInstance(instance.id, vesselTemplateId)}
                          disabled={deleting}
                        >
                          {deleting ? 'Removing…' : 'Remove'}
                        </Button>
                      </Modal.Footer>
                    </Modal>
                  </td>
                </tr>
              ))}
              {newInstances.map((instance, index) => (
                <tr key={`new-${index}`}>
                  {['vesselInstanceName', 'vesselInstanceDescription', 'barCode', 'qrCode'].map((field) => (
                    <td key={field} className="p-1">
                      <Form.Control
                        type="text"
                        value={instance[field] ?? ''}
                        onChange={(e) => {
                          const updated = [...newInstances];
                          updated[index][field] = e.target.value;
                          setNewInstances(updated);
                        }}
                      />
                    </td>
                  ))}
                  <td className="p-1">
                    <InputGroup>
                      <Form.Control
                        type="number"
                        value={instance.weightAmount ?? ''}
                        style={{ maxWidth: '100px' }}
                        onChange={(e) => {
                          const updated = [...newInstances];
                          updated[index].weightAmount = e.target.value;
                          setNewInstances(updated);
                        }}
                      />
                      <Button
                        variant="success"
                        size="sm"
                        onClick={() => {
                          const updated = [...newInstances];
                          const current = updated[index].weightUnit || 'g';
                          const units = ['g', 'kg', 'mg'];
                          const next = units[(units.indexOf(current) + 1) % units.length];
                          updated[index].weightUnit = next;
                          setNewInstances(updated);
                        }}
                      >
                        {instance.weightUnit || 'g'}
                      </Button>
                    </InputGroup>
                  </td>
                  <td className="align-middle">
                    <div className="d-flex flex-wrap gap-1 justify-content-center align-items-center">
                      <Button
                        variant="warning"
                        size="xxsm"
                        onClick={() => handleCreateNewInstance(instance, index)}
                      >
                        <i className="fa fa-save" title="Save changes" />
                      </Button>
                      <Button
                        variant="danger"
                        size="xxsm"
                        onClick={() => {
                          const updated = [...newInstances];
                          updated.splice(index, 1);
                          setNewInstances(updated);
                        }}
                      >
                        <i className="fa fa-trash" title="Delete" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
          <BulkInstanceModal
            show={showBulkModal}
            onHide={() => setShowBulkModal(false)}
            onSubmit={handleBulkCreate}
            defaultBaseName={templateStoreItem?.vesselName}
            onValidate={null}
          />

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
  onClose: PropTypes.func.isRequired,
};

export default observer(VesselTemplateDetails);
