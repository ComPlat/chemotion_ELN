import React from 'react';
import UserStore from '../../../stores/alt/stores/UserStore';

const filterSharedWithMeCollection = (sharedCollections) => {
  const { currentUser } = UserStore.getState();
  const collections = [];

  sharedCollections?.forEach((collection) => {
    let children = [];
    let label = `by ${collection.shared_by?.initials}`;
    let user = {};
    let uid = -1;
    let permission_level = -1;
    let sharedCollections = collection?.collection_acls?.filter(acl => (acl.user_id === currentUser.id ));
    sharedCollections?.forEach((acl) => {
      children.push(acl);
      user = acl.user;
      uid = acl.id;
      permission_level = acl.permission_level;
    })

    const sameSharedTo = collections.find(c => (c.label == label));
    if (sameSharedTo) {
      children.forEach(c => sameSharedTo.children.push(c))
    } else {
      let sharedCollection = {}
      sharedCollection.uid = uid;
      sharedCollection.label = label;
      sharedCollection.shared_to = user;
      sharedCollection.shared_by = collection.shared_by;
      sharedCollection.children = children;
      collections.push(sharedCollection);
    }
  });
  return collections;
}

const filterMySharedCollection = (myCollections) => {
  myCollections = myCollections.filter(c => ((c.collection_acls && c.collection_acls.length > 0) && c.is_locked === false));
  let collections = [];

  myCollections.forEach((collection) => {
    collection.collection_acls.forEach((acl) => {
      let children = [];
      children.push(acl);
      let label = `with ${acl.user.initials}`;
      let user = acl.user;
      let uid = acl.id;

      const sameSharedTo = collections.find(c => (c.label == label));
      if (sameSharedTo) {
        children.forEach(c => sameSharedTo.children.push(c))
      } else {
        let sharedCollection = {}
        sharedCollection.id = collection.id;
        sharedCollection.uid = uid;
        sharedCollection.label = label;
        sharedCollection.shared_to = user;
        sharedCollection.children = children;
        collections.push(sharedCollection);
      }
    })
  });

  return collections;
}

export { filterMySharedCollection, filterSharedWithMeCollection };
