import uuid from 'uuid';

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

  //TODO find proper name
  defCol() {
    return this.ownedByMe() && !this.allCollection() ? this.id : null;
  }
}
