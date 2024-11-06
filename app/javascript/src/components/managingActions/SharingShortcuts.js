export default class SharingShortcuts {
  static user() {
    return {
      permissionLevel: 3,
      sampleDetailLevel: 10,
      reactionDetailLevel: 10,
      wellplateDetailLevel: 10,
      screenDetailLevel: 10
    }
  }

  static partner() {
    return {
      permissionLevel: 1,
      sampleDetailLevel: 10,
      reactionDetailLevel: 0,
      wellplateDetailLevel: 10,
      screenDetailLevel: 1
    }
  }

  static collaborator() {
    return {
      permissionLevel: 0,
      sampleDetailLevel: 1,
      reactionDetailLevel: 0,
      wellplateDetailLevel: 0,
      screenDetailLevel: 0
    }
  }

  static reviewer() {
    return {
      permissionLevel: 0,
      sampleDetailLevel: 2,
      reactionDetailLevel: 10,
      wellplateDetailLevel: 1,
      screenDetailLevel: 0
    }
  }

  static supervisor() {
    return {
      permissionLevel: 4,
      sampleDetailLevel: 10,
      reactionDetailLevel: 10,
      wellplateDetailLevel: 10,
      screenDetailLevel: 10
    }
  }
}
