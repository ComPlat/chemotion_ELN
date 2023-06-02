import uuid from 'uuid';
import { PermissionConst } from 'src/utilities/PermissionConst';

export default class Collection {
  constructor(args) {
    Object.assign(this, args);
    if (!this.id) {
      this.id = Collection.buildID();
    }
    if (!this.children) {
      this.children = [];
    }
    this.depth = 0;
    if (this.ancestry) {
      this.depth = this.ancestry.split('/').length;
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
    return this.label === 'All' && this.is_locked;
  }

  sharedWithMe() {
    // we do not check on acls but assume that if the collection is present,
    // it is either shared or owned by the current user
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
  hasAclWrite() {
    return !!this.acl.find((acl) => (
      acl.permission_level >= PermissionConst.Write
    ));
  }

  hasAclExport() {
    return !!this.acl.find((acl) => (
      acl.permission_level >= PermissionConst.Export
    ));
  }

  // can create elements in the collection
  canCreateElement() {
    return this.ownedByMeAndNotAll() || this.hasAclWrite();
  }
  canExport() {
    return this.ownedByMe() || this.hasAclWrite();
  }
}
