import { PermissionConst } from 'src/utilities/PermissionConst';

export default class SharingShortcuts {
  static user() {
    return {
      permissionLevel: PermissionConst.RemoveElements,
      sampleDetailLevel: 10,
      reactionDetailLevel: 10,
      wellplateDetailLevel: 10,
      screenDetailLevel: 10
    }
  }

  // A partner edits existing content. Adding new elements is a separate, higher rung.
  static partner() {
    return {
      permissionLevel: PermissionConst.EditElements,
      sampleDetailLevel: 10,
      reactionDetailLevel: 0,
      wellplateDetailLevel: 10,
      screenDetailLevel: 1
    }
  }

  static collaborator() {
    return {
      permissionLevel: PermissionConst.ReadElements,
      sampleDetailLevel: 1,
      reactionDetailLevel: 0,
      wellplateDetailLevel: 0,
      screenDetailLevel: 0
    }
  }

  static reviewer() {
    return {
      permissionLevel: PermissionConst.ReadElements,
      sampleDetailLevel: 2,
      reactionDetailLevel: 10,
      wellplateDetailLevel: 1,
      screenDetailLevel: 0
    }
  }

  // A supervisor administrates the collection's share list on the owner's behalf.
  static supervisor() {
    return {
      permissionLevel: PermissionConst.ManageShares,
      sampleDetailLevel: 10,
      reactionDetailLevel: 10,
      wellplateDetailLevel: 10,
      screenDetailLevel: 10
    }
  }
}
