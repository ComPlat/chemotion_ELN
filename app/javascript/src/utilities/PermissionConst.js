// Mirror of CollectionShare::PERMISSION_LEVELS (app/models/collection_share.rb), which is the
// source of truth. Cumulative: a share at level N grants every capability below it.
export const PermissionConst = {
  ReadElements: 0,
  EditElements: 1,
  AddElements: 2,
  RemoveElements: 3,
  ManageShares: 4,
  PassOwnership: 5
};
