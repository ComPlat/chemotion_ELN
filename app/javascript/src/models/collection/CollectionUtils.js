function isReadOnly(collection, userId, isSync) {
  if (collection.permission_level > 0) { return false; }

  const isShared = collection.is_shared
          && collection.shared_by_id !== userId;

  const isSynced = isSync
          && collection.shared_by_id !== userId;

  return isSynced || isShared;
}

function isWritable(collection) {
  return collection.permission_level >= 1;
}

export default {
  isReadOnly,
  isWritable,
};
