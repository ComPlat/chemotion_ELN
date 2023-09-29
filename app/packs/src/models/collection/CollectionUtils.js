export default class CollectionUtils {
  static isReadOnly(currentCollection, userId, isSync) {
    if (currentCollection.permission_level > 0) { return false; }

    const isShared = currentCollection.is_shared
            && currentCollection.shared_by_id !== userId;

    const isSynced = isSync
            && currentCollection.shared_by_id !== userId;

    return isSynced || isShared;
  }
}
