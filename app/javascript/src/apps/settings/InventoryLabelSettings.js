/* eslint-disable react/forbid-prop-types */
import React, { useState, useEffect } from 'react';
import { TreeSelect } from 'antd';
import {
  Alert, Button, Card, Row, Col, Form, Modal, OverlayTrigger, Tooltip
} from 'react-bootstrap';
import InventoryFetcher from 'src/fetchers/InventoryFetcher';
import { find } from 'lodash';

function InventoryLabelSettings() {
  const [prefixValue, setPrefixValue] = useState('');
  const [nameValue, setNameValue] = useState('');
  const [counterValue, setCounterValue] = useState('');
  const [options, setOptions] = useState([]);
  const [selectedCollections, setSelectedValue] = useState([]);
  const [currentInventoryCollection, setInventoryLabels] = useState(null);
  const [updateSpinner, setUpdateSpinner] = useState(false);
  const [resetSpinner, setResetSpinner] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);
  const [showResetConfirmation, setShowResetConfirmation] = useState(false);

  const assignOptions = (inventoryCollections) => {
    const assignedOptions = [];

    inventoryCollections.forEach((group) => {
      const { collections, inventory } = group;

      if (inventory?.id && inventory?.name && inventory?.prefix) {
        // Only group collections if they have a valid inventory with non-null values
        const groupLabel = `Collections in inventory: ${inventory.name}`;
        const groupObject = { value: groupLabel, title: groupLabel, children: [] };

        assignedOptions.push(groupObject);
        groupObject.children = collections.map((collection) => ({
          value: collection.id,
          title: collection.label,
        }));
      } else {
        // If there's no inventory or it has null values, treat each collection individually
        collections.forEach((collection) => {
          assignedOptions.push({
            value: collection.id,
            title: collection.label,
          });
        });
      }
    });

    return assignedOptions;
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        const combinedData = await InventoryFetcher.fetchLabelsAndCollections();
        const [inventoryCollections] = [
          combinedData.inventory_collections,
        ];
        if (inventoryCollections) {
          const optionsArray = assignOptions(inventoryCollections);
          setOptions(optionsArray);
          setInventoryLabels(inventoryCollections);
        }
      } catch (error) {
        console.error(error);
      }
    };
    fetchData();
  }, []);

  const handlePrefixChange = (event) => {
    const prefixString = event.target.value;
    const regex = /^[A-Za-z]+$/;
    if (regex.test(prefixString)) {
      setPrefixValue(prefixString);
      setErrorMessage(null);
    } else {
      setPrefixValue('');
      setErrorMessage('prefix must be alphabetic');
    }
  };

  const handleNameChange = (event) => {
    setNameValue(event.target.value);
    setErrorMessage(null);
  };

  const handleCounterChange = (event) => {
    const inputValue = event.target.value;
    const parsedValue = parseInt(inputValue, 10);
    if (Number.isInteger(parsedValue) && !Number.isNaN(parsedValue)) {
      setCounterValue(parsedValue);
    } else {
      setCounterValue('');
    }
  };

  const updateInventoryLabelsArray = (collectionIds, updatedCollectionInventories) => {
    if (!updatedCollectionInventories?.inventory_collections) return;

    const updatedInventories = updatedCollectionInventories.inventory_collections;
    setInventoryLabels(updatedInventories);
    const optionsArray = assignOptions(updatedInventories);
    setOptions(optionsArray);

    // Keep only the valid collection IDs in the selection
    const validCollectionIds = collectionIds.filter((id) => optionsArray.some((group) => {
      if (group.children) {
        return group.children.some((child) => child.value === id);
      }
      return group.value === id;
    }));
    setSelectedValue(validCollectionIds);
  };

  const findCollectionIds = (selectedOptions) => {
    // find collections of Group
    let collectionsIds = [];
    if (typeof selectedOptions[0] === 'string') {
      options.map((object) => {
        if (object.title === selectedOptions[0]) {
          collectionsIds = object.children.map((child) => child.value);
        }
        return null;
      });
    } else {
      collectionsIds = selectedOptions;
    }
    return collectionsIds;
  };

  const collectCollectionIds = (selectedOptions) => {
    if (!selectedOptions || selectedOptions.length === 0) return [];

    const collectionIds = selectedOptions.map((option) => {
      if (typeof option === 'string') {
        // If it's a group title, find the group and get all its collection IDs
        const groupObject = find(options, { title: option });
        return groupObject?.children?.map((child) => child.value) || [];
      }
      // If it's already a collection ID, return it directly
      return option;
    });

    // Flatten the array and remove any undefined/null values
    return collectionIds.flat().filter((id) => id != null);
  };

  const updateUserSettings = () => {
    setUpdateSpinner(true);
    const collectionIds = collectCollectionIds(selectedCollections);
    const prefixCondition = prefixValue !== undefined && prefixValue !== null && prefixValue !== '';
    const nameCondition = nameValue !== undefined && nameValue !== null && nameValue !== '';
    const counterCondition = counterValue !== undefined && counterValue !== null && counterValue !== '';
    if (prefixCondition && nameCondition && counterCondition && collectionIds.length !== 0) {
      setErrorMessage(null);
      InventoryFetcher.updateInventoryLabel({
        prefix: prefixValue,
        name: nameValue,
        counter: counterValue,
        collection_ids: collectionIds
      }).then((result) => {
        setUpdateSpinner(false);
        if (result.error_message) {
          if (result.error_type === 'ActiveRecord::RecordNotUnique') {
            setErrorMessage('Entered Prefix is not available. Please use a different prefix');
          } else {
            setErrorMessage('Please enter a valid name, prefix, and counter inputs before updating user settings');
          }
          setPrefixValue('');
        } else {
          updateInventoryLabelsArray(collectionIds, result);
        }
      });
    } else {
      const message = 'Please select the desired collection(s) and enter a valid name, prefix, '
        + 'and counter inputs before updating user settings';
      setErrorMessage(message);
      setUpdateSpinner(false);
    }
  };

  const findInventory = (selectedOption, selectedIds) => {
    let inventoryArray = [];
    let inventory = [];
    if (selectedOption.length > 1 && selectedOption.some((item) => typeof item === 'string')) {
      return null;
    }
    if ((selectedIds || typeof selectedOption[0] === 'string') && selectedOption.length === 1) {
      inventoryArray = currentInventoryCollection.map((object) => (
        object.collections.map((obj) => (obj.id === selectedIds[0] ? object.inventory : null))
      ).filter((item) => item !== null));
      inventory = inventoryArray?.flat()?.[0];
    } else if (selectedIds && selectedIds.length > 1) {
      const collectionGroup = currentInventoryCollection.map((object) => (
        object.collections.map((obj) => obj.id))).filter((ids) => selectedIds.every((id) => ids.includes(id))).flat();
      const index = currentInventoryCollection.map((object, i) => object.collections.map(
        (obj) => (obj.id === collectionGroup[0] ? i : null)
      )).flat().filter((item) => item !== null);
      inventory = currentInventoryCollection[index]?.inventory;
    }
    return inventory;
  };

  const handleSelectOptionChange = (selectedOptions) => {
    setSelectedValue(selectedOptions);
    setErrorMessage(null);

    const selectedIds = selectedOptions.length !== 0 ? findCollectionIds(selectedOptions) : null;
    const inventory = selectedIds ? findInventory(selectedOptions, selectedIds) : null;
    if (inventory) {
      setCounterValue(inventory.counter);
      setPrefixValue(inventory.prefix);
      setNameValue(inventory.name);
    } else {
      setCounterValue('');
      setPrefixValue('');
      setNameValue('');
    }
  };

  const nextValue = counterValue !== '' && counterValue !== null ? `-${parseInt(counterValue + 1, 10)}` : '';
  const prefixCondition = prefixValue !== undefined && prefixValue !== null && prefixValue !== '';
  const nameCondition = nameValue !== undefined && nameValue !== null && nameValue !== '';
  const nextInventoryLabel = prefixCondition && nameCondition ? `${prefixValue}${nextValue}` : null;

  const handleResetInventoryLabel = () => {
    setResetSpinner(true);
    const collectionIds = collectCollectionIds(selectedCollections);

    InventoryFetcher.updateInventoryLabel({
      prefix: null,
      name: null,
      counter: 0,
      collection_ids: collectionIds
    }).then((result) => {
      if (result.error_message) {
        setErrorMessage('Error resetting inventory label');
      } else {
        setPrefixValue('');
        setNameValue('');
        setCounterValue('');
        setSelectedValue([]);
        updateInventoryLabelsArray(collectionIds, result, true);
      }
      setResetSpinner(false);
    }).catch(() => {
      setErrorMessage('Error resetting inventory label');
      setResetSpinner(false);
    });
  };

  const handleResetConfirmation = () => {
    const collectionIds = collectCollectionIds(selectedCollections);

    if (collectionIds.length === 0) {
      setErrorMessage('Please select collection(s) to reset');
      setResetSpinner(false);
    } else {
      setShowResetConfirmation(true);
    }
  };

  const handleResetCancel = () => {
    setShowResetConfirmation(false);
  };

  const handleResetConfirm = () => {
    setShowResetConfirmation(false);
    handleResetInventoryLabel();
  };

  return (
    <Card>
      <Card.Header>Sample Inventory Label</Card.Header>
      <Card.Body>
        <Row className="mb-3">
          <Col xs={{ span: 3, offset: 3 }}><Form.Label>Select Collection</Form.Label></Col>
          <Col xs={3}>
            <TreeSelect
              name="names of collections"
              style={{ width: '100%' }}
              multiple
              treeData={options}
              onChange={(selectedOptions) => handleSelectOptionChange(selectedOptions)}
              value={selectedCollections}
              dropdownStyle={{ maxHeight: '250px', zIndex: '500000' }}
            />
          </Col>
        </Row>
        <Row className="mb-3">
          <Col xs={{ span: 3, offset: 3 }}>
            <Form.Label>
              Name
            </Form.Label>
          </Col>
          <Col xs={2}>
            <Form.Control type="text" value={nameValue} onChange={handleNameChange} />
          </Col>
        </Row>
        <Row className="mb-3">
          <Col xs={{ span: 3, offset: 3 }}>
            <Form.Label>Prefix</Form.Label>
          </Col>
          <Col xs={2}>
            <Form.Control type="text" value={prefixValue} onChange={handlePrefixChange} />
          </Col>
        </Row>
        <Row className="mb-3">
          <Col xs={{ span: 3, offset: 3 }}>
            <Form.Label>
              Counter starts at
            </Form.Label>
          </Col>
          <Col xs={2}>
            <Form.Control type="text" value={counterValue} onChange={handleCounterChange} />
          </Col>
        </Row>
        <Row className="mb-3">
          <Col xs={{ offset: 3 }}>
            <b>Next sample inventory label will be: </b>
            {nextInventoryLabel}
          </Col>
        </Row>
        <Row>
          <Col xs={12} className="d-flex justify-content-end pe-5">
            <div className="d-flex gap-2" style={{ width: '600px' }}>
              <Button
                variant="primary"
                onClick={() => { updateUserSettings(); }}
                style={{ width: '180px' }}
                disabled={resetSpinner}
              >
                {updateSpinner
                  ? (
                    <i className="fa fa-spinner fa-pulse" aria-hidden="true" />
                  ) : (
                    'Update Inventory Label'
                  )}
              </Button>
              <OverlayTrigger
                placement="top"
                overlay={(
                  <Tooltip>
                    Reset the inventory label settings (prefix, name, counter) for selected collections
                  </Tooltip>
                )}
              >
                <Button
                  variant="danger"
                  onClick={handleResetConfirmation}
                  style={{ minWidth: '180px' }}
                  disabled={updateSpinner}
                >
                  {resetSpinner
                    ? (
                      <i className="fa fa-spinner fa-pulse" aria-hidden="true" />
                    ) : (
                      'Reset inventory label'
                    )}
                </Button>
              </OverlayTrigger>
            </div>
          </Col>
        </Row>
        {errorMessage && (
          <Row className="mt-3">
            <Col xs={{ span: 6, offset: 3 }}>
              <Alert variant="danger">
                {errorMessage}
              </Alert>
            </Col>
          </Row>
        )}
      </Card.Body>

      <Modal show={showResetConfirmation} onHide={handleResetCancel}>
        <Modal.Header closeButton>
          <Modal.Title>Confirm Reset</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          You are about to delete the inventory label for selected collection(s).
          Are you sure you want to delete the assigned prefix, name and counter?
        </Modal.Body>
        <Modal.Footer>
          <Button onClick={handleResetCancel}>
            Cancel
          </Button>
          <Button variant="danger" onClick={handleResetConfirm}>
            Yes, Reset
          </Button>
        </Modal.Footer>
      </Modal>
    </Card>
  );
}

export default InventoryLabelSettings;
