import React, { useState, useEffect, useContext } from 'react';
import PropTypes from 'prop-types';
import { Button, ButtonGroup, Modal } from 'react-bootstrap';

import UserInfoIcon from 'src/apps/mydb/collections/UserInfoIcon';
import PermissionIcons from 'src/apps/mydb/collections/PermissionIcons';
import { observer } from 'mobx-react';
import { StoreContext } from 'src/stores/mobx/RootStore';

const CollectionSharesEditModal = ({ node, updateNode, deleteNode, onHide }) => {
  const collectionsStore = useContext(StoreContext).collections;
  const sharedWithUsers = collectionsStore.sharedWithUsers(node.id);
  const users = sharedWithUsers !== undefined ? sharedWithUsers.shared_with_users : [];

  useEffect(() => {
    if (sharedWithUsers === undefined) {
      collectionsStore.getSharedWithUsers(node.id);
    }
  }, [node.id]);

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
        {users.map((user) => (
          <div
            key={user.id}
            className="d-flex gap-3 justify-content-between align-items-center"
          >
            <span className="d-flex gap-2 align-items-baseline">
              <UserInfoIcon type={user.shared_with_type} />
              {user.shared_with}
              <PermissionIcons pl={user.permission_level} />
            </span>
            <ButtonGroup>
              <Button
                size="sm"
                variant="primary"
                onClick={() => updateNode(node, user)}
              >
                <i className="fa fa-share-alt me-1" />
                edit
              </Button>
              <Button
                size="sm"
                variant="danger"
                onClick={() => deleteNode(node, user)}
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

export default observer(CollectionSharesEditModal);

CollectionSharesEditModal.propTypes = {
  node: PropTypes.shape({
    id: PropTypes.number.isRequired,
    label: PropTypes.string.isRequired,
  }).isRequired,
  updateNode: PropTypes.func.isRequired,
  deleteNode: PropTypes.func.isRequired,
  onHide: PropTypes.func.isRequired,
};
