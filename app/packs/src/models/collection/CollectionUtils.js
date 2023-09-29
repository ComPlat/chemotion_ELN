
export default class CollectionUtils {
    static isReadOnly(currentCollection,userId,isSync) {

        let isShared=currentCollection.is_shared &&
            currentCollection.shared_by_id!=userId;
        return currentCollection.permission_level === 0 && (isSync || isShared);
    }
}