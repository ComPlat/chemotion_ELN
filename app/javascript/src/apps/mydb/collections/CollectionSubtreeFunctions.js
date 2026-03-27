import React, { useState } from 'react';
import PropTypes from 'prop-types';
import {
  Button, Dropdown
} from 'react-bootstrap';
import ModalImport from 'src/apps/mydb/collections/importSamples/ModalImport';
import LiteratureModal from 'src/apps/mydb/collections/LiteratureModal';

function findCollectionLabelById(collections, collectionId) {
  if (!collections || collections.length === 0) return null;

  for (let index = 0; index < collections.length; index += 1) {
    const collection = collections[index];
    if (collection.id === collectionId) return collection.label;
    const childLabel = findCollectionLabelById(collection.children, collectionId);
    if (childLabel) return childLabel;
  }

  return null;
}

const CollectionSubtreeFunctionsDropdownToggle = React.forwardRef(({
  onClick,
}, ref) => (
  <Button
    variant="sidebar"
    className="rounded-circle"
    ref={ref}
    onClick={(e) => {
      onClick(e);
    }}
    size="xsm"
  >
    <i className="fa square-icon fa-ellipsis-v" />
  </Button>
));

CollectionSubtreeFunctionsDropdownToggle.displayName = 'CollectionSubtreeFunctionsDropdownToggle';
CollectionSubtreeFunctionsDropdownToggle.propTypes = {
  onClick: PropTypes.func.isRequired,
};

export default function CollectionSubtreeFunctions({ collection }) {
  if (collection === null || collection === undefined) return null;

  const [showImportModal, setShowImportModal] = useState(false);
  const [showLiteratureModal, setShowLiteratureModal] = useState(false);
  const [isLiteratureModalMounted, setIsLiteratureModalMounted] = useState(false);

  const collectionName = collection.label || 'Unknown Collection';

  const handleShowLiterature = (event) => {
    event.stopPropagation();
    setShowLiteratureModal(true);
  };

  const handleImportSamples = (event) => {
    event.stopPropagation();
    setShowImportModal(true);
  };

  const hideImportModal = () => setShowImportModal(false);
  const hideLiteratureModal = () => setShowLiteratureModal(false);

  const onClickDropdown = (event) => {
    event.stopPropagation();
    setIsLiteratureModalMounted(true);
  };

  return (
    <>
      <Dropdown
        id={`collection-subtree-functions-${collection.id}`}
        onClick={onClickDropdown}
        className="collection-subtree-functions"
      >
        <Dropdown.Toggle as={CollectionSubtreeFunctionsDropdownToggle} />
        <Dropdown.Menu renderOnMount popperConfig={{ strategy: 'fixed' }}>
          <Dropdown.Item onClick={handleShowLiterature}>
            <i className="fa square-icon fa-book me-1" />
            Reference Report
          </Dropdown.Item>
          <Dropdown.Item onClick={handleImportSamples}>
            <i className="icon-square icon-arrow-down-to-bracket me-1" />
            Import samples to collection
          </Dropdown.Item>
        </Dropdown.Menu>
      </Dropdown>

      <ModalImport
        show={showImportModal}
        collectionId={collection.id}
        collectionName={collectionName}
        onHide={hideImportModal}
      />

      {isLiteratureModalMounted && (
        <LiteratureModal
          collectionId={collection.id}
          show={showLiteratureModal}
          onHide={hideLiteratureModal}
        />
      )}
    </>
  );
}

CollectionSubtreeFunctions.propTypes = {
  collection: PropTypes.object.isRequired,
};
