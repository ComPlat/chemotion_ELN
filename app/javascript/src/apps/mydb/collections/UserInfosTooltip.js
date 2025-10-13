import React, { forwardRef, useEffect, useContext } from 'react';
import PropTypes from 'prop-types';
import { Tooltip } from 'react-bootstrap';
import UserInfoIcon from 'src/apps/mydb/collections/UserInfoIcon';
import { observer } from 'mobx-react';
import { StoreContext } from 'src/stores/mobx/RootStore';

const UserInfosTooltip = forwardRef(({ collectionId, ...tooltipProps }, ref) => {
  const collectionsStore = useContext(StoreContext).collections;
  const sharedWithUsers = collectionsStore.sharedWithUsers(collectionId);
  const users = sharedWithUsers !== undefined ? sharedWithUsers.shared_with_users : [];

  useEffect(() => {
    if (sharedWithUsers === undefined) {
      collectionsStore.getSharedWithUsers(collectionId);
    }
  }, [collectionId]);

  return (
    <Tooltip ref={ref} id="tooltip" {...tooltipProps}>
      {users.map((user) => (
        <div key={user.id} className="d-flex align-items-baseline gap-1">
          <UserInfoIcon type={user.shared_with_type} />
          {user.shared_with}
        </div>
      ))}
    </Tooltip>
  )
}
);

UserInfosTooltip.propTypes = {
  collectionId: PropTypes.number.isRequired,
};

export default observer(UserInfosTooltip);
