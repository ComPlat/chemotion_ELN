import React, { useState, useContext } from 'react';
import { Select } from 'src/components/common/Select';
import { collectionOptions } from 'src/utilities/collectionUtilities';
import { StoreContext } from 'src/stores/mobx/RootStore';

const CollectionSelect = ({ value, withShared, onChange }) => {
  const collectionsStore = useContext(StoreContext).collections;
  const [selectedCollection, setSelectedCollection] = useState(value || null);

  // Indent by nesting depth only inside the menu; the selected value shown in the control should
  // sit flush-left. `depth` defaults to 0 so a stray option without it never yields `NaNpx`.
  const optionLabel = ({ label, depth = 0 }, { context } = {}) => (
    <span style={{ paddingLeft: context === 'menu' ? `${depth * 10}px` : 0 }}>
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
