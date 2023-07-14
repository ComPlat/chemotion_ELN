import React from 'react';
import {
  OverlayTrigger
} from 'react-bootstrap';
import UserInfos from 'src/apps/mydb/collections/UserInfos';

const SharedByIcon = ({ collection }) => {
  let collectionAcls = collection?.acl;
  if (collectionAcls === undefined) return;

  let sharedUsers = [];
  if (collection.ownedByMe()) {
    collectionAcls.forEach(c => sharedUsers.push(c.user))
  } else {
    sharedUsers.push(collection.user);
  }

  if (sharedUsers && sharedUsers.length > 0)
    return (
      <OverlayTrigger placement="bottom" overlay={UserInfos({ users: sharedUsers})}>
        <i className="fa fa-share-alt" style={{ float: "right", marginTop: '2px' }}></i>
      </OverlayTrigger>
    );

  return null;
};

export default SharedByIcon;
