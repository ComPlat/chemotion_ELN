import React, { useContext } from 'react';
import PropTypes from 'prop-types';
import { Button, ButtonToolbar, Modal } from 'react-bootstrap';
import { filterParamsFromUIState } from 'src/utilities/collectionUtilities';

import UIStore from 'src/stores/alt/stores/UIStore';
import { StoreContext } from 'src/stores/mobx/RootStore';

const ManagingModalRemove = ({ onHide }) => {
  const collectionsStore = useContext(StoreContext).collections;

  const submit = () => {
    const uiState = filterParamsFromUIState(UIStore.getState());
    const params = { collection_id: uiState.currentCollection.id, ui_state: uiState };

    collectionsStore.removeElementsFromCollection(params);
    onHide();
  };

  return (
    <Modal show centered onHide={onHide}>
      <Modal.Header closeButton>
        <Modal.Title>Remove selected elements from this Collection?</Modal.Title>
      </Modal.Header>

      <Modal.Body>
        <ButtonToolbar className="gap-1">
          <Button variant="primary" onClick={onHide}>Cancel</Button>
          <Button variant="warning" onClick={submit}>Remove</Button>
        </ButtonToolbar>
      </Modal.Body>
    </Modal>
  );
};

ManagingModalRemove.propTypes = {
  onHide: PropTypes.func.isRequired,
};

export default ManagingModalRemove;
