/* eslint-disable no-restricted-syntax */
/* eslint-disable no-plusplus */
import { KET_TAGS, ALIAS_PATTERNS } from 'src/utilities/ketcherSurfaceChemistry/constants';
import {
  imagesList, mols, textList, textNodeStruct,
} from 'src/utilities/ketcherSurfaceChemistry/stateManager';
import { latestData } from 'src/components/structureEditor/KetcherEditor';
import {
  removeTextFromData,
} from 'src/utilities/ketcherSurfaceChemistry/AtomsAndMolManipulation';

// Calculate available space on left and right sides of an atom/image
// Returns { left: number, right: number } representing distance to nearest obstacle
const calculateAvailableSpace = (atomLocation, imageWidth, currentImageIndex) => {
  const atomX = atomLocation[0];
  const atomY = atomLocation[1];
  const verticalThreshold = 2.0; // Only consider obstacles within this Y range

  let leftSpace = Infinity;
  let rightSpace = Infinity;

  // Check distance to other images
  for (let i = 0; i < imagesList.length; i++) {
    if (i === parseInt(currentImageIndex, 10)) continue; // Skip current image

    const img = imagesList[i];
    if (!img?.boundingBox) continue;

    const imgCenterX = img.boundingBox.x + img.boundingBox.width / 2;
    const imgCenterY = img.boundingBox.y - img.boundingBox.height / 2;

    // Only consider images that are roughly on the same horizontal level
    if (Math.abs(imgCenterY - atomY) > verticalThreshold) continue;

    const horizontalDistance = imgCenterX - atomX;

    if (horizontalDistance > 0) {
      // Image is to the right
      const edgeDistance = horizontalDistance - imageWidth / 2 - img.boundingBox.width / 2;
      rightSpace = Math.min(rightSpace, edgeDistance);
    } else {
      // Image is to the left
      const edgeDistance = Math.abs(horizontalDistance) - imageWidth / 2 - img.boundingBox.width / 2;
      leftSpace = Math.min(leftSpace, edgeDistance);
    }
  }

  // Check distance to other atoms (non-template atoms that might be part of molecules)
  for (const molKey of mols) {
    const mol = latestData[molKey];
    if (!mol?.atoms) continue;

    for (const atom of mol.atoms) {
      if (!atom?.location) continue;
      // Skip atoms that are part of template images (they have aliases)
      if (ALIAS_PATTERNS.threeParts.test(atom?.alias)) continue;

      const otherX = atom.location[0];
      const otherY = atom.location[1];

      // Only consider atoms that are roughly on the same horizontal level
      if (Math.abs(otherY - atomY) > verticalThreshold) continue;

      const horizontalDistance = otherX - atomX;
      const atomRadius = 0.5; // Approximate radius of an atom

      if (horizontalDistance > 0) {
        // Atom is to the right
        const edgeDistance = horizontalDistance - imageWidth / 2 - atomRadius;
        rightSpace = Math.min(rightSpace, edgeDistance);
      } else if (horizontalDistance < 0) {
        // Atom is to the left
        const edgeDistance = Math.abs(horizontalDistance) - imageWidth / 2 - atomRadius;
        leftSpace = Math.min(leftSpace, edgeDistance);
      }
    }
  }

  return { left: leftSpace, right: rightSpace };
};

// Determine which side (left or right) has more space for text placement
// Returns 'left' or 'right'
const determineBestSide = (atomLocation, imageWidth, currentImageIndex, textWidth = 1.0) => {
  const { left, right } = calculateAvailableSpace(atomLocation, imageWidth, currentImageIndex);

  // Add a small bias towards right side (original behavior) when spaces are similar
  const rightBias = 0.3;

  // If right side has enough space (considering the bias), prefer right
  if (right >= textWidth + rightBias || right >= left) {
    return 'right';
  }

  return 'left';
};
// for text component
const forTextNodeHeader = (key, description) => JSON.stringify({
  blocks: [
    {
      key,
      text: description,
      type: 'unstyled',
      depth: 0,
      inlineStyleRanges: [],
      entityRanges: [],
      data: {},
    }
  ],
  entityMap: {}
});

// generating images for ket2 format from molfile polymers list
const addTextNodes = async (textNodes) => textNodes.map((item) => {
  const [, key, alias, description] = item.split(KET_TAGS.textIdentifier);
  if (alias && key) {
    textNodeStruct[alias] = key;
    const content = forTextNodeHeader(key, description);
    return {
      type: 'text',
      data: {
        content,
        position: {
          x: 10.325000000000001,
          y: -11.325000000000001,
          z: 0
        },
        pos: []
      }
    };
  }
  return null;
});

// helper function to test alias list consistency 0,1,2,3,4...
const isAliasConsistent = () => {
  const indicesList = [];
  mols.forEach((mol) => {
    const molecule = latestData[mol];
    const atoms = molecule?.atoms;

    atoms?.forEach((item) => {
      if (item.alias) {
        const splits = item.alias.split('_');
        const index = parseInt(splits[2], 10);

        // Check for duplicates
        if (indicesList.indexOf(index) === -1) {
          indicesList.push(index);
        }
      }
    });
  });

  indicesList.sort((a, b) => a - b);
  for (let i = 0; i < indicesList.length; i++) {
    if (indicesList[i] !== i) {
      return false; // Missing or incorrect number sequence
    }
  }
  return true; // Passed all checks
};

// find by key and update text node position from alias matching atoms
// Now with dynamic side selection - places text on left or right based on available space
const findByKeyAndUpdateTextNodePosition = async (textNodeKey, atom) => {
  for (let textIdx = 0; textIdx < textList.length; textIdx++) {
    const text = textList[textIdx];
    const content = JSON.parse(text.data.content); // Parse content
    if (content.blocks[0].key === textNodeKey) {
      const split = atom.alias.split('_')[2];
      const imageWidth = imagesList[split].boundingBox.width;

      // Estimate text width based on content length (rough approximation)
      const textContent = content.blocks[0].text || '';
      const estimatedTextWidth = Math.max(1.0, textContent.length * 0.15);

      // Determine best side for text placement
      const bestSide = determineBestSide(atom.location, imageWidth, split, estimatedTextWidth);

      let positionX;
      if (bestSide === 'right') {
        // Place text on right side (original behavior)
        positionX = (atom.location[0] + imageWidth / 2) + 0.1;
      } else {
        // Place text on left side - need to offset by text width (with extra spacing)
        positionX = (atom.location[0] - imageWidth / 2) - estimatedTextWidth - 0.17;
      }

      text.data.position = {
        x: positionX,
        y: atom.location[1],
        z: atom.location[2]
      };
      // Update pos array to match new position
      text.data.pos = [
        { x: positionX, y: atom.location[1], z: atom.location[2] },
        { x: positionX, y: atom.location[1] - 0.375, z: atom.location[2] },
        { x: positionX + 0.71724853515625, y: atom.location[1] - 0.375, z: atom.location[2] },
        { x: positionX + 0.71724853515625, y: atom.location[1], z: atom.location[2] }
      ];
      return text;
    }
  }
  return null;
};

// compare 2 array and fetch index content
const deepCompareContent = async (oldArray, newArray) => {
  const missingIndexes = [];
  let shift = 0; // Tracks how much newArray is shifted

  for (let i = 0; i < oldArray.length; i++) {
    const newIndex = i - shift; // Adjust index based on shift

    if (!newArray[newIndex] || oldArray[i].data !== newArray[newIndex].data) {
      missingIndexes.push(i);
      shift++; // Increase shift since an element is missing or changed
    }
  }
  return missingIndexes;
};

// compare two arrays to find index changed differences
const deepCompare = async (oldArray, newArray) => {
  const maxLength = Math.max(oldArray.length, newArray.length);
  for (let i = 0; i < maxLength; i++) {
    if (oldArray[i]?.data !== newArray[i]?.data) {
      return true;
    }
  }
  return false;
};

// compare two arrays to find index changed differences
const deepCompareNumbers = async (oldArray, newArray) => {
  const newSet = new Set(newArray);
  return [...oldArray.filter((value) => !newSet.has(value))];
};

// filter text nodes by key, key as in text key
const filterTextList = async (_aliasDifferences, data) => {
  const activeKeys = new Set(Object.values(textNodeStruct));
  if (!activeKeys.size) {
    return removeTextFromData(data);
  }

  const retainedTextNodes = textList.filter((item) => {
    const { key } = JSON.parse(item.data.content).blocks[0];
    return activeKeys.has(key);
  });

  return [...removeTextFromData(data), ...retainedTextNodes];
};

export {
  addTextNodes,
  isAliasConsistent,
  findByKeyAndUpdateTextNodePosition,
  deepCompare,
  deepCompareNumbers,
  deepCompareContent,
  filterTextList,
  calculateAvailableSpace,
  determineBestSide
};
