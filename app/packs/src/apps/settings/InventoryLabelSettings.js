/* eslint-disable react/forbid-prop-types */
import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import TreeSelect from 'antd/lib/tree-select';
import {
  Alert, Button, Card, Row, Col, Form
} from 'react-bootstrap';
import InventoryFetcher from 'src/fetchers/InventoryFetcher';
import { find } from 'lodash';

const InventoryLabelSettings = () => {
  const [prefixValue, setPrefixValue] = useState('');
  const [nameValue, setNameValue] = useState('');
  const [counterValue, setCounterValue] = useState('');
  const [options, setOptions] = useState([]);
  const [selectedCollections, setSelectedValue] = useState([]);
  const [currentInventoryCollection, setInventoryLabels] = useState(null);
  const [spinner, setSpinner] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);

  const assignOptions = (inventoryCollections) => {
    const assignedOptions = [];
    let groupCounter = 0;

    inventoryCollections.forEach((group) => {
      const { collections, inventory } = group;

      // If the group has an inventory, create a group label
      if (inventory?.id) {
        const groupLabel = `Collections in inventory: ${inventory.name}`;
        const groupObject = { value: groupLabel, title: groupLabel, children: [] };

        assignedOptions.push(groupObject);
        groupObject.children = collections.map((collection) => ({
          value: collection.id,
          title: collection.label,
        }));
        groupCounter += 1;
      } else {
        // If there's no inventory, treat each collection individually
        collections.forEach((collection) => {
          assignedOptions.push({ value: collection.id, title: collection.label });
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
    const updateInventoryLabels = [...currentInventoryCollection];

    updateInventoryLabels.forEach((obj) => {
      if (collectionIds.includes(obj.id)) {
        // eslint-disable-next-line no-param-reassign
        obj.inventory = updatedCollectionInventories;
      }
      return obj;
    });
    const [inventoryCollections] = [
      updatedCollectionInventories.inventory_collections,
    ];
    if (inventoryCollections) {
      const optionsArray = assignOptions(inventoryCollections);
      setOptions(optionsArray);
      setInventoryLabels(inventoryCollections);
    }
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
    // find collections of Group
    const collectionsIds = selectedOptions;
    selectedOptions?.map((group, index) => {
      if (typeof group === 'string') {
        const groupObject = find(options, { title: group });
        collectionsIds[index] = groupObject.children.map((child) => child.value);
      }
      return collectionsIds;
    });
    return [].concat(...collectionsIds);
  };

  const updateUserSettings = () => {
    setSpinner(true);
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
        setSpinner(false);
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
      setSpinner(false);
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
      setCounterValue(counterValue);
      setPrefixValue(prefixValue);
      setNameValue(nameValue);
    }
  };

  const nextValue = counterValue !== '' && counterValue !== null ? `-${parseInt(counterValue + 1, 10)}` : '';
  const prefixCondition = prefixValue !== undefined && prefixValue !== null && prefixValue !== '';
  const nameCondition = nameValue !== undefined && nameValue !== null && nameValue !== '';
  const nextInventoryLabel = prefixCondition && nameCondition ? `${prefixValue}${nextValue}` : null;

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
            <b>Next sample inventory label will be:</b>
            {nextInventoryLabel}
          </Col>
        </Row>
        <Row>
          <Col xs={{ offset: 8 }}>
            <Button
              variant="primary"
              onClick={() => { updateUserSettings(); }}
            >
              {spinner
                ? (
                  <i className="fa fa-spinner fa-pulse" aria-hidden="true" />
                ) : (
                  'Update user settings'
                )}
            </Button>
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
    </Card>
  );
};

document.addEventListener('DOMContentLoaded', () => {
  const domElement = document.getElementById('InventoryLabelSettings');
  if (domElement) { ReactDOM.render(<InventoryLabelSettings />, domElement); }
});
