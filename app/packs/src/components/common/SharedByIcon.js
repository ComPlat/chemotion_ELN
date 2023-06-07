import React from 'react';
import {
  OverlayTrigger
} from 'react-bootstrap';
import UserInfos from '../../apps/mydb/collections/UserInfos';
import UserStore from '../../stores/alt/stores/UserStore';

const SharedByIcon = ({ collection }) => {
  let collectionAcls = collection?.collection_acls;
  const currentUser = (UserStore.getState() && UserStore.getState().currentUser) || {};
  if (collectionAcls === undefined) return;

  let sharedUsers = [];
  if (currentUser.id === collection.user_id) {
    collectionAcls.forEach(c => sharedUsers.push(c.user))
  } else {
    sharedUsers.push(collection.user);
  }

  return (
    sharedUsers && sharedUsers.length > 0
      ? <OverlayTrigger placement="bottom" overlay={UserInfos({ users: sharedUsers})}>
        <i className="fa fa-share-alt" style={{ float: "right", marginTop: '2px' }}></i>
      </OverlayTrigger>
      : null
  )
};

export default SharedByIcon;
