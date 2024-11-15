import assert from 'assert';
import expect from 'expect';

import { _selection, _selectionSetter, all_atoms, allNodes, deleted_atoms_list, FILOStack, fuelKetcherData, handleAddAtom, handleOnDeleteImage, image_used_counter, imagesList, imageUsedCounterSetter, isAliasConsistent, latestData, latestdataSetter, mols, moveTemplate, placeImageOnAtoms, re_render_canvas, resetStore, setKetcherData, uniqueEvents } from '../../../../../app/packs/src/components/structureEditor/KetcherEditor';

import { areAllAliasesConsistent_ket, empty_mol_file, hasConsistentAliases_ket, hasValidMolsAndImages, imageCountAdjuster_ket, isImageSelectionValid_ket, isMoleculeEmpty_ket, mock_ketcher_mols, mock_ketcher_mols_images_nodes, molfile_with_polymer_list, molfile_without_polymer_list, one_image_ketfile_rg, one_image_molfile, onMultiImageDelete_ket, wiht2Aliases_ket } from '../../../data/ketcher2_mockups';
import { hasKetcherData, template_list_data, three_parts_patten } from '../../../../../app/packs/src/utilities/Ketcher2SurfaceChemistryUtils';

describe('Ketcher2', () => {

  beforeEach(() => {
    resetStore();
  });

  describe('assign latest data', () => {
    it('should be valid', async () => {
      latestdataSetter(one_image_ketfile_rg);
      assert.notStrictEqual(latestData, null, "latestData should be null");
    });
  });

  describe('on restore', () => {
    it('should clear all containers/vard', async () => {
      resetStore();
      assert.deepEqual(FILOStack, [], "FILOStack should be empty");
      assert.strictEqual(uniqueEvents.length, undefined, "uniqueEvents should be an empty array");
      assert.strictEqual(latestData, null, "latestData should be null");
      assert.deepEqual(imagesList, [], "imagesList should be an empty array");
      assert.deepEqual(mols, [], "mols should be an empty array");
      assert.deepEqual(allNodes, [], "allNodes should be an empty array");
      assert.strictEqual(image_used_counter, -1, "image_used_counter should be -1");
      assert.strictEqual(re_render_canvas, false, "re_render_canvas should be false");
      assert.deepEqual(deleted_atoms_list, [], "deleted_atoms_list should be an empty array");
      assert.deepEqual(all_atoms, [], "all_atoms should be an empty array");
    });
  });

  describe('on Fuel Ketcher/molfile data', () => {
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

  describe('On reading molfile with/without polymers list', () => {
    it('should have rails polymer list', async () => {
      const rails_polymers_list = await hasKetcherData(molfile_with_polymer_list);
      const list_to_array = rails_polymers_list.split(" ");
      assert.ok(list_to_array.length == 2, 'list of polymers should have length of 2');
    });

    it('should have a polymer list', async () => {
      const p_list = "0";
      const rails_polymers_list = await hasKetcherData(one_image_molfile);
      const { collected_images, molfileData } = await setKetcherData(p_list, one_image_ketfile_rg);
      assert.notStrictEqual(molfileData, null, 'list of polymers can not be null');
      assert.ok(collected_images.length > 0, 'collected images should have a length');
      assert.ok(rails_polymers_list.length > 0, 'polymer list should be valid');
      assert.ok(image_used_counter == 0, 'imagelist should have length of 1');

    });

    it('should not have a polymer list', async () => {
      const p_list = null;
      const rails_polymers_list = await hasKetcherData(molfile_without_polymer_list);
      const { collected_images, molfileData } = await setKetcherData(p_list);
      assert.strictEqual(rails_polymers_list, null, 'list of polymers should be null');
      assert.ok(collected_images.length == 0, 'Collected images should be empty');
      assert.notStrictEqual(molfileData, null, 'list of polymers can not be null');
      assert.ok(image_used_counter == -1, 'imagelist should have length of -1');

    });
  });

  describe('on Move template', () => {
    it('molecules should have with proper alias', async () => {
      latestdataSetter(mock_ketcher_mols_images_nodes);
      fuelKetcherData(mock_ketcher_mols_images_nodes);
      await moveTemplate();
      assert.ok(latestData.root.nodes.length == 1, "nodes length should be equal to 1 only mol0");
      // assert.deepStrictEqual(mock_ketcher_mols_images_nodes, latestData, 'latest data should not be null');
    });

    it('when data is empty', async () => {
      latestdataSetter(empty_mol_file);
      fuelKetcherData(empty_mol_file);
      await moveTemplate();
      assert.notStrictEqual(latestData.root.node, null, "mols length should be node/root cannot be null");
      assert.ok(latestData.root.nodes.length == 0, "mols length should be 0");
      assert.ok(image_used_counter == -1, "Image user counter should be -1");
    });

    it('when alias format is not correct', async () => {
      latestdataSetter(mock_ketcher_mols_images_nodes);
      fuelKetcherData(mock_ketcher_mols_images_nodes);
      await moveTemplate();

      assert.notStrictEqual(latestData.root.node, null, "nodes/root cannot be null");
      assert.ok(imagesList.length == 0, "should have not images");
      await Promise.all(mols.map(async (mol) => {
        const molecule = latestData[mol];
        molecule?.atoms?.forEach((item) => {
          if (item.alias) {
            assert.ok(three_parts_patten.test(item.alias) === true, "Image user counter should be -1");
          }
        });
      }));
    });


    it('when image doesnt have bounding box or image is out of max index', async () => {
      latestdataSetter(mock_ketcher_mols_images_nodes);
      fuelKetcherData(mock_ketcher_mols_images_nodes);
      await moveTemplate();

      assert.notStrictEqual(latestData.root.node, null, "nodes/root cannot be null");
      assert.ok(imagesList.length == 0, "should have not images");

      await Promise.all(mols.map(async (mol) => {
        const molecule = latestData[mol];
        molecule?.atoms?.forEach((item) => {
          if (item.alias) {
            const splits_alias = item.alias.split("_");
            const template = template_list_data[parseInt(splits_alias[1])].boundingBox;
            assert.notStrictEqual(template, null, "template cannot be null based on alias 2nd part as template id");
          }
        });
      }));
    });
  });

  describe('on place images on atom', () => {
    it('should have empty mols and image list', async () => {
      latestdataSetter(empty_mol_file);
      fuelKetcherData(empty_mol_file);
      await moveTemplate();
      assert.ok(mols.length == 0, "mols should be []");
      assert.ok(imagesList.length == 0, "imagesList should be []");
      assert.ok(latestData.root.nodes.length == 0, "nodes should not length");
    });

    it('should have valid mols and image list', async () => {
      latestdataSetter({
        "root": {
          "nodes": [
            {
              "$ref": "mol0"
            },
            {
              "type": "image",
              "format": "image/svg+xml",
              "boundingBox": {
                "x": 17.635600042657444,
                "y": -5.4582998402121765,
                "z": 0,
                "width": 1.0250000000000006,
                "height": 1.0250000000000006
              },
              "data": "PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAxMDAgMTAwIj4NCiAgPGRlZnM+DQogICAgPHJhZGlhbEdyYWRpZW50IGlkPSJncmFkMSIgY3g9IjUwJSIgY3k9IjUwJSIgcj0iNTAlIiBmeD0iNTAlIiBmeT0iNTAlIj4NCiAgICAgIDxzdG9wIG9mZnNldD0iMCUiIHN0eWxlPSJzdG9wLWNvbG9yOnJnYigyNTUsMjU1LDI1NSk7c3RvcC1vcGFjaXR5OjEiIC8+DQogICAgICA8c3RvcCBvZmZzZXQ9IjEwMCUiIHN0eWxlPSJzdG9wLWNvbG9yOnJnYigwLDAsMCk7c3RvcC1vcGFjaXR5OjEiIC8+DQogICAgPC9yYWRpYWxHcmFkaWVudD4NCiAgPC9kZWZzPg0KICA8Y2lyY2xlIGN4PSI1MCIgY3k9IjUwIiByPSI0MCIgZmlsbD0idXJsKCNncmFkMSkiIC8+DQo8L3N2Zz4NCg=="
            },
            {
              "type": "image",
              "format": "image/svg+xml",
              "boundingBox": {
                "x": 12.439399957342559,
                "y": -5.4582998402121765,
                "z": 0,
                "width": 1.0250000000000006,
                "height": 1.0250000000000006
              },
              "data": "PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAxMDAgMTAwIj4NCiAgPGRlZnM+DQogICAgPHJhZGlhbEdyYWRpZW50IGlkPSJncmFkMSIgY3g9IjUwJSIgY3k9IjUwJSIgcj0iNTAlIiBmeD0iNTAlIiBmeT0iNTAlIj4NCiAgICAgIDxzdG9wIG9mZnNldD0iMCUiIHN0eWxlPSJzdG9wLWNvbG9yOnJnYigyNTUsMjU1LDI1NSk7c3RvcC1vcGFjaXR5OjEiIC8+DQogICAgICA8c3RvcCBvZmZzZXQ9IjEwMCUiIHN0eWxlPSJzdG9wLWNvbG9yOnJnYigwLDAsMCk7c3RvcC1vcGFjaXR5OjEiIC8+DQogICAgPC9yYWRpYWxHcmFkaWVudD4NCiAgPC9kZWZzPg0KICA8Y2lyY2xlIGN4PSI1MCIgY3k9IjUwIiByPSI0MCIgZmlsbD0idXJsKCNncmFkMSkiIC8+DQo8L3N2Zz4NCg=="
            }
          ],
          "connections": [],
          "templates": []
        },
        "mol0": {
          "type": "molecule",
          "atoms": [
            {
              "label": "A",
              "alias": "t_01_0",
              "location": [
                18.148100042657443,
                -5.970799840212177,
                0
              ]
            },
            {
              "label": "C",
              "location": [
                17.282100868432757,
                -5.470799867681642,
                0
              ]
            },
            {
              "label": "C",
              "location": [
                16.416000604736084,
                -5.970799840212177,
                0
              ]
            },
            {
              "label": "C",
              "location": [
                15.550000476837134,
                -5.470799867681642,
                0
              ]
            },
            {
              "label": "C",
              "location": [
                14.684000348938183,
                -5.970799840212177,
                0
              ]
            },
            {
              "label": "C",
              "location": [
                13.818000221039231,
                -5.470799867681642,
                0
              ]
            },
            {
              "label": "A",
              "alias": "t_01_1",
              "location": [
                12.95189995734256,
                -5.970799840212177,
                0
              ]
            },
            {
              "label": "C",
              "location": [
                17.313900183091988,
                -6.406299961244762,
                0
              ]
            },
            {
              "label": "C",
              "location": [
                17.538601098481532,
                -7.37879975522877,
                0
              ]
            },
            {
              "label": "C",
              "location": [
                16.922300549454686,
                -8.160499369723212,
                0
              ]
            },
            {
              "label": "C",
              "location": [
                15.512299825832196,
                -6.415500056869689,
                0
              ]
            },
            {
              "label": "C",
              "location": [
                15.917000082834235,
                -8.166700159787823,
                0
              ]
            },
            {
              "label": "C",
              "location": [
                15.291600527654445,
                -7.387899715055976,
                0
              ]
            }
          ],
          "bonds": [
            {
              "type": 1,
              "atoms": [
                0,
                1
              ]
            },
            {
              "type": 1,
              "atoms": [
                1,
                2
              ]
            },
            {
              "type": 1,
              "atoms": [
                2,
                3
              ]
            },
            {
              "type": 1,
              "atoms": [
                3,
                4
              ]
            },
            {
              "type": 1,
              "atoms": [
                4,
                5
              ]
            },
            {
              "type": 1,
              "atoms": [
                5,
                6
              ]
            },
            {
              "type": 1,
              "atoms": [
                7,
                2
              ]
            },
            {
              "type": 1,
              "atoms": [
                2,
                10
              ]
            },
            {
              "type": 1,
              "atoms": [
                10,
                12
              ]
            },
            {
              "type": 1,
              "atoms": [
                12,
                11
              ]
            },
            {
              "type": 1,
              "atoms": [
                11,
                9
              ]
            },
            {
              "type": 1,
              "atoms": [
                9,
                8
              ]
            },
            {
              "type": 1,
              "atoms": [
                8,
                7
              ]
            }
          ],
          "stereoFlagPosition": {
            "x": 12.951899957342556,
            "y": -5.958299812742712,
            "z": 0
          }
        }
      });
      await fuelKetcherData({
        "root": {
          "nodes": [
            {
              "$ref": "mol0"
            },
            {
              "type": "image",
              "format": "image/svg+xml",
              "boundingBox": {
                "x": 17.635600042657444,
                "y": -5.4582998402121765,
                "z": 0,
                "width": 1.0250000000000006,
                "height": 1.0250000000000006
              },
              "data": "PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAxMDAgMTAwIj4NCiAgPGRlZnM+DQogICAgPHJhZGlhbEdyYWRpZW50IGlkPSJncmFkMSIgY3g9IjUwJSIgY3k9IjUwJSIgcj0iNTAlIiBmeD0iNTAlIiBmeT0iNTAlIj4NCiAgICAgIDxzdG9wIG9mZnNldD0iMCUiIHN0eWxlPSJzdG9wLWNvbG9yOnJnYigyNTUsMjU1LDI1NSk7c3RvcC1vcGFjaXR5OjEiIC8+DQogICAgICA8c3RvcCBvZmZzZXQ9IjEwMCUiIHN0eWxlPSJzdG9wLWNvbG9yOnJnYigwLDAsMCk7c3RvcC1vcGFjaXR5OjEiIC8+DQogICAgPC9yYWRpYWxHcmFkaWVudD4NCiAgPC9kZWZzPg0KICA8Y2lyY2xlIGN4PSI1MCIgY3k9IjUwIiByPSI0MCIgZmlsbD0idXJsKCNncmFkMSkiIC8+DQo8L3N2Zz4NCg=="
            },
            {
              "type": "image",
              "format": "image/svg+xml",
              "boundingBox": {
                "x": 12.439399957342559,
                "y": -5.4582998402121765,
                "z": 0,
                "width": 1.0250000000000006,
                "height": 1.0250000000000006
              },
              "data": "PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAxMDAgMTAwIj4NCiAgPGRlZnM+DQogICAgPHJhZGlhbEdyYWRpZW50IGlkPSJncmFkMSIgY3g9IjUwJSIgY3k9IjUwJSIgcj0iNTAlIiBmeD0iNTAlIiBmeT0iNTAlIj4NCiAgICAgIDxzdG9wIG9mZnNldD0iMCUiIHN0eWxlPSJzdG9wLWNvbG9yOnJnYigyNTUsMjU1LDI1NSk7c3RvcC1vcGFjaXR5OjEiIC8+DQogICAgICA8c3RvcCBvZmZzZXQ9IjEwMCUiIHN0eWxlPSJzdG9wLWNvbG9yOnJnYigwLDAsMCk7c3RvcC1vcGFjaXR5OjEiIC8+DQogICAgPC9yYWRpYWxHcmFkaWVudD4NCiAgPC9kZWZzPg0KICA8Y2lyY2xlIGN4PSI1MCIgY3k9IjUwIiByPSI0MCIgZmlsbD0idXJsKCNncmFkMSkiIC8+DQo8L3N2Zz4NCg=="
            }
          ],
          "connections": [],
          "templates": []
        },
        "mol0": {
          "type": "molecule",
          "atoms": [
            {
              "label": "A",
              "alias": "t_01_0",
              "location": [
                18.148100042657443,
                -5.970799840212177,
                0
              ]
            },
            {
              "label": "C",
              "location": [
                17.282100868432757,
                -5.470799867681642,
                0
              ]
            },
            {
              "label": "C",
              "location": [
                16.416000604736084,
                -5.970799840212177,
                0
              ]
            },
            {
              "label": "C",
              "location": [
                15.550000476837134,
                -5.470799867681642,
                0
              ]
            },
            {
              "label": "C",
              "location": [
                14.684000348938183,
                -5.970799840212177,
                0
              ]
            },
            {
              "label": "C",
              "location": [
                13.818000221039231,
                -5.470799867681642,
                0
              ]
            },
            {
              "label": "A",
              "alias": "t_01_1",
              "location": [
                12.95189995734256,
                -5.970799840212177,
                0
              ]
            },
            {
              "label": "C",
              "location": [
                17.313900183091988,
                -6.406299961244762,
                0
              ]
            },
            {
              "label": "C",
              "location": [
                17.538601098481532,
                -7.37879975522877,
                0
              ]
            },
            {
              "label": "C",
              "location": [
                16.922300549454686,
                -8.160499369723212,
                0
              ]
            },
            {
              "label": "C",
              "location": [
                15.512299825832196,
                -6.415500056869689,
                0
              ]
            },
            {
              "label": "C",
              "location": [
                15.917000082834235,
                -8.166700159787823,
                0
              ]
            },
            {
              "label": "C",
              "location": [
                15.291600527654445,
                -7.387899715055976,
                0
              ]
            }
          ],
          "bonds": [
            {
              "type": 1,
              "atoms": [
                0,
                1
              ]
            },
            {
              "type": 1,
              "atoms": [
                1,
                2
              ]
            },
            {
              "type": 1,
              "atoms": [
                2,
                3
              ]
            },
            {
              "type": 1,
              "atoms": [
                3,
                4
              ]
            },
            {
              "type": 1,
              "atoms": [
                4,
                5
              ]
            },
            {
              "type": 1,
              "atoms": [
                5,
                6
              ]
            },
            {
              "type": 1,
              "atoms": [
                7,
                2
              ]
            },
            {
              "type": 1,
              "atoms": [
                2,
                10
              ]
            },
            {
              "type": 1,
              "atoms": [
                10,
                12
              ]
            },
            {
              "type": 1,
              "atoms": [
                12,
                11
              ]
            },
            {
              "type": 1,
              "atoms": [
                11,
                9
              ]
            },
            {
              "type": 1,
              "atoms": [
                9,
                8
              ]
            },
            {
              "type": 1,
              "atoms": [
                8,
                7
              ]
            }
          ],
          "stereoFlagPosition": {
            "x": 12.951899957342556,
            "y": -5.958299812742712,
            "z": 0
          }
        }
      });
      assert.ok(mols.length > 0, "mols should be a list");
      assert.ok(imagesList.length > 0, "imagesList should be a list");
      assert.ok(latestData.root.nodes.length == mols.length + imagesList.length, "nodes should be equal to sum of mols and images list");
    });
  });

  describe('on add atom', () => {
    it('should have valid mols and image list', async () => {
      latestdataSetter(hasValidMolsAndImages);
      await fuelKetcherData(hasValidMolsAndImages);
      const { d } = await handleAddAtom();
      assert.ok(mols.length > 0, "mols should be a list");
      assert.ok(imagesList.length > 0, "imagesList should be a list");
      assert.notStrictEqual(d, null, "nodes should be equal to sum of mols and images list");
    });

    it('should fail if aliases are inconsistent', async () => {
      latestdataSetter(hasConsistentAliases_ket);
      await fuelKetcherData(hasConsistentAliases_ket);
      const { d, isConsistent } = await handleAddAtom();
      assert.notStrictEqual(d, null, "nodes should be equal to sum of mols and images list");
      assert.ok(isConsistent === false, "Generated aliases should be consistent");
    });

    it('all aliases should be consistent', async () => {
      latestdataSetter(areAllAliasesConsistent_ket);
      await fuelKetcherData(areAllAliasesConsistent_ket);
      const { d, isConsistent } = await handleAddAtom();
      assert.notStrictEqual(d, null, "nodes should be equal to sum of mols and images list");
      assert.ok(isConsistent === true, "Generated aliases should be consistent");
      assert.ok(image_used_counter === 3, "image counter should be 3.");
    });
  });

  describe('on single-image delete of template', async () => {
    it('should delete and update alias with image-count', async () => {
      _selectionSetter({
        images: [0]
      });
      latestdataSetter(imageCountAdjuster_ket);
      await fuelKetcherData(imageCountAdjuster_ket);
      await imageUsedCounterSetter(1);
      const data = await handleOnDeleteImage();
      assert.
        ok(imagesList.length - 1 === image_used_counter, "images left in the canvas should be equal to used image counter");
      assert.ok(data['mol1'].atoms[0].alias === "t_02_0", "expected alias should exists are correct path");
      assert.notDeepStrictEqual(data, empty_mol_file, "Latest molfile should be empty");
    });

    it('should delete complete mol when there are not bonds and only atom with alias', async () => {
      _selectionSetter({
        images: [0]
      });
      latestdataSetter(isMoleculeEmpty_ket);
      await fuelKetcherData(isMoleculeEmpty_ket);
      await imageUsedCounterSetter(0);
      const data = await handleOnDeleteImage();
      assert.
        ok(imagesList.length - 1 === image_used_counter, "images left in the canvas should be equal to used image counter");
      assert.deepStrictEqual(data, empty_mol_file, "Latest molfile should be empty");
    });

    it('should not process when selection has not images', async () => {
      _selectionSetter();
      latestdataSetter(isImageSelectionValid_ket);
      await fuelKetcherData(isImageSelectionValid_ket);
      await imageUsedCounterSetter(0);
      const data = await handleOnDeleteImage();
      assert.
        ok(imagesList.length - 1 === image_used_counter, "images left in the canvas should be equal to used image counter");
      assert.deepStrictEqual(data, latestData, "Latest molfile should be same as latest data");
    });
  });

  describe('on multi-image delete of template', async () => {
    it('should delete and update alias with image-count', async () => {
      _selectionSetter({
        images: [0, 1]
      });
      latestdataSetter(onMultiImageDelete_ket);
      await fuelKetcherData(onMultiImageDelete_ket);
      await imageUsedCounterSetter(3);
      const data = await handleOnDeleteImage();
      assert.
        ok(imagesList.length - 1 === image_used_counter, "images left in the canvas should be equal to used image counter");
      assert.ok(data['mol1'].atoms[0].alias === "t_01_0", "mol0 expected alias should exists are correct path");
      assert.ok(data['mol1'].atoms[1].alias === "t_01_1", "mol0 expected alias should exists are correct path");
    });

    it('should delete and update alias with image-count when there is only atoms with alias and result should be empty ketfile', async () => {
      _selectionSetter({
        images: [0, 1]
      });
      latestdataSetter(wiht2Aliases_ket);
      await fuelKetcherData(wiht2Aliases_ket);
      await imageUsedCounterSetter(1);
      const data = await handleOnDeleteImage();
      console.log(imagesList.length - 1, image_used_counter);
      assert.
        ok(imagesList.length - 1 === image_used_counter, "images left in the canvas should be equal to used image counter");
      assert.deepStrictEqual(data, empty_mol_file, "ket_file should be on default state");
    });

    it('when image index is invalid', async () => {
      await _selectionSetter({
        images: [0, 22]
      });
      await latestdataSetter({
        "root": {
          "nodes": [
            {
              "$ref": "mol0"
            },
            {
              "type": "image",
              "format": "image/svg+xml",
              "boundingBox": {
                "x": 12.439399957342559,
                "y": -5.4582998402121765,
                "z": 0,
                "width": 1.0250000000000006,
                "height": 1.0250000000000006
              },
              "data": "PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAxMDAgMTAwIj4NCiAgPGRlZnM+DQogICAgPHJhZGlhbEdyYWRpZW50IGlkPSJncmFkMSIgY3g9IjUwJSIgY3k9IjUwJSIgcj0iNTAlIiBmeD0iNTAlIiBmeT0iNTAlIj4NCiAgICAgIDxzdG9wIG9mZnNldD0iMCUiIHN0eWxlPSJzdG9wLWNvbG9yOnJnYigyNTUsMjU1LDI1NSk7c3RvcC1vcGFjaXR5OjEiIC8+DQogICAgICA8c3RvcCBvZmZzZXQ9IjEwMCUiIHN0eWxlPSJzdG9wLWNvbG9yOnJnYigwLDAsMCk7c3RvcC1vcGFjaXR5OjEiIC8+DQogICAgPC9yYWRpYWxHcmFkaWVudD4NCiAgPC9kZWZzPg0KICA8Y2lyY2xlIGN4PSI1MCIgY3k9IjUwIiByPSI0MCIgZmlsbD0idXJsKCNncmFkMSkiIC8+DQo8L3N2Zz4NCg=="
            }
          ],
          "connections": [],
          "templates": []
        },
        "mol0": {
          "type": "molecule",
          "atoms": [
            {
              "label": "A",
              "alias": "t_01_0",
              "location": [
                18.148100042657443,
                -5.970799840212177,
                0
              ]
            },
            {
              "label": "A",
              "alias": "t_01_1",
              "location": [
                12.95189995734256,
                -5.970799840212177,
                0
              ]
            },
          ],
          "bonds": []
        },
      });
      await fuelKetcherData({
        "root": {
          "nodes": [
            {
              "$ref": "mol0"
            },
            {
              "type": "image",
              "format": "image/svg+xml",
              "boundingBox": {
                "x": 12.439399957342559,
                "y": -5.4582998402121765,
                "z": 0,
                "width": 1.0250000000000006,
                "height": 1.0250000000000006
              },
              "data": "PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAxMDAgMTAwIj4NCiAgPGRlZnM+DQogICAgPHJhZGlhbEdyYWRpZW50IGlkPSJncmFkMSIgY3g9IjUwJSIgY3k9IjUwJSIgcj0iNTAlIiBmeD0iNTAlIiBmeT0iNTAlIj4NCiAgICAgIDxzdG9wIG9mZnNldD0iMCUiIHN0eWxlPSJzdG9wLWNvbG9yOnJnYigyNTUsMjU1LDI1NSk7c3RvcC1vcGFjaXR5OjEiIC8+DQogICAgICA8c3RvcCBvZmZzZXQ9IjEwMCUiIHN0eWxlPSJzdG9wLWNvbG9yOnJnYigwLDAsMCk7c3RvcC1vcGFjaXR5OjEiIC8+DQogICAgPC9yYWRpYWxHcmFkaWVudD4NCiAgPC9kZWZzPg0KICA8Y2lyY2xlIGN4PSI1MCIgY3k9IjUwIiByPSI0MCIgZmlsbD0idXJsKCNncmFkMSkiIC8+DQo8L3N2Zz4NCg=="
            }
          ],
          "connections": [],
          "templates": []
        },
        "mol0": {
          "type": "molecule",
          "atoms": [
            {
              "label": "A",
              "alias": "t_01_0",
              "location": [
                18.148100042657443,
                -5.970799840212177,
                0
              ]
            },
            {
              "label": "A",
              "alias": "t_01_1",
              "location": [
                12.95189995734256,
                -5.970799840212177,
                0
              ]
            },
          ],
          "bonds": []
        },
      });
      await imageUsedCounterSetter(1);
      const data = await handleOnDeleteImage();
      const alias = parseInt(data['mol0'].atoms[0].alias.split("_")[2]);
      assert.
        ok(imagesList.length - 1 === image_used_counter, "images left in the canvas should be equal to used image counter");
      assert.ok(alias == 0, "alias index 1 should change to 0");
    });
  });
});