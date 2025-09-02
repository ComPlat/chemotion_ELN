/* eslint-disable no-restricted-syntax */
/* eslint-disable no-plusplus */
import { KET_TAGS } from 'src/utilities/ketcherSurfaceChemistry/constants';
import {
  imagesList, mols, textList, textNodeStruct,
} from 'src/utilities/ketcherSurfaceChemistry/stateManager';
import { latestData } from 'src/components/structureEditor/KetcherEditor';
import {
  removeTextFromData,
} from 'src/utilities/ketcherSurfaceChemistry/AtomsAndMolManipulation';
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
const findByKeyAndUpdateTextNodePosition = async (textNodeKey, atom) => {
  for (let textIdx = 0; textIdx < textList.length; textIdx++) {
    const text = textList[textIdx];
    const content = JSON.parse(text.data.content); // Parse content
    if (content.blocks[0].key === textNodeKey) {
      const split = atom.alias.split('_')[2];
      const positionX = (atom.location[0] + imagesList[split].boundingBox.width / 2);
      text.data.position = {
        x: positionX,
        y: atom.location[1],
        z: atom.location[2]
      };
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
const filterTextList = async (aliasDifferences, data) => {
  const keys = Object.values(textNodeStruct);
  const valueList = [];
  if (aliasDifferences.length) {
    textList.forEach((item) => {
      if (keys.indexOf(JSON.parse(item.data.content).blocks[0].key) !== -1) {
        valueList.push(item);
      }
    });
    return [...removeTextFromData(data), ...valueList];
  }
  return [...removeTextFromData(data)];
};

export {
  addTextNodes,
  isAliasConsistent,
  findByKeyAndUpdateTextNodePosition,
  deepCompare,
  deepCompareNumbers,
  deepCompareContent,
  filterTextList
};
