export const PermissionConst = {
  Read: 0,
  Export: 0, // alias for Read, if you can read you can export
  Write: 1, // edit existing element, create element, assign element, remove element
  // Import: 1, // alias for Write, if you can write you can import
  Share: 2, // ?
  Delete: 3, // delete collection
  ImportElements: 4,
  PassOwnerShip: 5
};
