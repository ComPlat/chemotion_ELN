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
    if (!this.first) {
      // used to add a separator css class
      this.first = false;
    }
    this.depth = 0;
    if (this.ancestry) {
      // used for indentation when displaying a collection tree
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
  hasPermissionLevel(permissionLevel) {
    return !!this.acl.find((acl) => (
      acl.permission_level >= permissionLevel
    ));
  }

  hasAclWrite() {
    return this.hasPermissionLevel(PermissionConst.Write);
  }

  hasAclExport() {
    return this.hasPermissionLevel(PermissionConst.Export);
  }

  hasAclPassOwnerShip() {
    return this.hasPermissionLevel(PermissionConst.PassOwnerShip);
  }

  // can create elements in the collection
  canCreateElement() {
    return this.ownedByMeAndNotAll() || this.hasAclWrite();
  }

  canExport() {
    return this.ownedByMe() || this.hasAclWrite();
  }

  canTakeOwnership() {
    return this.sharedWithMe() && this.hasAclPassOwnerShip();
  }
}
