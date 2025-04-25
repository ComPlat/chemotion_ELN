import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { Button } from 'react-bootstrap';

import CollectionManagementModal from 'src/apps/mydb/collections/CollectionManagementModal';

export default function CollectionManagementButton({ isCollapsed }) {
  const [showModal, setShowModal] = useState(false);

  return (
    <>
      <CollectionManagementModal
        show={showModal}
        onHide={() => setShowModal(false)}
      />
      <Button
        className={`collection-management-button w-100 text-body-secondary${isCollapsed ? '' : ' text-start'}`}
        variant="tertiary"
        onClick={() => setShowModal(true)}
      >
        <i className={`fa fa-cog ${isCollapsed ? 'mx-auto' : 'ms-1 me-2'}`} />
        {!isCollapsed && (
          <span>Manage Collections</span>
        )}
      </Button>
    </>
  );
}

CollectionManagementButton.propTypes = {
  isCollapsed: PropTypes.bool,
};

CollectionManagementButton.defaultProps = {
  isCollapsed: true,
};
