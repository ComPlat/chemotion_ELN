import React from 'react';
import PropTypes from 'prop-types';
import { Button, ButtonGroup, Modal } from 'react-bootstrap';

import UserInfoIcon from 'src/apps/mydb/collections/UserInfoIcon';
import PermissionIcons from 'src/apps/mydb/collections/PermissionIcons';

export default function SyncedCollectionsUsersModal({
  node,
  updateSync,
  deleteSync,
  onHide
}) {
  const syncUsers = node.sync_collections_users ?? [];

  return (
    <Modal
      show
      centered
      scrollable
      onHide={onHide}
    >
      <Modal.Header closeButton>
        <Modal.Title>
          {node.label}
        </Modal.Title>
      </Modal.Header>
      <Modal.Body className="d-flex flex-column gap-2">
        {syncUsers.map((syncCollectionUser) => (
          <div
            key={syncCollectionUser.id}
            className="d-flex gap-3 justify-content-between align-items-center"
          >
            <span className="d-flex gap-2 align-items-baseline">
              <UserInfoIcon type={syncCollectionUser.type} />
              {syncCollectionUser.name}
              <PermissionIcons pl={syncCollectionUser.permission_level} />
            </span>
            <ButtonGroup>
              <Button
                size="sm"
                variant="primary"
                onClick={() => updateSync(syncCollectionUser)}
              >
                <i className="fa fa-share-alt me-1" />
                edit
              </Button>
              <Button
                size="sm"
                variant="danger"
                onClick={() => deleteSync(syncCollectionUser)}
              >
                <i className="fa fa-share-alt me-1" />
                <i className="fa fa-trash-o" />
              </Button>
            </ButtonGroup>
          </div>
        ))}
      </Modal.Body>
    </Modal>
  );
}

SyncedCollectionsUsersModal.propTypes = {
  node: PropTypes.shape({
    id: PropTypes.number.isRequired,
    label: PropTypes.string.isRequired,
    isNew: PropTypes.bool,
    sync_collections_users: PropTypes.arrayOf(PropTypes.shape({
      id: PropTypes.number.isRequired,
      name: PropTypes.string.isRequired,
      type: PropTypes.string.isRequired,
      permission_level: PropTypes.number.isRequired,
    })).isRequired,
  }).isRequired,
  updateSync: PropTypes.func.isRequired,
  deleteSync: PropTypes.func.isRequired,
  onHide: PropTypes.func.isRequired,
};
