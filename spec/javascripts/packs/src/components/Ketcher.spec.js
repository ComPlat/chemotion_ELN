/* eslint-disable no-undef */
import assert from 'assert';
import {
  describe, it, beforeEach, afterEach
} from 'mocha';
import { addPolymerTags, templateAliasesPrepare } from 'src/utilities/ketcherSurfaceChemistry/PolymersTemplates';
import { ALIAS_PATTERNS } from 'src/utilities/ketcherSurfaceChemistry/constants';
import { deepCompareContent } from 'src/utilities/ketcherSurfaceChemistry/TextNode';
import { hasKetcherData, loadKetcherData } from 'src/utilities/ketcherSurfaceChemistry/InitializeAndParseKetcher';
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
  imagesListSetter,
} from 'src/utilities/ketcherSurfaceChemistry/stateManager';
import {
  handleAddAtom,
  handleOnDeleteAtom,
  removeAtomFromData,
} from 'src/utilities/ketcherSurfaceChemistry/AtomsAndMolManipulation';
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
  structureFirstBallSecondKet,
} from '../../../data/ketcher_mockups';
import templates from '../../../../../public/json/surfaceChemistryShapes.json';

describe('Ketcher', () => {
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
      const list = railsList
        .trim()
        .split(/\s+/)
        .filter((entry) => entry && entry !== '$$$$');
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
      Object.values(d).forEach((i) => i?.atoms?.forEach((j) => {
        if (j?.alias) {
          aliasListWithAtom.push(j.alias);
        }
      }));
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
      Object.values(d).forEach((i) => i?.atoms?.forEach((j) => {
        if (ALIAS_PATTERNS.threeParts.test(j.alias)) {
          aliasList.push(j.alias);
        }
      }));
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
      const aliasDifferences = [0];
      await imageUsedCounterSetter(0);
      const collectedAliases = [];

      let data = await removeAtomFromData(latestData, aliasDifferences);
      data = await handleOnDeleteAtom(aliasDifferences, data, imagesList);
      Object.values(data).forEach((i) => i?.atoms?.forEach((j) => {
        if (j?.alias) {
          collectedAliases.push(j.alias);
        }
      }));
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
      Object.values(data).forEach((i) => i?.atoms?.forEach((j) => {
        if (j?.alias) {
          collectedAliases.push(j.alias);
        }
      }));
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

  // ─────────────────────────────────────────────────────────────────────────
  // templateAliasesPrepare — save path index fix
  // ─────────────────────────────────────────────────────────────────────────
  describe('templateAliasesPrepare — save path', () => {
    beforeEach(() => {
      imagesListSetter([
        { boundingBox: { height: 1.0, width: 1.0 } },
        { boundingBox: { height: 2.0, width: 2.0 } },
      ]);
    });

    it('uses image counter (from alias) when atomIndexList is omitted — legacy behaviour', async () => {
      const result = await templateAliasesPrepare(['t_95_0']);
      assert.strictEqual(result, '0/95/1.00-1.00');
    });

    it('uses image counter when atomIndexList is an empty array — explicit empty fallback', async () => {
      const result = await templateAliasesPrepare(['t_95_0'], []);
      assert.strictEqual(result, '0/95/1.00-1.00');
    });

    // Regression guard: old code always used the alias image counter (0) as the stored atom
    // index. When the ball was drawn after a structure (atom index > 0), the wrong atom was
    // targeted on reload and the ball was lost.
    it('uses actual atom index from atomIndexList when provided — Bug A fix', async () => {
      const result = await templateAliasesPrepare(['t_95_0'], [3]);
      assert.strictEqual(result, '3/95/1.00-1.00');
    });

    it('structure-first scenario: N=5 atoms, ball at atom 5 → stored as index 5', async () => {
      imagesListSetter([{ boundingBox: { height: 1.5, width: 1.5 } }]);
      const result = await templateAliasesPrepare(['t_95_0'], [5]);
      assert.strictEqual(result, '5/95/1.50-1.50');
    });

    it('two balls: each uses its own actual atom index (not both zero)', async () => {
      const result = await templateAliasesPrepare(['t_95_0', 't_95_1'], [0, 4]);
      assert.strictEqual(result, '0/95/1.00-1.00 4/95/2.00-2.00');
    });

    it('surface template (templateId=96) appends "s" suffix instead of /templateId', async () => {
      const result = await templateAliasesPrepare(['t_96_0'], [2]);
      assert.strictEqual(result, '2s/1.00-1.00');
    });

    it('returns empty string when aliasesList is empty', async () => {
      const result = await templateAliasesPrepare([], []);
      assert.strictEqual(result, '');
    });

    it('skips aliases that do not match the threeParts pattern', async () => {
      const result = await templateAliasesPrepare(['invalid', 't_95_0'], [7]);
      assert.strictEqual(result, '7/95/1.00-1.00');
    });

    it('atomIndexList shorter than aliasesList falls back to alias image counter for extras', async () => {
      const result = await templateAliasesPrepare(['t_95_0', 't_95_1'], [9]);
      assert.strictEqual(result, '9/95/1.00-1.00 1/95/2.00-2.00');
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // addPolymerTags — load path: structure-first-ball-second
  // ─────────────────────────────────────────────────────────────────────────
  describe('addPolymerTags — structure-first-ball-second load path', () => {
    // structureFirstBallSecondKet: mol0 has 6 C atoms (indices 0-5) + 1 R# at index 6.
    // PolymersList "6/95/1.00-1.00" means: atom at index 6 carries a bead (template 95).
    //
    // IMPORTANT: addPolymerTags mutates its data argument (pushes image nodes into root.nodes
    // and updates atoms in place). Each test must deep-copy the fixture so mutations from one
    // test do not bleed into subsequent tests.
    const freshKet = () => JSON.parse(JSON.stringify(structureFirstBallSecondKet));

    it('restores the polymer ball when atom index > 0 in PolymersList', async () => {
      const { molfileData } = await addPolymerTags('6/95/1.00-1.00', freshKet());
      await loadKetcherData(molfileData);

      assert.strictEqual(imagesList.length, 1, 'ball should be restored (1 image in imagesList)');
      assert.strictEqual(allAtoms.length, 7, 'all 7 atoms must be present after load');

      // The R# atom at index 6 must now carry the alias assigned by addingPolymersToKetcher.
      const mol = molfileData[mols[0]];
      const ballAtom = mol?.atoms[6];
      assert.ok(
        ALIAS_PATTERNS.threeParts.test(ballAtom?.alias),
        `atom[6] must have a t_XX_XX alias, got: "${ballAtom?.alias}"`
      );
    });

    // Documents the original bug: storing index 0 targets a plain C atom which fails
    // aliasPass → no image collected → ball silently lost.
    it('does NOT restore the ball when the stored index points to a plain C atom (bug scenario)', async () => {
      // Wrong PolymersList: index 0 points at a C atom, not the R# at index 6.
      const { molfileData } = await addPolymerTags('0/95/1.00-1.00', freshKet());
      await loadKetcherData(molfileData);

      assert.strictEqual(
        imagesList.length,
        0,
        'C atom at index 0 fails aliasPass → no ball restored (demonstrates original bug)'
      );
    });

    it('handles two balls: one drawn first (index 0) and one drawn later (index 6)', async () => {
      const twoBeadKet = {
        root: { nodes: [{ $ref: 'mol0' }], connections: [], templates: [] },
        mol0: {
          type: 'molecule',
          atoms: [
            { label: 'R#', location: [1.0, 0.0, 0] }, // ball first, index 0
            { label: 'C', location: [2.0, 0.0, 0] },
            { label: 'C', location: [3.0, 0.0, 0] },
            { label: 'C', location: [4.0, 0.0, 0] },
            { label: 'C', location: [5.0, 0.0, 0] },
            { label: 'C', location: [6.0, 0.0, 0] },
            { label: 'R#', location: [7.0, 0.0, 0] }  // ball second, index 6
          ],
          bonds: []
        }
      };

      const { molfileData } = await addPolymerTags('0/95/1.00-1.00 6/95/1.00-1.00', twoBeadKet);
      await loadKetcherData(molfileData);

      assert.strictEqual(imagesList.length, 2, 'both balls must be restored');
    });
  });
});
