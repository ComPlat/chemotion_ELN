import React, { forwardRef, useEffect, useContext } from 'react';
import PropTypes from 'prop-types';
import { Tooltip } from 'react-bootstrap';
import UserInfoIcon from 'src/apps/mydb/collections/UserInfoIcon';
import PermissionIcons from 'src/apps/mydb/collections/PermissionIcons';
import { observer } from 'mobx-react';
import { StoreContext } from 'src/stores/mobx/RootStore';

// Provenance popover for a shared-to-me collection: who it reaches the current user through — their
// own direct share and/or each of their groups' shares — and the permission level of each. The
// contributing shares are lazily fetched (GET /collection_shares/for_me) the first time it opens.
const SharedToMeInfosTooltip = forwardRef(({ collectionId, owner = null, ...tooltipProps }, ref) => {
  const collectionsStore = useContext(StoreContext).collections;
  const myShares = collectionsStore.mySharesFor(collectionId);
  const shares = myShares !== undefined ? myShares.shared_with_users : [];

  useEffect(() => {
    if (myShares === undefined) {
      collectionsStore.getMySharesFor(collectionId);
    }
  }, [collectionId]);

  return (
    <Tooltip ref={ref} id="tooltip" {...tooltipProps}>
      {owner && <div className="fw-bold mb-1">{owner}</div>}
      {shares.map((share) => (
        <div key={share.id} className="d-flex align-items-baseline gap-1">
          <UserInfoIcon type={share.shared_with_type} />
          {share.shared_with_type === 'Group' ? share.shared_with : 'You'}
          <PermissionIcons pl={share.permission_level} />
        </div>
      ))}
    </Tooltip>
  );
});

SharedToMeInfosTooltip.displayName = 'SharedToMeInfosTooltip';

SharedToMeInfosTooltip.propTypes = {
  collectionId: PropTypes.number.isRequired,
  owner: PropTypes.string,
};

export default observer(SharedToMeInfosTooltip);
