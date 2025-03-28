/* eslint-disable no-undef */
import assert from 'assert';

// ketcher2 component
import {
  allAtoms,
  allNodes,
  deletedAtoms,
  FILOStack,
  loadKetcherData,
  handleAddAtom,
  imageNodeCounter,
  imagesList,
  imageUsedCounterSetter,
  latestData, latestDataSetter,
  mols,
  reloadCanvas,
  resetStore,
  uniqueEvents,
  templateListSetter,
} from 'src/components/structureEditor/KetcherEditor';
import {
  hasKetcherData,
  ALIAS_PATTERNS,
  addPolymerTags,
  handleOnDeleteAtom,
  removeImageTemplateAtom,
  deepCompareContent,
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
  isMoleculeEmptyKet,
  oldImagePackThree,
  deleteImageWithThreeOldPack,
  deleteAtomAndRemoveImageKet,
  molfileWithPolymerList,
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
      const aliasDifferences = [0];
      const collectedAliases = [];
      let data = await removeImageTemplateAtom(latestData, [0]);
      data = await handleOnDeleteAtom(aliasDifferences, data, imagesList);
      Object.values(data).forEach((i) => i?.atoms?.forEach((j) => {
        if (j?.alias) {
          console.log(j.alias);
          collectedAliases.push(j.alias);
        }
      }));
      assert.deepStrictEqual(collectedAliases, [], 'nodes should be equal to sum of mols and images list');
      assert.deepStrictEqual(imagesList, [], 'image list should be cleared');
    });

    it('should delete complete mol when there are not bonds and only atom with alias', async () => {
      await loadKetcherData(isMoleculeEmptyKet);
      await latestDataSetter(isMoleculeEmptyKet);
      const aliasDifferences = [0];
      await imageUsedCounterSetter(0);
      const collectedAliases = [];
      let data = await removeImageTemplateAtom(latestData, [0]);
      data = await handleOnDeleteAtom(aliasDifferences, data, imagesList);
      Object.values(data).forEach((i) => i?.atoms?.forEach((j) => {
        if (j?.alias) {
          collectedAliases.push(j.alias);
        }
      }));
      const matchImages = imagesList.length === 0 ? 0 : imagesList.length - 1;
      assert
        .strictEqual(matchImages, imageNodeCounter, 'images left in the canvas should be equal to used image counter');
      assert.deepStrictEqual(data, emptyKet, 'Latest molfile should be empty');
    });
  });

  describe('on multi-image delete of template', async () => {
    it('should delete and update alias with image-count', async () => {
      await loadKetcherData(deleteImageWithThreeOldPack);
      await latestDataSetter(deleteImageWithThreeOldPack);
      await imageUsedCounterSetter(2);
      const collectedAliases = [];
      const imageDifferences = await deepCompareContent(oldImagePackThree, imagesList);

      let data = await removeImageTemplateAtom(latestData, imageDifferences);
      data = await handleOnDeleteAtom([0, 1], data, imagesList);
      Object.values(data).forEach((i) => i?.atoms?.forEach((j) => {
        if (j?.alias) {
          collectedAliases.push(j.alias);
        }
      }));
      assert.deepStrictEqual(collectedAliases, ['t_01_0'], 'Remaining alias should be with 0');
      assert.deepStrictEqual(imagesList.length, 1, 'Remaining alias should be 2');
    });
  });

  describe('on delete atom', async () => {
    it('should delete and update alias with image-count and image image-used-counter should be decreased by number of atoms deleted', async () => {
      await loadKetcherData(deleteAtomAndRemoveImageKet);
      await latestDataSetter(deleteAtomAndRemoveImageKet);
      await imageUsedCounterSetter(0);

      let data = await removeImageTemplateAtom(latestData, [0]);
      data = await handleOnDeleteAtom([0], data, imagesList);
      assert.deepStrictEqual(data, emptyKet, 'ket should be empty');
    });
  });
});
