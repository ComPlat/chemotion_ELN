import React, { useState } from 'react';
import PropTypes from 'prop-types';
import {
  Button, Dropdown
} from 'react-bootstrap';
import ModalImport from 'src/apps/mydb/collections/importSamples/ModalImport';
import LiteratureModal from 'src/apps/mydb/collections/LiteratureModal';
import SelectionShareModal from 'src/apps/mydb/elements/list/selectionActions/SelectionShareModal';
import ModalExportRadarCollection from 'src/apps/mydb/collections/ModalExportRadarCollection';
import { PermissionConst } from 'src/utilities/PermissionConst';
import { DEFAULT_COLLECTION_SHARE_PERMISSIONS } from 'src/utilities/collectionConstants';
import { elementShowOrNew } from 'src/utilities/routesUtils';
import Aviator from 'aviator';

const CollectionSubtreeFunctionsDropdownToggle = React.forwardRef(({
  onClick,
}, ref) => (
  <Button
    variant="sidebar"
    className="rounded-circle"
    ref={ref}
    onMouseDown={(e) => e.stopPropagation()}
    onClick={(e) => {
      e.stopPropagation();
      onClick(e);
    }}
    size="xsm"
  >
    <i className="fa fa-ellipsis-v" />
  </Button>
));

CollectionSubtreeFunctionsDropdownToggle.displayName = 'CollectionSubtreeFunctionsDropdownToggle';
CollectionSubtreeFunctionsDropdownToggle.propTypes = {
  onClick: PropTypes.func.isRequired,
};

const CollectionSubtreeFunctions = ({
  collection, sharedWithMe, hasRadar, onManageShares,
}) => {
  const [showImportModal, setShowImportModal] = useState(false);
  const [showLiteratureModal, setShowLiteratureModal] = useState(false);
  const [isLiteratureModalMounted, setIsLiteratureModalMounted] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showRadarModal, setShowRadarModal] = useState(false);

  if (collection === null || collection === undefined) return null;

  const collectionName = collection.label || 'Unknown Collection';
  // For own collections all actions are allowed; for shared-with-me the delegate's
  // permission_level gates each action.
  const hasPermission = (level) => (
    !sharedWithMe
    || (typeof collection.permission_level === 'number'
      && collection.permission_level >= level)
  );
  const canImportSamples = !collection.is_locked && hasPermission(PermissionConst.AddElements);
  const canAddShare = !collection.is_locked && hasPermission(PermissionConst.ManageShares);
  const canShowMetadataActions = !collection.is_locked && hasPermission(PermissionConst.ManageShares);

  const editMetadata = () => {
    Aviator.navigate(`/collection/${collection.id}/metadata`, { silent: true });
    elementShowOrNew({
      type: 'metadata',
      params: { collectionID: collection.id },
    });
  };

  const handleShowLiterature = (event) => {
    event.stopPropagation();
    setIsLiteratureModalMounted(true);
    setShowLiteratureModal(true);
  };

  const handleImportSamples = (event) => {
    event.stopPropagation();
    setShowImportModal(true);
  };

  const handleAddShare = (event) => {
    event.stopPropagation();
    setShowShareModal(true);
  };

  const handleManageShares = (event) => {
    event.stopPropagation();
    if (onManageShares) onManageShares();
  };

  const handleEditMetadata = (event) => {
    event.stopPropagation();
    editMetadata();
  };

  const handlePublishRadar = (event) => {
    event.stopPropagation();
    setShowRadarModal(true);
  };

  const hideImportModal = () => setShowImportModal(false);
  const hideLiteratureModal = () => setShowLiteratureModal(false);
  const hideShareModal = () => setShowShareModal(false);
  const hideRadarModal = () => setShowRadarModal(false);

  const stopRowNavigation = (event) => {
    event.stopPropagation();
  };

  return (
    <>
      <Dropdown
        id={`collection-subtree-functions-${collection.id}`}
        onClick={stopRowNavigation}
        onMouseDown={stopRowNavigation}
        className="collection-subtree-functions"
      >
        <Dropdown.Toggle as={CollectionSubtreeFunctionsDropdownToggle} />
        <Dropdown.Menu renderOnMount popperConfig={{ strategy: 'fixed' }}>
          <Dropdown.Item onClick={handleShowLiterature}>
            <i className="icon-report me-1" />
            Reference Report
          </Dropdown.Item>
          {canImportSamples && (
            <Dropdown.Item onClick={handleImportSamples}>
              <i className="icon-arrow-down-to-bracket me-1" />
              Import samples to collection
            </Dropdown.Item>
          )}
          {canAddShare && (
            <>
              <Dropdown.Divider />
              <Dropdown.Item onClick={handleAddShare}>
                <i className="fa fa-plus me-1" />
                <i className="fa fa-share-alt me-1" />
                Add share
              </Dropdown.Item>
              {onManageShares && (
                <Dropdown.Item onClick={handleManageShares}>
                  <i className="fa fa-users me-1" />
                  <i className="fa fa-share-alt me-1" />
                  Manage shares
                </Dropdown.Item>
              )}
            </>
          )}
          {canShowMetadataActions && (
            <>
              <Dropdown.Divider />
              <Dropdown.Item onClick={handleEditMetadata}>
                <i className="fa fa-file-text-o me-1" />
                Edit collection metadata
              </Dropdown.Item>
              <Dropdown.Item
                onClick={handlePublishRadar}
                disabled={!hasRadar}
                title={hasRadar ? 'Publish via RADAR' : 'RADAR is not configured'}
              >
                <i className="fa fa-cloud-upload me-1" />
                Publish via RADAR
              </Dropdown.Item>
            </>
          )}
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

      {showShareModal && (
        <SelectionShareModal
          title={`Share "${collectionName}"`}
          collectionId={collection.id}
          onHide={hideShareModal}
          collectionPermissions={DEFAULT_COLLECTION_SHARE_PERMISSIONS}
          showUserSelect
          shareType="create"
        />
      )}

      {showRadarModal && (
        <ModalExportRadarCollection
          collectionId={collection.id}
          onHide={hideRadarModal}
          editAction={editMetadata}
        />
      )}
    </>
  );
};

CollectionSubtreeFunctions.propTypes = {
  collection: PropTypes.object.isRequired,
  sharedWithMe: PropTypes.bool,
  hasRadar: PropTypes.bool,
  onManageShares: PropTypes.func,
};

CollectionSubtreeFunctions.defaultProps = {
  sharedWithMe: false,
  hasRadar: false,
  onManageShares: null,
};

export default CollectionSubtreeFunctions;
