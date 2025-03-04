import React, { useState } from 'react';
import Aviator from 'aviator';
import PropTypes from 'prop-types';

import UIActions from 'src/stores/alt/actions/UIActions';
import UIStore from 'src/stores/alt/stores/UIStore';
import { Button } from 'react-bootstrap';

export default function CollectionManagementButton({ isCollapsed }) {
  const [active, setActive] = useState(UIStore.getState().showCollectionManagement);

  const openCollectionManagement = () => {
    const { showCollectionManagement } = UIStore.getState();
    if (!showCollectionManagement) {
      UIActions.toggleCollectionManagement();
      Aviator.navigate('/collection/management');
      setActive(true);
    }
  };

  return (
    <Button
      className={`collection-management-button w-100${isCollapsed ? '' : ' text-end'}`}
      variant="secondary"
      onClick={openCollectionManagement}
    >
      {!isCollapsed && (
        <span>Manage Collections</span>
      )}
      <i className={`fa fa-cog ${isCollapsed ? 'mx-auto' : 'ms-2'}${active ? ' text-primary' : ''}`} />
    </Button>
  );
}

CollectionManagementButton.propTypes = {
  isCollapsed: PropTypes.bool,
};

CollectionManagementButton.defaultProps = {
  isCollapsed: true,
};
