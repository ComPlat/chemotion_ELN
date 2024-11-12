import assert from 'assert';

import { all_atoms, allNodes, fuelKetcherData, imagesList, mols, resetStore } from '../../../../../app/packs/src/components/structureEditor/KetcherEditor';

import { empty_mol_file, mock_ketcher_mols, mock_ketcher_mols_images_nodes, molfile_with_polymer_list, molfile_without_polymer_list } from '../../../data/ketcher2_mockups';
import { hasKetcherData } from '../../../../../app/packs/src/utilities/Ketcher2SurfaceChemistryUtils';
import { split } from 'lodash';

describe('Ketcher2', () => {

  beforeEach(() => {
    resetStore();
  });

  describe('Fuel Ketcher/molfile data', () => {
    it('should load molfile with images, mols, atoms and nodes', async () => {
      await fuelKetcherData(mock_ketcher_mols_images_nodes);
      assert.ok(all_atoms.length > 0, 'all_atoms should have some length');
      assert.ok(allNodes.length > 0, 'allNodes should have some length');
      assert.ok(imagesList.length > 0, 'imagesList should have some length');
      assert.ok(mols.length > 0, 'mols should have some length');
    });

    it('should load molfile with mols, atoms and nodes', async () => {
      await fuelKetcherData(mock_ketcher_mols);

      assert.ok(all_atoms.length > 0, 'all_atoms should have some length');
      assert.ok(allNodes.length > 0, 'allNodes should have some length');
      assert.ok(imagesList.length == 0, 'imagesList should not have length');
      assert.ok(mols.length > 0, 'mols should have some length');
    });

    it('should be empty', async () => {
      await fuelKetcherData(empty_mol_file);
      assert.ok(all_atoms.length == 0, 'all_atoms should not have some length');
      assert.ok(allNodes.length == 0, 'allNodes should not have some length');
      assert.ok(imagesList.length == 0, 'imagesList should not have length');
      assert.ok(mols.length == 0, 'mols should not have some length');
    });

    it('should restore all containers', async () => {
      resetStore();
      assert.ok(all_atoms.length == 0, 'all_atoms should not have some length');
      assert.ok(allNodes.length == 0, 'allNodes should not have some length');
      assert.ok(imagesList.length == 0, 'imagesList should not have length');
      assert.ok(mols.length == 0, 'mols should not have some length');
    });
  });

  describe('On reading molfile with polymers list', () => {
    it('should have a polymer list', () => {
      hasKetcherData(molfile_with_polymer_list, ({ struct, rails_polymers_list }) => {
        const list_to_array = rails_polymers_list.split(" ");
        assert.notStrictEqual(struct, null, "Expected struct to not be null.");
        assert.ok(list_to_array.length == 2, 'list of polymers should have length of 2');
      });
    });

    it('should not have a polymer list', async () => {
      const rails_polymers_list = await hasKetcherData(molfile_without_polymer_list);
      assert.strictEqual(rails_polymers_list, null, 'list of polymers should be null');
    });

    it('should not have a polymer list & no struct', async () => {
      const rails_polymers_list = await hasKetcherData(molfile_without_polymer_list);
      assert.strictEqual(rails_polymers_list, null, 'list of polymers should be null');
    });
  });

  // describe('on Move Atom', () => {
  //   it('selected item is Move', () => {
  //     expect(currentSelectedValue).toBe('');
  //   });
  // });
});




// loadEditor("ketcher2", "/editors/ketcher2/index.html");
// const editor = new StructureEditor({
//   ...EditorAttrs["ketcher2"],
//   "label": "ketcher2",
//   "extSrc": "/editors/ketcher2/index.html",
//   "editor": "ketcher2",
//   "id": "ketcher2"
// });

// const chec = shallow(
//   <iframe
//     id={editor?.id}
//     src={editor?.extSrc}
//     title={editor?.label}
//     height={"600px"}
//     width="100%"
//     style={{}}
//   />
// );
// console.log("----", chec);
// console.log(editor.structureDef, "???");

// console.log(editor.structureDef.editor.setMolecule(), "??");
// console.log(editor.structureDef);

// await editor.structureDef.editor.setMolecule(JSON.stringify(
// await fuelKetcherData(editor);
// console.log(latestData);