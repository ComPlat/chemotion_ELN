import React, { useState, useContext } from 'react';
import PropTypes from 'prop-types';
import AppModal from 'src/components/common/AppModal';

import { StoreContext } from 'src/stores/mobx/RootStore';
import UserStore from 'src/stores/alt/stores/UserStore';

function ModalExportCollection({ onHide }) {
  const collectionsStore = useContext(StoreContext).collections;
  const lockedCollections = collectionsStore.locked_collection;
  const ownCollections = collectionsStore.own_collections;
  const allCollections = [];
  const currentUser = (UserStore.getState() && UserStore.getState().currentUser) || {};
  const [checkedCollections, setCheckedCollections] = useState({});
  const [processing, setProcessing] = useState(false);

  const handleSubmit = () => {
    setProcessing(true);
    const collectionIds = {
      collection_ids: Object.keys(checkedCollections).map((c) => Number(c))
    };
    collectionsStore.exportCollections(collectionIds, currentUser);

    setTimeout(() => {
      setProcessing(false);
      onHide();
    }, 1000);
  };

  const allCollectionsChecked = () => (allCollections.length === Object.keys(checkedCollections).length);

  const isChecked = (id) => checkedCollections[id];

  const isDisabled = () => (processing === true || Object.keys(checkedCollections).length < 1);

  const handleCheckboxChange = (e) => {
    if (e.target.checked) {
      setCheckedCollections({ ...checkedCollections, [e.target.value]: e.target.checked });
    } else {
      const newCheckedCollections = { ...checkedCollections };
      delete newCheckedCollections[e.target.value];
      setCheckedCollections(newCheckedCollections);
    }
  };

  const handleCheckAll = () => {
    const checked = {};

    if (!allCollectionsChecked()) {
      allCollections.forEach((collection) => {
        if (collection.id === 0) { return; }
        checked[collection.id] = true;
      });
    }
    setCheckedCollections(checked);
  };

  const renderTree = (collections) => {
    const nodes = collections.map((collection) => {
      const nodeKey = `${collection.id}-${collection.label}`;

      if (collection.is_locked && !['All', 'chemotion-repository.net', 'transferred'].includes(collection.label)) {
        return (
          <li key={nodeKey}>
            <h6>{collection.label}</h6>
            {renderTree(collection.children)}
          </li>
        );
      }
      if (allCollections.findIndex((c) => c.id === collection.id) === -1) {
        allCollections.push(collection);
      }

      return (
        <li key={nodeKey}>
          <input
            className="common-checkbox"
            type="checkbox"
            id={`export-collection-${collection.id}`}
            value={collection.id}
            onChange={handleCheckboxChange}
            checked={isChecked(collection.id)}
          />
          <label className="ms-3" htmlFor={`export-collection-${collection.id}`}>
            {collection.label}
          </label>

          {renderTree(collection.children)}
        </li>
      );
    });

    return (
      <ul className="list-unstyled">
        {nodes}
      </ul>
    );
  };

  const renderCollections = (label, collections) => {
    if (Array.isArray(collections) && collections.length > 0) {
      return (
        <div>
          <h4>{label}</h4>
          {renderTree(collections)}
        </div>
      );
    }
    return null;
  };

  const renderCheckAll = () => (
    <div className="mt-3">
      <input
        type="checkbox"
        id="export-collection-check-all"
        checked={allCollectionsChecked()}
        onChange={handleCheckAll}
        className="common-checkbox"
      />
      <label className="ms-3" htmlFor="export-collection-check-all">
        {allCollectionsChecked() ? 'Deselect all' : 'Select all'}
      </label>
    </div>
  );

  const primaryActionLabel = processing === true ? 'Exporting' : 'Export ZIP';

  return (
    <AppModal
      show
      onHide={onHide}
      title="Export Collections as ZIP archive"
      primaryActionLabel={primaryActionLabel}
      onPrimaryAction={handleSubmit}
      primaryActionDisabled={isDisabled()}
    >
      <div className="export-collections-modal">
        {renderCollections('Global Collections', lockedCollections)}
        {renderCollections('My Collections', ownCollections)}
      </div>
      {renderCheckAll()}
    </AppModal>
  );
}

export default ModalExportCollection;

ModalExportCollection.propTypes = {
  onHide: PropTypes.func.isRequired,
};
