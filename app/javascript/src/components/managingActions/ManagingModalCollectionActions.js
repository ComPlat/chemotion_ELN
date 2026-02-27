import React, { useState, useContext } from 'react';
import PropTypes from 'prop-types';
import { Form, Button, Modal } from 'react-bootstrap';
import UIStore from 'src/stores/alt/stores/UIStore';
import { filterParamsFromUIState } from 'src/utilities/collectionUtilities';
import CollectionSelect from 'src/components/common/CollectionSelect';
import { StoreContext } from 'src/stores/mobx/RootStore';

const ManagingModalCollectionActions = ({ title, action, onHide, withShared }) => {
  const collectionsStore = useContext(StoreContext).collections;
  const [selectedCollection, setSelectedCollection] = useState('');
  const [collectionLabel, setCollectionLabel] = useState('');

  const handleSubmit = () => {
    const uiState = filterParamsFromUIState(UIStore.getState());
    let collectionParams = { id: selectedCollection?.id }
    if (collectionLabel) {
      collectionParams = { label: collectionLabel, parent_id: '', inventory_id: '' }
    }

    if (action == 'move') {
      collectionsStore.moveElementsToCollection(collectionParams, uiState);
    } else if (action == 'assign') {
      collectionsStore.assignElementsToCollection(collectionParams, uiState);
    }
    onHide();
  }

  const submitButton = () => {
    return collectionLabel ? (
      <Button variant="warning" onClick={handleSubmit}>
        Create collection "{collectionLabel}" and Submit
      </Button>
    ) : (
      <Button variant="warning" onClick={handleSubmit} disabled={!selectedCollection}>
        Submit
      </Button>
    );
  }

  return (
    <Modal show centered onHide={onHide}>
      <Modal.Header closeButton>
        <Modal.Title>{title}</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <Form>
          <Form.Group className="mb-3">
            <Form.Label>Select a Collection</Form.Label>
            <CollectionSelect
              value={selectedCollection}
              withShared={withShared}
              onChange={setSelectedCollection}
            />
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label>or Create a new Collection</Form.Label>
            <Form.Control
              type="text"
              placeholder="-- Please insert collection name --"
              onChange={(e) => setCollectionLabel(e.target && e.target.value)}
            />
          </Form.Group>
          {submitButton()}
        </Form>
      </Modal.Body>
    </Modal>
  );
}

export default ManagingModalCollectionActions;

ManagingModalCollectionActions.propTypes = {
  title: PropTypes.string.isRequired,
  action: PropTypes.string.isRequired,
  onHide: PropTypes.func.isRequired,
  listSharedCollections: PropTypes.bool.isRequired,
};
