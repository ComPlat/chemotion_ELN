import React, { useState, useContext } from 'react';
import PropTypes from 'prop-types';
import { Form } from 'react-bootstrap';
import UIStore from 'src/stores/alt/stores/UIStore';
import { filterParamsFromUIState } from 'src/utilities/collectionUtilities';
import AppModal from 'src/components/common/AppModal';
import CollectionSelect from 'src/components/common/CollectionSelect';
import { StoreContext } from 'src/stores/mobx/RootStore';

function SelectionTransferModal({
  title,
  action,
  onHide,
  withShared,
}) {
  const collectionsStore = useContext(StoreContext).collections;
  const [selectedCollection, setSelectedCollection] = useState('');
  const [collectionLabel, setCollectionLabel] = useState('');

  const handleSubmit = () => {
    const uiState = filterParamsFromUIState(UIStore.getState());
    let collectionParams = { id: selectedCollection?.id };
    if (collectionLabel) {
      collectionParams = { label: collectionLabel, parent_id: '', inventory_id: '' };
    }

    if (action === 'move') {
      collectionsStore.moveElementsToCollection(collectionParams, uiState);
    } else if (action === 'assign') {
      collectionsStore.assignElementsToCollection(collectionParams, uiState);
    }
    onHide();
  };

  const primaryActionLabel = collectionLabel
    ? `Create collection "${collectionLabel}" and Submit`
    : 'Submit';

  const primaryActionDisabled = !collectionLabel && !selectedCollection;

  return (
    <AppModal
      show
      onHide={onHide}
      title={title}
      primaryActionLabel={primaryActionLabel}
      onPrimaryAction={handleSubmit}
      primaryActionDisabled={primaryActionDisabled}
    >
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
      </Form>
    </AppModal>
  );
}

export default SelectionTransferModal;

SelectionTransferModal.propTypes = {
  title: PropTypes.string.isRequired,
  action: PropTypes.string.isRequired,
  onHide: PropTypes.func.isRequired,
  withShared: PropTypes.bool,
};

SelectionTransferModal.defaultProps = {
  withShared: false,
};
