/* eslint-disable radix */
/* eslint-disable no-restricted-syntax */
/* eslint-disable no-plusplus */
/* eslint-disable no-await-in-loop */
/* eslint-disable no-param-reassign */
import {
  getTemplateType, initializeKetcherData, templateWithBoundingBox,
  fetchKetcherData
} from 'src/utilities/ketcherSurfaceChemistry/InitializeAndParseKetcher';
import {
  imageNodeCounter, imageUsedCounterSetter,
  latestData,
} from 'src/components/structureEditor/KetcherEditor';
import {
  ALIAS_PATTERNS, KET_TAGS,
} from 'src/utilities/ketcherSurfaceChemistry/constants';
import {
  mols,
  textNodeStruct,
  textNodeStructSetter,
  imagesList,
  allAtoms,
  deletedAtomsSetter
} from 'src/utilities/ketcherSurfaceChemistry/stateManager';
import {
  isAliasConsistent,
  deepCompare,
  deepCompareNumbers,
} from 'src/utilities/ketcherSurfaceChemistry/TextNode';
import {
  prepareImageFromTemplateList,
  findTemplateByPayload
} from 'src/utilities/ketcherSurfaceChemistry/Ketcher2SurfaceChemistryUtils';

// Helper to update an atom with K2SC labels and aliases
const updateAtom = (atomLocation, templateType, imageCounter) => ({
  label: KET_TAGS.inspiredLabel,
  alias: `t_${templateType}_${imageCounter}`,
  location: atomLocation
});

// helper function to process ketcher-rails files and adding image to ketcher canvas
const addingPolymersToKetcher = async (railsPolymersList, data) => {
  try {
    const polymerList = railsPolymersList.split(' ');
    let visitedAtoms = 0;
    const collectedImages = [];
    await initializeKetcherData(data);

    // eslint-disable-next-line no-restricted-syntax
    for (const molName of mols) {
      const molecule = data[molName];
      for (let atomIndex = 0; atomIndex < molecule.atoms.length; atomIndex++) {
        const atom = molecule.atoms[atomIndex];
        const polymerItem = polymerList[visitedAtoms];
        const aliasPass = (
          atom.type === KET_TAGS.rgLabel
          || atom.label === KET_TAGS.inspiredLabel
          || ALIAS_PATTERNS.threeParts.test(atom.alias)
        );
        if (polymerItem && aliasPass) {
          // counters
          imageUsedCounterSetter(imageNodeCounter + 1);
          visitedAtoms += 1;
          // step 1: get template type
          const { type: templateType, size: templateSize } = getTemplateType(polymerItem);
          // step 2: update atom with alias
          data[molName].atoms[atomIndex] = updateAtom(atom.location, templateType, imageNodeCounter);
          // step 3: sync bounding box with atom location
          const newTemplate = await templateWithBoundingBox(templateType, atom.location, templateSize);
          // step 4: add to the list
          collectedImages.push(newTemplate);
        }
      }
    }
    return { c_images: collectedImages, molfileData: data };
  } catch (err) {
    console.error({ err: err.message });
    return { c_images: [], molfileData: data };
  }
};

// filter out mol-node from ket2 format
const removeMoleculeFromData = (data, molKey) => data.root.nodes.filter((node) => node.$ref !== molKey);

// filter images from nodes
const removeImagesFromData = (data) => data.root.nodes.filter((node) => node.type !== 'image');

// filter images from nodes
const removeTextFromData = (data) => data.root.nodes.filter((node) => node.type !== 'text');

// helper function to remove bonds by atom id
const updateBondList = async (indexList, bondList, atomList) => {
  const removedIndices = [...indexList].sort((a, b) => a - b);
  const atomCount = atomList?.length ?? 0;
  const result = [];

  for (const bond of bondList) {
    if (!bond.atoms.some((i) => removedIndices.includes(i))) {
      const adjustedAtoms = bond.atoms.map((atom) => {
        const shift = removedIndices.filter((removed) => removed < atom).length;
        return atom - shift;
      });
      if (adjustedAtoms.every((i) => i >= 0 && i < atomCount)) {
        result.push({ ...bond, atoms: adjustedAtoms });
      }
    }
  }
  return result;
};

// helper function to remove template by atom with alias
const handleOnDeleteAtom = async (missingNumbers, data, imageL) => {
  try {
    const textNodeStructureCopy = { ...textNodeStruct };
    const structureKeys = Object.keys(textNodeStruct);
    structureKeys?.forEach((i) => {
      const split = parseInt(i.split('_')[2]);
      const missingIndex = missingNumbers.indexOf(split);
      if (missingIndex !== -1) {
        delete textNodeStructureCopy[i];
      }
    });

    for (const molKey of mols) {
      const mol = data[molKey];
      if (mol && mol?.atoms) {
        for (const atom of mol.atoms) {
          if (ALIAS_PATTERNS.threeParts.test(atom?.alias)) {
            const previousAlias = atom.alias;
            const atomSplits = previousAlias.split('_');
            const currentAlias = parseInt(atomSplits[2]);

            // Count how many missing numbers are LESS than the current alias
            const missingCount = missingNumbers.filter((num) => num <= currentAlias).length;
            if (missingCount > 0) {
              let newAlias = currentAlias - missingCount;
              if (newAlias < 0) newAlias = 0;
              atom.alias = `t_${atomSplits[1]}_${newAlias}`;
              if (textNodeStructureCopy[previousAlias]) {
                textNodeStructureCopy[atom.alias] = textNodeStructureCopy[previousAlias];
                delete textNodeStructureCopy[previousAlias];
              }
            }
          }
        }
        data[molKey] = mol;
      }
    }

    textNodeStructSetter(textNodeStructureCopy);
    data.root.nodes = data.root.nodes.filter((node) => node.type !== 'image');
    data.root.nodes.push(...imageL);
    return data;
  } catch (err) {
    console.error('handleDelete!!', err.message);
    return null;
  }
};

// remove atoms from the template-list with alias,
const removeAtomFromData = async (data, aliasToBeRemoved) => {
  try {
    for (const molKey of mols) {
      const molecule = data[molKey];
      if (molecule && molecule.atoms) {
        const atomList = molecule?.atoms || [];
        const atomListCopy = molecule?.atoms || [];
        const bondList = molecule?.bonds || [];
        const removeIndexList = [];

        for (let i = 0; i < atomListCopy.length; i++) {
          if (ALIAS_PATTERNS.threeParts.test(atomListCopy[i].alias)) {
            const split = parseInt(atomListCopy[i].alias.split('_')[2]);
            if (aliasToBeRemoved.indexOf(split) !== -1) {
              atomList.splice(i, 1);
              removeIndexList.push(i);
            }
            if (!atomList?.length) {
              data.root.nodes = removeMoleculeFromData(data, molKey);
              delete data[molKey];
            }
          }
        }

        if (removeIndexList.length && bondList.length) {
          data[molKey].bonds = await updateBondList(removeIndexList, bondList, atomList);
        }
        if (atomList.length) data[molKey].atoms = atomList;
      }
    }
    return data;
  } catch (err) {
    console.error('removeImageTemplateAtom', err.message);
    return data;
  }
};

// helper function to find atom in ket format by image idx referenced with alias 3rd part
const findAtomByImageIndex = async (imgIdx) => {
  for (const molName of mols) {
    const molecule = latestData[molName];
    for (let atomIndex = 0; atomIndex < molecule.atoms.length; atomIndex++) {
      const atom = molecule.atoms[atomIndex];
      if (ALIAS_PATTERNS.threeParts.test(atom.alias)) {
        const aliasLastPart = parseInt(atom.alias.split('_')[2]);
        if (imgIdx === aliasLastPart) return { atomLocation: atom.location, alias: atom.alias };
      }
    }
  }
  return { atomLocation: null, alias: '' };
};

// helper function to collect missing alias
const collectMissingAliases = async () => {
  const aliasList = [];
  for (let i = 0; i < mols.length; i++) {
    const { atoms } = latestData[mols[i]];
    for (let j = 0; j < atoms.length; j++) {
      const split = atoms[j]?.alias?.split('_')[2];
      if (split) {
        aliasList.push(parseInt(split));
      }
    }
  }
  return aliasList;
};

// helper function set image coordinates
const adjustAtomCoordinates = (imageCoordinates) => {
  const centerX = imageCoordinates.width / 2;
  const centerY = imageCoordinates.height / 2;
  const centerZ = imageCoordinates.z || 0; // defaulting z to 0 if it's not defined
  return [imageCoordinates.x + centerX, imageCoordinates.y - centerY, centerZ];
};

/* IMP: helper function when new atom is added or rebase for alias
  -> Two parts => t_01 => will always be new template added from the template list
  -> Three parts => t_templateid_used_image_counter
    ----- possible cases
  -> two part with image -> is an event when a new template is added to canvas as new molecule
  -> two parts with no image -> is an event when a new template is directly added to other molecule
  -> three part with image -> can be a regular case when an atom with 3 three part aliases is pasted on canvas or can a saved template
  -> three part without image -> in case there the canvas is not synced an image is there
    ----- notes
  -> tbr -> flag means this atom has to removed from the list coming from the template
  -> isAliasConsistent before returning -> is a function to make sure all aliases generated are in order 0,1,2,3,4,5,6...
  */
const addAtomAliasHelper = async (processedAtoms) => {
  try {
    const newImageNodes = [...imagesList];
    imageUsedCounterSetter(processedAtoms.length - 1);
    for (let m = 0; m < mols.length; m++) {
      const mol = latestData[mols[m]];
      const removableIndices = [];
      for (let a = 0; a < mol?.atoms?.length; a++) {
        const atom = mol.atoms[a];
        const splits = atom?.alias?.split('_');
        // label A with three part alias
        if (ALIAS_PATTERNS.twoParts.test(atom.alias)) {
          imageUsedCounterSetter(imageNodeCounter + 1);

          if (!newImageNodes[imageNodeCounter]) {
            // eslint-disable-next-line no-await-in-loop
            const img = await prepareImageFromTemplateList(parseInt(splits[1]), atom.location);
            newImageNodes.push(img);
          }
          atom.alias += `_${imageNodeCounter}`;
          processedAtoms.push(`${m}_${a}_${imageNodeCounter}`);
        } else if (ALIAS_PATTERNS.threeParts.test(atom.alias)) {
          if (processedAtoms.indexOf(`${m}_${a}_${splits[2]}`) !== -1) {
            // add image if image doesn't exists
            if (!newImageNodes[imageNodeCounter]) {
              // eslint-disable-next-line no-await-in-loop
              const img = await prepareImageFromTemplateList(parseInt(splits[1]), atom.location);
              newImageNodes.push(img);
            }
          } else {
            imageUsedCounterSetter(imageNodeCounter + 1);
            atom.alias = `t_${splits[1]}_${imageNodeCounter}`;
            processedAtoms.push(`${m}_${a}_${imageNodeCounter}`);
          }
        }
        if (atom.label === 'tbr') {
          removableIndices.push(atom);
        }
      }
      if (removableIndices.length) {
        mol.atoms?.splice(mol.atoms.length - removableIndices.length, removableIndices.length);
        mol.bonds?.splice(mol.bonds.length - removableIndices.length, removableIndices.length);
      }
    }
    const d = { ...latestData };
    const molsList = removeImagesFromData(d);
    d.root.nodes = [...molsList, ...newImageNodes];
    return { d, isConsistent: isAliasConsistent() };
  } catch (err) {
    console.error('addAtomAliasHelper', err.message);
    return { d: null, isConsistent: false };
  }
};

// IMP: helper function to handle new atoms added to the canvas
export const handleAddAtom = async () => {
  const processedAtoms = [];
  imageUsedCounterSetter(-1);
  const seenThirdParts = new Set();

  for (let m = 0; m < mols.length; m++) {
    const mol = latestData[mols[m]];
    for (let a = 0; a < mol?.atoms?.length; a++) {
      const atom = mol.atoms[a];
      if (atom?.alias && ALIAS_PATTERNS.threeParts.test(atom?.alias)) {
        const splits = atom?.alias?.split('_');
        if (!seenThirdParts.has(splits[2])) {
          processedAtoms.push(`${m}_${a}_${splits[2]}`);
          seenThirdParts.add(splits[2]);
        }
      }
    }
  }
  return addAtomAliasHelper(processedAtoms);
};

export const eventCollectDeletedAtoms = (eventItem) => {
  let atomCount = -1;
  const deletedAtomsList = [];
  if (eventItem.label === KET_TAGS.inspiredLabel) {
    for (let m = 0; m < mols?.length; m++) {
      const mol = mols[m];
      const atoms = latestData[mol]?.atoms;
      for (let a = 0; a < atoms?.length; a++) {
        atomCount++;
        if (atomCount === eventItem.id) {
          deletedAtomsList.push(allAtoms[atomCount]);
        }
      }
    }
  }
  deletedAtomsSetter([...deletedAtomsList]);
};

const deepCompareContentImages = async (oldArray, newArray) => {
  if (!oldArray.length && !newArray.length) return [];
  const missingIndexes = [];
  for (let i = 0; i < oldArray.length; i++) {
    const oldItem = oldArray[i];
    let found = false;
    for (let j = 0; j < newArray.length; j++) {
      const newItem = newArray[j];
      const isMatch = oldItem.data === newItem.data
        && oldItem.boundingBox?.x === newItem.boundingBox?.x
        && oldItem.boundingBox?.y === newItem.boundingBox?.y;
      if (isMatch) {
        found = true;
        break;
      }
    }
    if (!found) {
      missingIndexes.push(i);
    }
  }
  return missingIndexes;
};

const analyzeAliasAndImageDifferences = async (editor, oldImagePack) => {
  const listOfAliasesBefore = await collectMissingAliases();
  await fetchKetcherData(editor);

  // 1st collect difference between old and new data to know what's removed
  const listOfAliasesAfter = await collectMissingAliases();
  const aliasDifferences = await deepCompareNumbers(listOfAliasesBefore, listOfAliasesAfter);
  const hasImageDifferences = await deepCompare(oldImagePack, imagesList);
  const imageDifferences = await deepCompareContentImages(oldImagePack, imagesList);

  return {
    aliasDifferences,
    hasImageDifferences,
    imageDifferences
  };
};

const filterImagesByDifferences = async (aliasDifferences) => {
  const filteredImages = [];
  for (let i = 0; i < imagesList.length; i++) {
    if (aliasDifferences.indexOf(i) !== -1) {
      const templateId = await findTemplateByPayload(imagesList[i].data);
      if (templateId == null) {
        filteredImages.push(imagesList[i]);
      }
    } else {
      filteredImages.push(imagesList[i]);
    }
  }
  return filteredImages;
};

export {
  updateAtom,
  addingPolymersToKetcher,
  removeMoleculeFromData,
  removeImagesFromData,
  removeTextFromData,
  updateBondList,
  handleOnDeleteAtom,
  removeAtomFromData,
  findAtomByImageIndex,
  collectMissingAliases,
  adjustAtomCoordinates,
  analyzeAliasAndImageDifferences,
  filterImagesByDifferences
};
