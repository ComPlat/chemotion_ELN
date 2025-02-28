import expect from 'expect';

import {
  DragDropItemTypes,
  targetContainerDataField
} from '@src/utilities/DndConst';

const fakeMonitor = (dataType) => ({ getItemType: () => (DragDropItemTypes[dataType]) });

describe('dataTarget.canDrop', () => {
  const { dataTarget } = targetContainerDataField;
  it('should return true when the target is DATA', () => {
    expect(dataTarget.canDrop(null, fakeMonitor('DATA'))).toBe(true);
  });
  it('should return true when the target is UNLINKED_DATA', () => {
    expect(dataTarget.canDrop(null, fakeMonitor('UNLINKED_DATA'))).toBe(true);
  });
  it('should return true when the target is DATASET', () => {
    expect(dataTarget.canDrop(null, fakeMonitor('DATASET'))).toBe(true);
  });
  it('should return false when the target is not DATA, UNLINKED_DATA, or DATASET', () => {
    expect(dataTarget.canDrop(null, fakeMonitor('OTHER'))).toBe(false);
  });
});
