import React, { useState, useContext } from 'react';
import { Select } from 'src/components/common/Select';
import { collectionOptions } from 'src/utilities/collectionUtilities';
import { StoreContext } from 'src/stores/mobx/RootStore';

const CollectionSelect = ({ value, withShared, onChange }) => {
  const collectionsStore = useContext(StoreContext).collections;
  const [selectedCollection, setSelectedCollection] = useState(value || null);

  const optionLabel = ({ label, depth }) => (
    <span style={{ paddingLeft: `${depth * 10}px` }}>
      {label}
    </span>
  );

  const changeValue = (val) => {
    setSelectedCollection(val);
    onChange(val);
  }

  return (
    <Select
      id="modal-collection-id-select"
      options={collectionOptions(collectionsStore, withShared)}
      formatOptionLabel={optionLabel}
      value={selectedCollection}
      getOptionValue={(o) => o.id}
      onChange={(val) => changeValue(val)}
    />
  );
}

export default CollectionSelect;
