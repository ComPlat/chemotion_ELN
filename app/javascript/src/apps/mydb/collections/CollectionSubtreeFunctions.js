import React, { useState } from 'react';
import PropTypes from 'prop-types';
import {
  Button, Dropdown
} from 'react-bootstrap';
import ModalImport from 'src/apps/mydb/collections/importSamples/ModalImport';
import LiteratureModal from 'src/apps/mydb/collections/LiteratureModal';
import ModalExportRadarCollection from 'src/apps/mydb/collections/ModalExportRadarCollection';
import { PermissionConst } from 'src/utilities/PermissionConst';
import { collectionShow, elementShowOrNew } from 'src/utilities/routesUtils';
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
  collection, sharedWithMe, hasRadar, onAddShare, onManageShares,
}) => {
  const [showImportModal, setShowImportModal] = useState(false);
  const [showLiteratureModal, setShowLiteratureModal] = useState(false);
  const [isLiteratureModalMounted, setIsLiteratureModalMounted] = useState(false);
  const [showRadarModal, setShowRadarModal] = useState(false);

  // The shared-with-me tree's owner rows are synthetic grouping nodes with id 0 and no
  // collection behind them (see CollectionSubtree.js's handleClick comment on the same
  // sentinel) — none of these actions apply, so the kebab itself should not render.
  if (collection === null || collection === undefined || !collection.id) return null;

  const collectionName = collection.label || 'Unknown Collection';
  // For own collections all actions are allowed; for shared-with-me the delegate's
  // permission_level gates each action.
  const hasPermission = (level) => (
    !sharedWithMe
    || (typeof collection.permission_level === 'number'
      && collection.permission_level >= level)
  );
  // Import samples: not locked and (for shared-with-me) the delegate can add elements.
  const hasAddElementsAccess = !collection.is_locked && hasPermission(PermissionConst.AddElements);
  const canAddShare = !collection.is_locked && hasPermission(PermissionConst.ManageShares);
  // Editing a collection's own metadata and publishing it via RADAR act on the collection
  // itself, not on its elements — no permission_level grants a sharee those, only ownership.
  const canManageCollection = !sharedWithMe && !collection.is_locked;

  const editMetadata = () => {
    Aviator.navigate(`/collection/${collection.id}/metadata`, { silent: true });
    // Make the target collection current so the sidebar/element list follow the
    // metadata tab and Metadata.buildEmpty seeds the title from this collection.
    collectionShow({ params: { collectionID: collection.id } });
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
    if (onAddShare) onAddShare();
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
        {/* renderOnMount + strategy: 'fixed' are load-bearing with the sidebar
            CSS in CollectionTree.scss (`.tree-view__container { overflow-x: hidden }`
            and the `.collection-subtree-functions { display: none }` hover rule).
            The menu is pre-mounted so Popper has a measurable target when the
            toggle is clicked; the container's overflow clip hides those pre-
            mounted menus until Popper repositions them. See the SCSS comment. */}
        <Dropdown.Menu renderOnMount popperConfig={{ strategy: 'fixed' }}>
          <Dropdown.Item onClick={handleShowLiterature}>
            <i className="icon-report me-1" />
            Reference Report
          </Dropdown.Item>
          {hasAddElementsAccess && (
            <Dropdown.Item onClick={handleImportSamples}>
              <i className="icon-arrow-down-to-bracket me-1" />
              Import samples to collection
            </Dropdown.Item>
          )}
          {canAddShare && (onAddShare || onManageShares) && (
            <>
              <Dropdown.Divider />
              {onAddShare && (
                <Dropdown.Item onClick={handleAddShare}>
                  <i className="fa fa-plus me-1" />
                  <i className="fa fa-share-alt me-1" />
                  Add share
                </Dropdown.Item>
              )}
              {onManageShares && (
                <Dropdown.Item onClick={handleManageShares}>
                  <i className="fa fa-users me-1" />
                  <i className="fa fa-share-alt me-1" />
                  Manage shares
                </Dropdown.Item>
              )}
            </>
          )}
          {canManageCollection && (
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
  onAddShare: PropTypes.func,
  onManageShares: PropTypes.func,
};

CollectionSubtreeFunctions.defaultProps = {
  sharedWithMe: false,
  hasRadar: false,
  onAddShare: null,
  onManageShares: null,
};

export default CollectionSubtreeFunctions;
