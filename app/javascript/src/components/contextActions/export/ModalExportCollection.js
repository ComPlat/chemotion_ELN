import React, { useState, useContext } from 'react';
import PropTypes from 'prop-types';
import { Button, ButtonToolbar, Modal } from 'react-bootstrap';

import { StoreContext } from 'src/stores/mobx/RootStore';
import UserStore from 'src/stores/alt/stores/UserStore';

const ModalExportCollection = ({ onHide }) => {
  const collectionsStore = useContext(StoreContext).collections;
  const lockedCollections = collectionsStore.locked_collection;
  const ownCollections = collectionsStore.own_collections;
  let allCollections = [];
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
  }

  const allCollectionsChecked = () => {
    return (allCollections.length === Object.keys(checkedCollections).length);
  }

  const isChecked = (id) => {
    return checkedCollections[id];
  }

  const isDisabled = () => {
    return (processing === true || Object.keys(checkedCollections).length < 1)
  }

  const handleCheckboxChange = (e) => {
    if (e.target.checked) {
      setCheckedCollections({ ...checkedCollections, [e.target.value]: e.target.checked });
    } else {
      let newCheckedCollections = { ...checkedCollections };
      delete (newCheckedCollections[e.target.value]);
      setCheckedCollections(newCheckedCollections);
    }
  }

  const handleCheckAll = () => {
    const checked = {};

    if (!allCollectionsChecked()) {
      allCollections.forEach((collection) => {
        if (collection.id === 0) { return }
        checked[collection.id] = true;
      });
    }
    setCheckedCollections(checked);
  }

  const renderCollections = (label, collections) => {
    if (Array.isArray(collections) && collections.length > 0) {
      return (
        <div>
          <h4>{label}</h4>
          {renderTree(collections)}
        </div>
      )
    }
  }

  const renderTree = (collections) => {
    let nodes = collections.map((collection, index) => {
      if (collection.is_locked && !['All', 'chemotion-repository.net', 'transferred'].includes(collection.label)) {
        return (
          <li key={index}>
            <h6>{collection.label}</h6>
            {renderTree(collection.children)}
          </li>
        );
      } else {
        if (allCollections.findIndex((c) => c.id == collection.id) === -1) {
          allCollections.push(collection);
        }

        return (
          <li key={index}>
            <input className="common-checkbox" type="checkbox"
              id={"export-collection-" + collection.id}
              value={collection.id}
              onChange={handleCheckboxChange}
              checked={isChecked(collection.id)} />
            <label className="ms-3" htmlFor={"export-collection-" + collection.id}>
              {collection.label}
            </label>

            {renderTree(collection.children)}
          </li>
        )
      }
    })

    return (
      <ul className="list-unstyled">
        {nodes}
      </ul>
    );
  }

  const renderCheckAll = () => {
    return (
      <div className="mt-3">
        <input type="checkbox" id="export-collection-check-all"
          checked={allCollectionsChecked()} onChange={handleCheckAll} className="common-checkbox" />
        <label className="ms-3" htmlFor="export-collection-check-all">
          {allCollectionsChecked() ? "Deselect all" : "Select all"}
        </label>
      </div>
    )
  }

  const renderButtonBar = () => {
    const bStyle = processing === true ? 'danger' : 'warning';
    const bClass = processing === true ? 'fa fa-spinner fa-pulse fa-fw me-2' : 'fa fa-file-text-o me-2';
    const bTitle = processing === true ? 'Exporting' : 'Export ZIP';
    return (
      <ButtonToolbar className="justify-content-end gap-1">
        <Button variant="primary" onClick={onHide}>Cancel</Button>
        <Button
          variant={bStyle}
          id="md-export-dropdown"
          disabled={isDisabled()}
          title="Export as ZIP file (incl. attachments)"
          onClick={handleSubmit}
        >
          <span><i className={bClass} />{bTitle}</span>
        </Button>
      </ButtonToolbar>
    );
  }

  return (
    <Modal show onHide={onHide}>
      <Modal.Header closeButton>
        <Modal.Title>Export Collections as ZIP archive</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <div className="export-collections-modal">
          {renderCollections('Global Collections', lockedCollections)}
          {renderCollections('My Collections', ownCollections)}
        </div>
        {renderCheckAll()}
        {renderButtonBar()}
      </Modal.Body>
    </Modal>
  );
}

export default ModalExportCollection;

ModalExportCollection.propTypes = {
  onHide: PropTypes.func.isRequired,
}
