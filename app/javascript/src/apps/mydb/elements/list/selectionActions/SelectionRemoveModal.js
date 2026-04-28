import React, { useContext } from 'react';
import PropTypes from 'prop-types';
import { filterParamsFromUIState } from 'src/utilities/collectionUtilities';
import AppModal from 'src/components/common/AppModal';

import UIStore from 'src/stores/alt/stores/UIStore';
import { StoreContext } from 'src/stores/mobx/RootStore';

function SelectionRemoveModal({ onHide }) {
  const collectionsStore = useContext(StoreContext).collections;
  const submit = () => {
    const uiState = filterParamsFromUIState(UIStore.getState());
    const params = { collection_id: uiState.currentCollection.id, ui_state: uiState };

    collectionsStore.removeElementsFromCollection(params);
    onHide();
  };

  return (
    <AppModal
      show
      onHide={onHide}
      title="Remove selected elements from this Collection?"
      primaryActionLabel="Remove"
      onPrimaryAction={submit}
    >
      Selected elements will be removed from the current collection.
    </AppModal>
  );
}

SelectionRemoveModal.propTypes = {
  onHide: PropTypes.func.isRequired,
};

export default SelectionRemoveModal;
