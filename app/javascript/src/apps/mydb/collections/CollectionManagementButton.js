import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { Button, Tooltip, OverlayTrigger } from 'react-bootstrap';

import CollectionManagementModal from 'src/apps/mydb/collections/CollectionManagementModal';

export default function CollectionManagementButton({ isCollapsed }) {
  const [showModal, setShowModal] = useState(false);
  const label = 'Manage Collections';

  return (
    <>
      <CollectionManagementModal
        show={showModal}
        onHide={() => setShowModal(false)}
      />
      {isCollapsed ? (
        <OverlayTrigger
          placement="right"
          overlay={<Tooltip>{label}</Tooltip>}
        >
          <Button
            className="collection-management-button w-100 text-body-secondary"
            variant="sidebar"
            onClick={() => setShowModal(true)}
          >
            <i className="fa fa-cog mx-auto" />
          </Button>
        </OverlayTrigger>
      ) : (
        <Button
          className="collection-management-button w-100 text-body-secondary text-start"
          variant="sidebar"
          onClick={() => setShowModal(true)}
        >
          <i className="fa fa-cog me-2" />
          <span>{label}</span>
        </Button>
      )}
    </>
  );
}

CollectionManagementButton.propTypes = {
  isCollapsed: PropTypes.bool,
};

CollectionManagementButton.defaultProps = {
  isCollapsed: true,
};
