const assert = require('assert');

describe('Ketcher2', () => {
  let FILOStack;
  let uniqueEvents;
  let latestData;
  let imagesList;
  let mols;
  let allNodes;
  let all_atoms;
  let image_used_counter;
  let re_render_canvas;
  let _selection;
  let deleted_atoms_list;

  beforeEach(() => {
    FILOStack = [];
    uniqueEvents = new Set();
    latestData = null;
    imagesList = [];
    mols = [];
    allNodes = [];
    all_atoms = [];
    image_used_counter = -1;
    re_render_canvas = false;
    _selection = null;
    deleted_atoms_list = [];
  });

  describe('on Add Atom', () => {
    it(' selected item is', () => {
      assert.deepEqual(deleted_atoms_list, []);
    });
  });

  // describe('on Move Atom', () => {
  //   it('selected item is Move', () => {
  //     expect(currentSelectedValue).toBe('');
  //   });
  // });
});
