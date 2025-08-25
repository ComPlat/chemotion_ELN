import assert from 'assert';
import { describe, it, beforeEach, afterEach } from 'mocha';
import {
  allAtoms,
  allNodes,
  deletedAtoms,
  FILOStack,
  imagesList,
  mols,
  reloadCanvas,
  uniqueEvents,
  templateListSetter,
} from 'src/utilities/ketcherSurfaceChemistry/stateManager';
import {
  handleAddAtom,
  handleOnDeleteAtom,
  removeAtomFromData,
} from 'src/utilities/ketcherSurfaceChemistry/AtomsAndMolManipulation';

import { addPolymerTags } from 'src/utilities/ketcherSurfaceChemistry/PolymersTemplates';
import { ALIAS_PATTERNS } from 'src/utilities/ketcherSurfaceChemistry/constants';
import { deepCompareContent } from 'src/utilities/ketcherSurfaceChemistry/TextNode';

// ketcher/molfiles mockups
import { hasKetcherData, loadKetcherData } from 'src/utilities/ketcherSurfaceChemistry/InitializeAndParseKetcher';
import {
  latestDataSetter,
  imageNodeCounter,
  imageUsedCounterSetter,
  latestData,
  resetStore,
} from 'src/components/structureEditor/KetcherEditor';
import {
  ketFormateFullyLoaded,
  twoMolsOneImageOneAtomWithWithoutAlias,
  oneImageMolfile,
  emptyKet,
  oneImageKet,
  molfileWithoutPolymerList,
  oneNodeNonPolymerKet,
  addAtomMockup,
  hasConsistentAliasesKet,
  isMoleculeEmptyKet,
  oldImagePackThree,
  deleteImageWithThreeOldPack,
  deleteAtomAndRemoveImageKet,
  molfileWithPolymerList,
} from '../../../data/ketcher2_mockups';
import templates from '../../../../../public/json/surfaceChemistryShapes.json';

describe('Ketcher2', () => {
  beforeEach(async () => {
    resetStore();
    templateListSetter(templates);
  });

  afterEach(() => {
    resetStore();
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
      assert.strictEqual(allNodes.length, 4, 'allNodes have invalid length');
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
      assert.strictEqual(allNodes.length, 3, 'all collected nodes');
      assert.strictEqual(allAtoms.length, 1, 'all collected atoms');
      assert.strictEqual(imagesList.length, 1, 'all collected imagesList');
    });
    it('should not have a polymer list', async () => {
      const polymerTag = await hasKetcherData(molfileWithoutPolymerList);
      const { molfileData } = await addPolymerTags(polymerTag, oneNodeNonPolymerKet);
      await loadKetcherData(molfileData);
      assert.notStrictEqual(molfileData, null, 'list of polymers can not be null');
      assert.strictEqual(allNodes.length, 1, 'all collected nodes');
      assert.strictEqual(allAtoms.length, 2, 'all collected atoms');
      assert.strictEqual(imagesList.length, 0, 'all collected atoms');
    });
  });

  describe('on add atom', () => {
    it('should have valid mols, image and text list:last atom updated', async () => {
      await latestDataSetter(addAtomMockup);
      await loadKetcherData(addAtomMockup);
      const aliasListWithAtom = [];
      let modifiedAlias = null;
      const { d, isConsistent } = await handleAddAtom();
      Object.values(d).forEach((i) =>
        i?.atoms?.forEach((j) => {
          if (j?.alias) {
            aliasListWithAtom.push(j.alias);
          }
        })
      );
      await loadKetcherData(d);
      modifiedAlias = ALIAS_PATTERNS.threeParts.test(aliasListWithAtom[aliasListWithAtom.length - 1]);
      assert.strictEqual(isConsistent, true, 'mols should be a list');
      assert.strictEqual(modifiedAlias, true, 'last modified alias should be of three parts now');
      assert.strictEqual(addAtomMockup.root.nodes.length, 9, 'nodes should have an image added');
      assert.strictEqual(allNodes.length, 9, 'allNodes should have a right count');
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

    it('should handle invalid atom data gracefully', async () => {
      const invalidAtomMockup = { ...addAtomMockup, mols: [{ atoms: [{ alias: null }] }] };
      await latestDataSetter(invalidAtomMockup);
      await loadKetcherData(invalidAtomMockup);

      const { d, isConsistent } = await handleAddAtom();
      assert.strictEqual(isConsistent, true, 'Invalid atom data should not be consistent');
      assert.notEqual(d, null, 'Data should be null for invalid atom data');
    });

    it('should add an atom to an empty molecule', async () => {
      await loadKetcherData(emptyKet);
      await latestDataSetter(emptyKet);

      const { d, isConsistent } = await handleAddAtom();
      assert.strictEqual(isConsistent, true, 'Atom addition should be consistent');
      assert.strictEqual(mols.length, 0, 'A new molecule should be created');
      assert.strictEqual(d[mols[0]], undefined, 'The molecule should contain one atom');
    });

    it('should handle empty data gracefully', async () => {
      const emptyData = null;

      const { d, isConsistent } = await handleAddAtom(emptyData);
      assert.strictEqual(d, null, 'Data should remain null for empty input');
      assert.strictEqual(isConsistent, false, 'Consistency should be false for empty input');
    });

    it('should generate a unique alias for duplicate atom', async () => {
      const duplicateAliasMockup = { ...addAtomMockup };

      await latestDataSetter(duplicateAliasMockup);
      await loadKetcherData(duplicateAliasMockup);

      const { d, isConsistent } = await handleAddAtom();
      const aliasList = [];
      Object.values(d).forEach((i) =>
        i?.atoms?.forEach((j) => {
          if (ALIAS_PATTERNS.threeParts.test(j.alias)) {
            aliasList.push(j.alias);
          }
        })
      );
      const uniqueAliases = new Set(aliasList);
      assert.strictEqual(isConsistent, true, 'Atom addition should be consistent');
      assert.strictEqual(aliasList.length, uniqueAliases.size, 'All aliases should be unique');
    });

    it('should add an atom to a molecule with bonds', async () => {
      await loadKetcherData(twoMolsOneImageOneAtomWithWithoutAlias);
      await latestDataSetter(twoMolsOneImageOneAtomWithWithoutAlias);

      const { d, isConsistent } = await handleAddAtom();
      assert.strictEqual(isConsistent, true, 'Atom addition should be consistent');
      assert.strictEqual(d[mols[0]].atoms.length, 2, 'The molecule should contain one additional atom');
      assert.strictEqual(d[mols[0]].bonds.length, 1, 'The molecule should retain its bonds');
    });

    it('should generate a valid alias for an atom with an invalid alias format', async () => {
      const invalidAliasMockup = { ...addAtomMockup };
      invalidAliasMockup.mol0.atoms.push({ alias: 'invalid_alias' });

      await latestDataSetter(invalidAliasMockup);
      await loadKetcherData(invalidAliasMockup);

      const { d, isConsistent } = await handleAddAtom();
      const aliasList = [];
      Object.values(d).forEach((i) => i?.atoms?.forEach((j) => aliasList.push(j.alias)));

      aliasList.forEach((alias) => {
        if (ALIAS_PATTERNS.threeParts.test(alias)) {
          assert.strictEqual(
            ALIAS_PATTERNS.threeParts.test(alias),
            true,
            'All aliases should match the expected format'
          );
        }
      });
      assert.strictEqual(isConsistent, false, 'Atom addition should be consistent');
    });
  });

  describe('on single-image delete of template', async () => {
    it('should delete and update alias with image-count', async () => {
      await loadKetcherData(oneImageKet);
      await latestDataSetter(oneImageKet);
      await imageUsedCounterSetter(0);
      const aliasDifferences = [0];
      const collectedAliases = [];

      let data = await removeAtomFromData(latestData, aliasDifferences);
      data = await handleOnDeleteAtom(aliasDifferences, data, []);
      await loadKetcherData(data);

      Object.values(data).forEach((i) =>
        i?.atoms?.forEach((j) => {
          if (j?.alias) {
            collectedAliases.push(j.alias);
          }
        })
      );
      assert.deepStrictEqual(collectedAliases, [], 'nodes should be equal to sum of mols and images list');
      assert.deepStrictEqual(imagesList, [], 'image list should be cleared');
    });

    it('should delete complete mol when there are not bonds and only atom with alias', async () => {
      await loadKetcherData(isMoleculeEmptyKet);
      await latestDataSetter(isMoleculeEmptyKet);
      const aliasDifferences = [0];
      await imageUsedCounterSetter(0);
      const collectedAliases = [];

      let data = await removeAtomFromData(latestData, aliasDifferences);
      data = await handleOnDeleteAtom(aliasDifferences, data, imagesList);
      Object.values(data).forEach((i) =>
        i?.atoms?.forEach((j) => {
          if (j?.alias) {
            collectedAliases.push(j.alias);
          }
        })
      );
      const matchImages = imagesList.length === 0 ? 0 : imagesList.length - 1;
      assert.strictEqual(
        matchImages,
        imageNodeCounter,
        'images left in the canvas should be equal to used image counter'
      );
      assert.deepStrictEqual(data, emptyKet, 'Latest molfile should be empty');
    });

    it('should skip deletion for non-existent alias', async () => {
      await loadKetcherData(addAtomMockup);
      await latestDataSetter(addAtomMockup);

      const aliasDifferences = [999]; // Non-existent alias
      const data = await handleOnDeleteAtom(aliasDifferences, latestData, imagesList);

      assert.deepStrictEqual(data, addAtomMockup, 'Data should remain unchanged for non-existent alias');
    });
  });

  describe('on multi-image delete of template', async () => {
    it('should delete and update alias with image-count', async () => {
      await loadKetcherData(deleteImageWithThreeOldPack);
      await latestDataSetter(deleteImageWithThreeOldPack);
      await imageUsedCounterSetter(2);
      const collectedAliases = [];
      const imageDifferences = await deepCompareContent(oldImagePackThree, imagesList);

      let data = await removeAtomFromData(latestData, imageDifferences);
      data = await handleOnDeleteAtom([0, 1], data, imagesList);
      Object.values(data).forEach((i) =>
        i?.atoms?.forEach((j) => {
          if (j?.alias) {
            collectedAliases.push(j.alias);
          }
        })
      );
      assert.deepStrictEqual(collectedAliases, ['t_01_0'], 'Remaining alias should be with 0');
      assert.deepStrictEqual(imagesList.length, 1, 'Remaining alias should be 2');
    });

    it('should delete an image with multiple references', async () => {
      await loadKetcherData(deleteImageWithThreeOldPack);
      await latestDataSetter(deleteImageWithThreeOldPack);

      const imageDifferences = [0, 1]; // Images to be deleted
      const data = await removeAtomFromData(latestData, imageDifferences);
      assert.strictEqual(imagesList.length, 1, 'Remaining images should be updated');
      assert.strictEqual(data.root.nodes.length, 1, 'Molecules should remain intact');
    });
  });

  describe('on delete atom', async () => {
    it('update alias with image-count and decrease image-used-counter by number of atoms removed.', async () => {
      await loadKetcherData(deleteAtomAndRemoveImageKet);
      await latestDataSetter(deleteAtomAndRemoveImageKet);
      await imageUsedCounterSetter(0);

      let data = await removeAtomFromData(latestData, [0]);
      data = await handleOnDeleteAtom([0], data, imagesList);
      assert.deepStrictEqual(data, emptyKet, 'ket should be empty');
    });

    it('should delete all atoms and remove the molecule', async () => {
      await loadKetcherData(oneImageKet);
      await latestDataSetter(oneImageKet);

      const aliasDifferences = [0, 1, 2]; // All aliases in the molecule
      const data = await handleOnDeleteAtom(aliasDifferences, latestData, imagesList);

      assert.strictEqual(mols.length, 0, 'All molecules should be removed');
      assert.strictEqual(data.root.nodes.length, 1, 'All nodes should be removed');
    });

    it('should delete an atom and update bonds', async () => {
      await loadKetcherData(twoMolsOneImageOneAtomWithWithoutAlias);
      await latestDataSetter(twoMolsOneImageOneAtomWithWithoutAlias);

      const aliasDifferences = [0]; // Alias to be deleted
      const data = await handleOnDeleteAtom(aliasDifferences, latestData, imagesList);
      assert.strictEqual(data[mols[0]].bonds.length, 1, 'Bonds should be updated after atom deletion');
      assert.strictEqual(data[mols[0]].atoms.length, 2, 'Atom count should decrease');
    });
  });

  describe('on reset', async () => {
    it('should restore state after reset', async () => {
      resetStore();
      assert.strictEqual(allAtoms.length, 0, 'All atoms should be cleared');
      assert.strictEqual(allNodes.length, 0, 'All nodes should be cleared');
      assert.strictEqual(imagesList.length, 0, 'Images list should be cleared');
      await loadKetcherData(addAtomMockup);
      assert.strictEqual(allAtoms.length, 15, 'All atoms should be restored');
    });
  });
});
