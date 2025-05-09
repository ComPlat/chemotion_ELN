import React, { useState, useRef } from 'react';
import PropTypes from 'prop-types';
import {
  Button, ButtonGroup, Overlay, Popover
} from 'react-bootstrap';

import UserInfoIcon from 'src/apps/mydb/collections/UserInfoIcon';
import PermissionIcons from 'src/apps/mydb/collections/PermissionIcons';

export default function SyncedCollectionsUsersButton({
  node, syncUsers, updateSync, deleteSync
}) {
  const [showPopover, setShowPopover] = useState(false);
  const buttonRef = useRef(null);

  return (
    <>
      <Button
        id={`sync-users-button_${node.id}`}
        ref={buttonRef}
        className="d-flex align-items-center gap-1"
        onClick={() => setShowPopover(!showPopover)}
        size="sm"
        variant="warning"
        disabled={node.isNew === true}
      >
        <i className="fa fa-users" />
        <i className="fa fa-share-alt" />
        {`(${syncUsers.length})`}
      </Button>
      <Overlay
        show={showPopover}
        target={buttonRef.current}
        placement="top"
        rootClose
        onHide={() => setShowPopover(false)}
      >
        <Popover id={`sync-users-popover-${node.id}`}>
          <Popover.Body className="d-flex flex-column gap-2">
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
                    onClick={() => {
                      setShowPopover(false);
                      updateSync(syncCollectionUser);
                    }}
                  >
                    <i className="fa fa-share-alt me-1" />
                    edit
                  </Button>
                  <Button
                    size="sm"
                    variant="danger"
                    onClick={() => {
                      setShowPopover(false);
                      deleteSync(syncCollectionUser);
                    }}
                  >
                    <i className="fa fa-share-alt me-1" />
                    <i className="fa fa-trash-o" />
                  </Button>
                </ButtonGroup>
              </div>
            ))}
          </Popover.Body>
        </Popover>
      </Overlay>
    </>
  );
}

SyncedCollectionsUsersButton.propTypes = {
  node: PropTypes.shape({
    id: PropTypes.number.isRequired,
    label: PropTypes.string.isRequired,
    isNew: PropTypes.bool,
  }).isRequired,
  syncUsers: PropTypes.arrayOf(PropTypes.shape({
    id: PropTypes.number.isRequired,
    name: PropTypes.string.isRequired,
    type: PropTypes.string.isRequired,
    permission_level: PropTypes.number.isRequired,
  })).isRequired,
  updateSync: PropTypes.func.isRequired,
  deleteSync: PropTypes.func.isRequired,
};
