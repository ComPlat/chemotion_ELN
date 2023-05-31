import uuid from 'uuid';
import { PermissionConst } from 'src/utilities/PermissionConst';

export default class Collection {
  constructor(args) {
    Object.assign(this, args);
    if (!this.id) {
      this.id = Collection.buildID();
    }
  }

  static buildID() {
    return uuid.v1();
  }

  // base serializer
  serialize() {
    return {
      id: this.id,
      label: this.label,
    };
  }

  allCollection() {
    return this.label == 'All' && this.is_locked;
  }

  sharedWithMe() {
    return this.user_id !== this.currentUser.id;
  }

  ownedByMe() {
    return this.user_id === this.currentUser?.id;
  }

  ownedByMeAndNotAll() {
    return this.ownedByMe() && !this.allCollection();
  }

  //TODO find proper name
  defCol() {
    return this.ownedByMe() && !this.allCollection() ? this.id : null;
  }

  get acl() {
    return this.collection_acls || [];
  }

  // check if the collection is shared with the current user
  // and permission level is at least write
  hasSharedWrite() {
    return !!this.acl.find((acl) => (
      acl.permission_level >= PermissionConst.Write
    ));
  }

  // can create elements in the collection
  canCreateElement() {
    return this.ownedByMeAndNotAll() || this.hasSharedWrite();
  }

}
