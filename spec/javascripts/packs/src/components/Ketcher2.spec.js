/* eslint-disable no-undef */
import assert from 'assert';

// ketcher2 component
import {
  allAtoms,
  allNodes,
  deleteAtomListSetter,
  deletedAtoms,
  FILOStack,
  loadKetcherData,
  handleAddAtom,
  handleOnDeleteAtom,
  imageNodeCounter,
  imagesList,
  imageUsedCounterSetter,
  latestData, latestDataSetter,
  mols,
  reloadCanvas,
  resetStore,
  uniqueEvents,
  templateListSetter,
  saveMolefile,
} from 'src/components/structureEditor/KetcherEditor';
import {
  hasKetcherData,
  ALIAS_PATTERNS,
  handleOnDeleteImage,
  addPolymerTags,
  moveTemplate,
  template_list_data,
} from '../../../../../app/javascript/src/utilities/Ketcher2SurfaceChemistryUtils.js';

// ketcher/molfiles mockups
import {
  ketFormateFullyLoaded,
  twoMolsOneImageOneAtomWithWithoutAlias,
  oneImageMolfile,
  emptyKet,
  oneImageKet,
  molfileWithoutPolymerList,
  oneNodeNonPolymerKet,
  templateListMockup,
  addAtomMockup,
  hasConsistentAliasesKet,
  oldImagePack,
  isMoleculeEmptyKet,
  oldImagePackThree,
  deleteImageWithThreeOldPack,
  only2AliasAtomsKet,
  twoAliasAtomsOneImageKet,
  deleteAtomAndRemoveImageKet,
  deleteAtomAndRemoveImage_ket,
  deleteAtomAndRemoveImageMulti_ket,
  empty_mol_file,
  imageCountAdjuster_ket,
  mock_ketcher_mols_images_nodes,
  molfileWithPolymerList,
  molfileData_save,
  molfileData_save_invalid_spacing,
} from '../../../data/ketcher2_mockups';

// ketcher2 helpers

describe('Ketcher2', () => {
  beforeEach(async () => {
    resetStore();
    await templateListSetter(templateListMockup);
  });

  describe('assign data with ket format', () => {
    it('latest data should be equal to ket file', async () => {
      await latestDataSetter(ketFormateFullyLoaded);
      assert.deepEqual(latestData, ketFormateFullyLoaded, 'latestData should be null');
    });

    it('assign complete data in ket format to all containers', async () => {
      await loadKetcherData(ketFormateFullyLoaded);
      await latestDataSetter(ketFormateFullyLoaded);
      assert.strictEqual(latestData, ketFormateFullyLoaded, 'latestData should be equal to ket file');
      assert.strictEqual(imagesList.length, 6, 'imagesList should be 5');
      assert.strictEqual(mols.length, 2, 'mols should be 2');
      assert.strictEqual(allNodes.length, 8, 'allNodes should be an empty array');
      assert.strictEqual(reloadCanvas, false, 'reloadCanvas should be false');
    });

    it('should clear all containers', async () => {
      resetStore();
      assert.deepEqual(FILOStack, [], 'FILOStack should be empty');
      assert.strictEqual(uniqueEvents.length, undefined, 'uniqueEvents should be an empty array');
      assert.strictEqual(latestData, null, 'latestData should be null');
      assert.deepEqual(imagesList, [], 'imagesList should be an empty array');
      assert.deepEqual(mols, [], 'mols should be an empty array');
      assert.deepEqual(allNodes, [], 'allNodes should be an empty array');
      assert.strictEqual(imageNodeCounter, -1, 'imageNodeCounter should be -1');
      assert.strictEqual(reloadCanvas, false, 'reloadCanvas should be false');
      assert.deepEqual(deletedAtoms, [], 'deletedAtoms should be an empty array');
      assert.deepEqual(allAtoms, [], 'allAtoms should be an empty array');
    });

    it('2 mols, 1 image, 1 atom with alias', async () => {
      await loadKetcherData(twoMolsOneImageOneAtomWithWithoutAlias);
      assert.strictEqual(imagesList.length, 1, 'imagesList should have some length');
      assert.strictEqual(mols.length, 2, 'mols should have some length');
      assert.strictEqual(allAtoms.length, 4, 'allAtoms have invalid length');
      assert.strictEqual(allNodes.length, 3, 'allNodes have invalid length');
    });

    it('containers should be empty', async () => {
      await loadKetcherData(emptyKet);
      assert.strictEqual(allAtoms.length, 0, 'allAtoms should have some length');
      assert.strictEqual(allNodes.length, 0, 'allNodes should not have some length');
      assert.strictEqual(imagesList.length, 0, 'imagesList should have some length');
      assert.strictEqual(mols.length, 0, 'mols should not have some length');
    });
    it('should restore all containers', async () => {
      resetStore();
      assert.strictEqual(allAtoms.length, 0, 'allAtoms should not have some length');
      assert.strictEqual(allNodes.length, 0, 'allNodes should not have some length');
      assert.strictEqual(imagesList.length, 0, 'imagesList should not have length');
      assert.strictEqual(mols.length, 0, 'mols should not have some length');
    });
  });

  describe('On reading molfile', () => {
    it('should have rails polymer list', async () => {
      const railsList = await hasKetcherData(molfileWithPolymerList);
      const list = railsList.split(' ');
      assert.strictEqual(list.length, 2, 'list of polymers should have length of 2');
    });

    it('should have a polymer list', async () => {
      const polymerTag = await hasKetcherData(oneImageMolfile);
      const { molfileData } = await addPolymerTags(polymerTag, oneImageKet);
      await loadKetcherData(molfileData);
      assert.notStrictEqual(molfileData, null, 'list of polymers can not be null');
      assert.strictEqual(allNodes.length, 1, 'all collected nodes');
      assert.strictEqual(allAtoms.length, 1, 'all collected atoms');
      assert.strictEqual(imagesList.length, 0, 'all collected imagesList');
    });

    it('should not have a polymer list', async () => {
      const polymerTag = await hasKetcherData(molfileWithoutPolymerList);
      const { collectedImages, molfileData } = await addPolymerTags(polymerTag, oneNodeNonPolymerKet);
      assert.notStrictEqual(molfileData, null, 'list of polymers can not be null');
      assert.strictEqual(collectedImages.length, 0, 'all collected nodes');
      assert.strictEqual(allAtoms.length, 0, 'all collected atoms');
      assert.strictEqual(imagesList.length, 0, 'all collected atoms');
    });
  });

  describe('on add atom', () => {
    it('should have valid mols and image list:last atom updated', async () => {
      await latestDataSetter(addAtomMockup);
      await loadKetcherData(addAtomMockup);
      const aliasListWithAtom = [];
      let modifiedAlias = null;
      const { d, isConsistent } = await handleAddAtom();
      Object.values(d).forEach((i) => i?.atoms?.forEach((j) => {
        if (j?.alias) {
          aliasListWithAtom.push(j.alias);
        }
      }));
      await loadKetcherData(d);
      modifiedAlias = ALIAS_PATTERNS.threeParts.test(aliasListWithAtom[aliasListWithAtom.length - 1]);
      assert.strictEqual(isConsistent, true, 'mols should be a list');
      assert.strictEqual(modifiedAlias, true, 'last modified alias should be of three parts now');
      assert.strictEqual(addAtomMockup.root.nodes.length, 8, 'nodes should have an image added');
      assert.strictEqual(allNodes.length, 8, 'allNodes should have a right count');
      assert.strictEqual(imagesList.length, 6, 'imagesList should have a right count');
      assert.notStrictEqual(d, null, 'nodes should be equal to sum of mols and images list');
      resetStore();
    });

    it('should fail if aliases are inconsistent', async () => {
      await latestDataSetter(hasConsistentAliasesKet);
      await loadKetcherData(hasConsistentAliasesKet);
      const { d, isConsistent } = await handleAddAtom();
      assert.notStrictEqual(d, null, 'nodes should be equal to sum of mols and images list');
      assert.strictEqual(isConsistent, false, 'Generated aliases should be consistent');
    });
  });

  describe('on single-image delete of template', async () => {
    it('should delete and update alias with image-count', async () => {
      await loadKetcherData(oneImageKet);
      await latestDataSetter(oneImageKet);
      await imageUsedCounterSetter(0);
      const collectedAliases = [];
      const data = await handleOnDeleteImage(null, oldImagePack, []);
      Object.values(data).forEach((i) => i?.atoms?.forEach((j) => {
        if (j?.alias) {
          collectedAliases.push(j.alias);
        }
      }));
      assert.deepStrictEqual(collectedAliases, [], 'nodes should be equal to sum of mols and images list');
      assert.deepStrictEqual(imagesList, [], 'image list should be cleared');
    });
    it('should delete complete mol when there are not bonds and only atom with alias', async () => {
      await loadKetcherData(isMoleculeEmptyKet);
      await latestDataSetter(isMoleculeEmptyKet);
      await imageUsedCounterSetter(0);
      const collectedAliases = [];
      const data = await handleOnDeleteImage(null, oldImagePack, []);
      Object.values(data).forEach((i) => i?.atoms?.forEach((j) => {
        if (j?.alias) {
          collectedAliases.push(j.alias);
        }
      }));
      const matchImages = imagesList.length - 1 === imageNodeCounter;
      assert
        .ok(matchImages, 'images left in the canvas should be equal to used image counter');
      assert.deepStrictEqual(data, emptyKet, 'Latest molfile should be empty');
    });
  });

  describe('on multi-image delete of template', async () => {
    it('should delete and update alias with image-count', async () => {
      await loadKetcherData(deleteImageWithThreeOldPack);
      await latestDataSetter(deleteImageWithThreeOldPack);
      await imageUsedCounterSetter(2);
      const collectedAliases = [];
      const data = await handleOnDeleteImage({
        images: [0, 1]
      }, oldImagePackThree, []);
      Object.values(data).forEach((i) => i?.atoms?.forEach((j) => {
        if (j?.alias) {
          collectedAliases.push(j.alias);
        }
      }));
      assert.deepStrictEqual(collectedAliases, ['t_01_1'], 'Remaining alias should be 2');
      assert.deepStrictEqual(imagesList.length, 1, 'Remaining alias should be 2');
    });

    it('should delete and update alias with image-count when there are atoms with alias', async () => {
      await loadKetcherData(only2AliasAtomsKet);
      await latestDataSetter(only2AliasAtomsKet);
      await imageUsedCounterSetter(0);
      const collectedAliases = [];
      const data = await handleOnDeleteImage({
        images: [0, 1]
      }, [], []);
      Object.values(data).forEach((i) => i?.atoms?.forEach((j) => {
        if (j?.alias) {
          collectedAliases.push(j.alias);
        }
      }));
      assert.deepStrictEqual(collectedAliases, [], 'Remaining alias should be 2');
      assert.deepStrictEqual(imagesList.length, 0, 'Remaining alias should be 2');
      assert.deepStrictEqual(data, emptyKet, 'ket_file should be on default state');
    });

    it('when image index is invalid', async () => {
      await loadKetcherData(twoAliasAtomsOneImageKet);
      await latestDataSetter(twoAliasAtomsOneImageKet);
      await imageUsedCounterSetter(0);
      const collectedAliases = [];
      const data = await handleOnDeleteImage({
        images: [0, 22]
      }, oldImagePack, []);

      Object.values(data).forEach((i) => i?.atoms?.forEach((j) => {
        if (j?.alias) {
          collectedAliases.push(j.alias);
        }
      }));
      assert.deepStrictEqual(collectedAliases, ['t_01_0'], 'Remaining alias should be 2');
      assert.ok(imagesList.length - 1 === imageNodeCounter, 'image list length should be zero as imageNodeCounter');
    });
  });

  // TODO: start from here!
  describe('on delete atom', async () => {
    it('should delete and update alias with image-count and image image-used-counter should be decreased by number of atoms deleted', async () => {
      await deleteAtomListSetter([
        {
          label: 'A',
          alias: 't_3_0',
          location: [
            13.5875,
            -6.8500000000000005,
            0
          ]
        }
      ]);
      await loadKetcherData(deleteAtomAndRemoveImageKet);
      await latestDataSetter(deleteAtomAndRemoveImageKet);

      //
      await imageUsedCounterSetter(0);
      const data = await handleOnDeleteAtom();
      console.log(latestData);
      assert.ok(imageNodeCounter - deletedAtoms.length == -1, 'image used counter should be -1');
    });
    return;

    it('should stay same when atom doesnt have alias', async () => {
      await deleteAtomListSetter([{
        label: 'C',
        location: [
          17.652531582471504,
          -3.8141882455514398,
          0
        ]
      }]);
      await latestDataSetter(deleteAtomAndRemoveImage_ket);
      await loadKetcherData(deleteAtomAndRemoveImage_ket);
      await imageUsedCounterSetter(0);
      await handleOnDeleteAtom();
      assert.deepStrictEqual(deleteAtomAndRemoveImage_ket, latestData, 'latest data should be equal to input');
    });

    it('multi-image it should delete and update alias with image-count and image image-used-counter should be decreased by number of atoms deleted', async () => {
      await deleteAtomListSetter([{
        label: 'A',
        alias: 't_01_0',
        location: [
          17.652531582471504,
          -3.8141882455514398,
          0
        ]
      },
      {
        label: 'A',
        alias: 't_01_1',
        location: [
          17.652531582471504,
          -3.8141882455514398,
          0
        ]
      }
      ]);
      await latestDataSetter(deleteAtomAndRemoveImageMulti_ket);
      await loadKetcherData(deleteAtomAndRemoveImageMulti_ket);
      await imageUsedCounterSetter(1);
      await handleOnDeleteAtom();
      assert.ok(imageNodeCounter - deletedAtoms.length == -1, 'image used counter should be -1');
    });

    it('one with multi-image it should delete and update alias with image-count and image image-used-counter should be decreased by number of atoms deleted', async () => {
      await deleteAtomListSetter([{
        label: 'A',
        alias: 't_01_0',
        location: [
          17.652531582471504,
          -3.8141882455514398,
          0
        ]
      }
      ]);
      await latestDataSetter({
        ...{
          root: {
            nodes: [
              {
                $ref: 'mol0'
              },
              {
                type: 'image',
                format: 'image/svg+xml',
                boundingBox: {
                  x: 17.635600042657444,
                  y: -5.4582998402121765,
                  z: 0,
                  width: 1.0250000000000006,
                  height: 1.0250000000000006
                },
                data: 'PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAxMDAgMTAwIj4NCiAgPGRlZnM+DQogICAgPHJhZGlhbEdyYWRpZW50IGlkPSJncmFkMSIgY3g9IjUwJSIgY3k9IjUwJSIgcj0iNTAlIiBmeD0iNTAlIiBmeT0iNTAlIj4NCiAgICAgIDxzdG9wIG9mZnNldD0iMCUiIHN0eWxlPSJzdG9wLWNvbG9yOnJnYigyNTUsMjU1LDI1NSk7c3RvcC1vcGFjaXR5OjEiIC8+DQogICAgICA8c3RvcCBvZmZzZXQ9IjEwMCUiIHN0eWxlPSJzdG9wLWNvbG9yOnJnYigwLDAsMCk7c3RvcC1vcGFjaXR5OjEiIC8+DQogICAgPC9yYWRpYWxHcmFkaWVudD4NCiAgPC9kZWZzPg0KICA8Y2lyY2xlIGN4PSI1MCIgY3k9IjUwIiByPSI0MCIgZmlsbD0idXJsKCNncmFkMSkiIC8+DQo8L3N2Zz4NCg=='
              },
              {
                type: 'image',
                format: 'image/svg+xml',
                boundingBox: {
                  x: 17.635600042657444,
                  y: -5.4582998402121765,
                  z: 0,
                  width: 1.0250000000000006,
                  height: 1.0250000000000006
                },
                data: 'PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAxMDAgMTAwIj4NCiAgPGRlZnM+DQogICAgPHJhZGlhbEdyYWRpZW50IGlkPSJncmFkMSIgY3g9IjUwJSIgY3k9IjUwJSIgcj0iNTAlIiBmeD0iNTAlIiBmeT0iNTAlIj4NCiAgICAgIDxzdG9wIG9mZnNldD0iMCUiIHN0eWxlPSJzdG9wLWNvbG9yOnJnYigyNTUsMjU1LDI1NSk7c3RvcC1vcGFjaXR5OjEiIC8+DQogICAgICA8c3RvcCBvZmZzZXQ9IjEwMCUiIHN0eWxlPSJzdG9wLWNvbG9yOnJnYigwLDAsMCk7c3RvcC1vcGFjaXR5OjEiIC8+DQogICAgPC9yYWRpYWxHcmFkaWVudD4NCiAgPC9kZWZzPg0KICA8Y2lyY2xlIGN4PSI1MCIgY3k9IjUwIiByPSI0MCIgZmlsbD0idXJsKCNncmFkMSkiIC8+DQo8L3N2Zz4NCg=='
              },
            ],
            connections: [],
            templates: []
          },
          mol0: {
            type: 'molecule',
            atoms: [
              {
                label: 'A',
                alias: 't_01_0',
                location: [
                  18.148100042657443,
                  -5.970799840212177,
                  0
                ]
              }
            ],
            bonds: []
          },
          mol1: {
            type: 'molecule',
            atoms: [
              {
                label: 'A',
                alias: 't_01_1',
                location: [
                  18.148100042657443,
                  -5.970799840212177,
                  0
                ]
              }
            ],
            bonds: []
          },
        }
      });
      await loadKetcherData({
        ...{
          root: {
            nodes: [
              {
                $ref: 'mol0'
              },
              {
                type: 'image',
                format: 'image/svg+xml',
                boundingBox: {
                  x: 17.635600042657444,
                  y: -5.4582998402121765,
                  z: 0,
                  width: 1.0250000000000006,
                  height: 1.0250000000000006
                },
                data: 'PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAxMDAgMTAwIj4NCiAgPGRlZnM+DQogICAgPHJhZGlhbEdyYWRpZW50IGlkPSJncmFkMSIgY3g9IjUwJSIgY3k9IjUwJSIgcj0iNTAlIiBmeD0iNTAlIiBmeT0iNTAlIj4NCiAgICAgIDxzdG9wIG9mZnNldD0iMCUiIHN0eWxlPSJzdG9wLWNvbG9yOnJnYigyNTUsMjU1LDI1NSk7c3RvcC1vcGFjaXR5OjEiIC8+DQogICAgICA8c3RvcCBvZmZzZXQ9IjEwMCUiIHN0eWxlPSJzdG9wLWNvbG9yOnJnYigwLDAsMCk7c3RvcC1vcGFjaXR5OjEiIC8+DQogICAgPC9yYWRpYWxHcmFkaWVudD4NCiAgPC9kZWZzPg0KICA8Y2lyY2xlIGN4PSI1MCIgY3k9IjUwIiByPSI0MCIgZmlsbD0idXJsKCNncmFkMSkiIC8+DQo8L3N2Zz4NCg=='
              },
              {
                type: 'image',
                format: 'image/svg+xml',
                boundingBox: {
                  x: 17.635600042657444,
                  y: -5.4582998402121765,
                  z: 0,
                  width: 1.0250000000000006,
                  height: 1.0250000000000006
                },
                data: 'PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAxMDAgMTAwIj4NCiAgPGRlZnM+DQogICAgPHJhZGlhbEdyYWRpZW50IGlkPSJncmFkMSIgY3g9IjUwJSIgY3k9IjUwJSIgcj0iNTAlIiBmeD0iNTAlIiBmeT0iNTAlIj4NCiAgICAgIDxzdG9wIG9mZnNldD0iMCUiIHN0eWxlPSJzdG9wLWNvbG9yOnJnYigyNTUsMjU1LDI1NSk7c3RvcC1vcGFjaXR5OjEiIC8+DQogICAgICA8c3RvcCBvZmZzZXQ9IjEwMCUiIHN0eWxlPSJzdG9wLWNvbG9yOnJnYigwLDAsMCk7c3RvcC1vcGFjaXR5OjEiIC8+DQogICAgPC9yYWRpYWxHcmFkaWVudD4NCiAgPC9kZWZzPg0KICA8Y2lyY2xlIGN4PSI1MCIgY3k9IjUwIiByPSI0MCIgZmlsbD0idXJsKCNncmFkMSkiIC8+DQo8L3N2Zz4NCg=='
              },
            ],
            connections: [],
            templates: []
          },
          mol0: {
            type: 'molecule',
            atoms: [
              {
                label: 'A',
                alias: 't_01_0',
                location: [
                  18.148100042657443,
                  -5.970799840212177,
                  0
                ]
              }
            ],
            bonds: []
          },
          mol1: {
            type: 'molecule',
            atoms: [
              {
                label: 'A',
                alias: 't_01_1',
                location: [
                  18.148100042657443,
                  -5.970799840212177,
                  0
                ]
              }
            ],
            bonds: []
          },
        }
      });
      await imageUsedCounterSetter(1);
      await handleOnDeleteAtom();
      assert.ok(imageNodeCounter - deletedAtoms.length == 0, 'image used counter should be -1');
    });
  });
  return;

  describe('on move template helper function', async () => {
    it('length of nodes should be requal to mols', async () => {
      latestDataSetter(imageCountAdjuster_ket);
      await loadKetcherData(imageCountAdjuster_ket);
      await moveTemplate();
      assert.ok(latestData.root.nodes.length === 2, 'latestData should only have mols');
    });

    it('length of nodes should be requal to mols as empty', async () => {
      latestDataSetter(empty_mol_file);
      await loadKetcherData(empty_mol_file);
      await moveTemplate();
      assert.ok(latestData.root.nodes.length === 0, 'latestData should only have mols');
    });
  });

  describe('on save molfile', async () => {
    it('should report invalid molfile invalid spacing', async () => {
      const { ket2Molfile, svgElement } = await saveMolefile(null, molfileData_save_invalid_spacing);
      assert.deepEqual(ket2Molfile, null, 'Ketcher2 should be null');
      assert.deepEqual(svgElement, null, 'Svg will always be null for specs');
    });

    it('should report valid molfile invalid spacing', async () => {
      const { ket2Molfile, svgElement } = await saveMolefile(null, molfileData_save);
      assert.notDeepStrictEqual(ket2Molfile, null, 'Ketcher2 should be null');
      assert.deepEqual(svgElement, null, 'Svg will always be null for specs');
    });
  });

  describe('on Move template', () => {
    it('molecules should have with proper alias', async () => {
      latestDataSetter(mock_ketcher_mols_images_nodes);
      loadKetcherData(mock_ketcher_mols_images_nodes);
      await moveTemplate();
      assert.ok(latestData.root.nodes.length == 1, 'nodes length should be equal to 1 only mol0');
      // assert.deepStrictEqual(mock_ketcher_mols_images_nodes, latestData, 'latest data should not be null');
    });

    it('when data is empty', async () => {
      latestDataSetter(empty_mol_file);
      loadKetcherData(empty_mol_file);
      await moveTemplate();
      assert.notStrictEqual(latestData.root.node, null, 'mols length should be node/root cannot be null');
      assert.ok(latestData.root.nodes.length == 0, 'mols length should be 0');
      assert.ok(imageNodeCounter == -1, 'Image user counter should be -1');
    });

    it('when alias format is not correct', async () => {
      latestDataSetter(mock_ketcher_mols_images_nodes);
      loadKetcherData(mock_ketcher_mols_images_nodes);
      await moveTemplate();

      assert.notStrictEqual(latestData.root.node, null, 'nodes/root cannot be null');
      assert.ok(imagesList.length == 0, 'should have not images');
      await Promise.all(mols.map(async (mol) => {
        const molecule = latestData[mol];
        molecule?.atoms?.forEach((item) => {
          if (item.alias) {
            assert.ok(ALIAS_PATTERNS.three_parts_pattern.test(item.alias) === true, 'Image user counter should be -1');
          }
        });
      }));
    });

    it('when image doesnt have bounding box or image is out of max index', async () => {
      latestDataSetter(mock_ketcher_mols_images_nodes);
      loadKetcherData(mock_ketcher_mols_images_nodes);
      await moveTemplate();

      assert.notStrictEqual(latestData.root.node, null, 'nodes/root cannot be null');
      assert.ok(imagesList.length == 0, 'should have not images');

      await Promise.all(mols.map(async (mol) => {
        const molecule = latestData[mol];
        molecule?.atoms?.forEach((item) => {
          if (item.alias) {
            const splits_alias = item.alias.split('_');
            const template = template_list_data[parseInt(splits_alias[1])].boundingBox;
            assert.notStrictEqual(template, null, 'template cannot be null based on alias 2nd part as template id');
          }
        });
      }));
    });
  });
});

// describe('on reset alias', async () => {
//   it('should have consistent aliases after removing one', async () => {
//     const atom = {
//       alias: 't_01_1'
//     };
//     await latestDataSetter(resetOtherAliasesOnAnyDelete);
//     const molecules = ['mol0', 'mol1'];
//     await resetOtherAliasCounters(atom, molecules, latestData);
//     assert.notDeepStrictEqual(latestData, null, 'latestdata should be valid after computing');
//     assert.ok(isAliasConsistent() === true, 'latestdata should be valid after computing');
//   });
// });

// describe('on Template usage', async () => {
//   it('should have stringy struct', async () => {
//     const processedTemplates = templateParser();
//     processedTemplates.forEach((template) => {
//       expect(typeof template.struct).toBe('string');

//       // Additionally, check if the struct is valid JSON
//       expect(() => JSON.parse(template.struct)).not.toThrow();
//     });
//   });
// });
