/* eslint-disable no-underscore-dangle */
/* eslint-disable no-await-in-loop */
/* eslint-disable no-plusplus */
/* eslint-disable radix */
/* eslint-disable no-use-before-define */
/* eslint-disable no-restricted-syntax */
/* eslint-disable no-param-reassign */
/* eslint-disable import/no-mutable-exports */
import PropTypes from 'prop-types';
import React, {
  useEffect, useRef, useImperativeHandle, forwardRef,
  useState
} from 'react';
import {
  // methods
  hasKetcherData,
  addingPolymersToKetcher,
  prepareImageFromTemplateList,
  removeImageTemplateAtom,
  reAttachPolymerList,
  removeImagesFromData,

  // DOM Methods
  attachListenerForTitle,
  updateImagesInTheCanvas,
  updateTemplatesInTheCanvas,
  makeTransparentByTitle,

  // setters
  ImagesToBeUpdatedSetter,
  allowProcessingSetter,

  // constants
  ALIAS_PATTERNS,
  LAYERING_FLAGS,
  KET_TAGS,

  // flags
  ImagesToBeUpdated,
  allowProcessing,
  fetchSurfaceChemistryImageData
} from 'src/utilities/Ketcher2SurfaceChemistryUtils';
import { PolymerListIconKetcherToolbarButton, PolymerListModal, rescaleToolBarButoon } from 'src/components/structureEditor/PolymerListModal';
import { addTextNodeDescriptionOnTextPopup, findAtomByImageIndex, hasTextNodes, redoKetcher, removeTextFromData, undoKetcher } from '../../utilities/Ketcher2SurfaceChemistryUtils';

export let FILOStack = []; // a stack to main a list of event triggered
export const uniqueEvents = new Set(); // list of unique event from the canvas
export let latestData = null; // latestData contains the updated ket2 format always
export let imagesList = []; // image list has all nodes matching type === image
export let mols = []; // mols has list of molecules present in ket2 format ['mol0', 'mol1']
export let allNodes = []; // contains a list of latestData.root.nodes list
export let allAtoms = []; // contains list of all atoms present in a ketcher2 format
export let imageNodeCounter = -1; // counter of how many images are used/present in data.root.nodes
export let reloadCanvas = false; // flag to re-render canvas
export let canvasSelection = null; // contains list of images, atoms, bonds selected in the canvas
export let deletedAtoms = []; // has a list of deleted atoms on delete "atom event"
export let textList = []; // contains a list of original images when tool bar buttons are called
export let textNodeStruct = {}; // contains a list of original text when tool bar buttons are called

// local
let oldImagePack = [];
let selectedImageForTextNode = null;
let imageListCopyContainer = [];
let textListCopyContainer = [];

// to reset all data containers
export const resetStore = () => {
  uniqueEvents.clear();
  latestData = null;
  imagesList = [];
  mols = [];
  allNodes = [];
  imageNodeCounter = -1;
  reloadCanvas = false;
  deletedAtoms = [];
  FILOStack = [];
  allAtoms = [];
  imageListCopyContainer = [];
  textListCopyContainer = [];
};

// prepare/load ket2 format data
export const loadKetcherData = async (data) => {
  allAtoms = [];
  allNodes = [...data.root.nodes];
  imagesList = allNodes.filter((item) => item.type === 'image');
  textList = allNodes.filter((item) => item.type === 'text');
  const sliceEnd = Math.max(0, allNodes.length - imagesList.length - textList.length);
  mols = sliceEnd > 0 ? allNodes.slice(0, sliceEnd).map((i) => i.$ref) : [];
  mols.forEach((item) => data[item]?.atoms.map((i) => allAtoms.push(i)));
};

// latestData setter
export const latestDataSetter = async (data) => {
  latestData = data;
};

// selection setter it can have images, atoms, bonds or anything selected in the canvas
export const canvasSelectionSetter = async (data) => {
  canvasSelection = data;
};

// image counter is strictly related and synced with how many images are there in the canvas
export const imageUsedCounterSetter = async (count) => {
  imageNodeCounter = count;
};

// when one/more atoms are selected and deleted this holds array of deleted atoms
export const deleteAtomListSetter = async (data) => {
  deletedAtoms = data;
};

/* istanbul ignore next */
// helper function to rebase with the ketcher canvas data
const fetchKetcherData = async (editor) => {
  try {
    if (!editor) throw new 'Editor instance is invalid'();
    latestData = JSON.parse(await editor.structureDef.editor.getKet());
    await loadKetcherData(latestData);
  } catch (err) {
    console.error('fetchKetcherData', err.message);
  }
};

// helper function to remove images from the ket file on atom move or manual atom move
export const moveTemplate = async () => {
  try {
    // if (!latestData) await fetchKetcherData(editor);
    latestData.root.nodes = removeImagesFromData(latestData);
  } catch (err) {
    console.error('moveTemplate', err.message);
  }
};

// helper function set image coordinates
const adjustImageCoordinatesAtomDependent = (imageCoordinates, location) => ({
  ...imageCoordinates,
  x: location[0] - imageCoordinates.width / 2,
  y: location[1] + imageCoordinates.height / 2,
  z: 0,
});

// generates list of images with atom location based on alias present in ket2 format
export const placeImageOnAtoms = async (mols_, imagesList_) => {
  try {
    const imageListParam = imagesList_;
    mols_.forEach(async (item) => {
      latestData[item]?.atoms.forEach((atom) => {
        if (atom && ALIAS_PATTERNS.threeParts.test(atom?.alias)) {
          const aliasSplits = atom.alias.split('_');
          const imageCoordinates = imageListParam[aliasSplits[2]]?.boundingBox;
          if (!imageCoordinates) {
            throw new ('Invalid alias')();
          }
          const boundingBox = adjustImageCoordinatesAtomDependent(imageCoordinates, atom.location, aliasSplits[1]);
          imageListParam[aliasSplits[2]].boundingBox = boundingBox;
        }
      });
    });
    latestData.root.nodes = [...removeImagesFromData(latestData), ...imageListParam];
  } catch (err) {
    console.error('placeImageOnAtoms', err.message);
  }
};

const findByKeyAndUpdateTextNodePositon = async (key, atomLocation, alias) => {
  // Iterate through each item in the textList
  const splits = alias.split("_")[2];
  const width = imagesList[splits]?.boundingBox?.width || 1;
  textList?.map((textNode) => {
    // Check if the key matches
    const content = JSON.parse(textNode.data.content); // Parse the content to access blocks
    if (content.blocks[0].key === key) {
      textNode.data.position = {
        x: atomLocation[0] + width / 2,
        y: atomLocation[1],
        z: atomLocation[2]
      };
      return textNode;
    }
    return textNode;
  });
};

export const placeTextOnAtoms = async (mols_) => {
  try {
    mols_.forEach(async (item) => {
      latestData[item]?.atoms.forEach(async (atom) => {
        const textNodeKey = textNodeStruct[atom.alias];
        if (atom && ALIAS_PATTERNS.threeParts.test(atom?.alias) && textNodeKey) {
          await findByKeyAndUpdateTextNodePositon(textNodeKey, atom.location, atom?.alias);
        }
      });
    });
    latestData.root.nodes = [...removeTextFromData(latestData), ...textList];
  } catch (err) {
    console.error('placeImageOnAtoms', err.message);
  }
};

// generating images for ket2 format from molfile polymers list
export const addPolymerTags = async (polymerTag, data) => {
  const collectedImages = [];
  if (polymerTag && polymerTag.length) {
    const processedResponse = await addingPolymersToKetcher(polymerTag, data, imageNodeCounter);
    imageNodeCounter = processedResponse.image_counter;
    processedResponse.molfileData?.root?.nodes.push(...processedResponse.c_images);
    return {
      collected_images: processedResponse.c_images,
      molfileData: processedResponse.molfileData
    };
  }
  return { collectedImages, molfileData: data };
};

// generating images for ket2 format from molfile polymers list
export const addTextNodes = async (textNodes) => {
  return textNodes.map((item) => {
    const [idx, key, alias, description] = item.split(KET_TAGS.textIdentifier);
    textNodeStruct[alias] = key;
    return {
      "type": "text",
      "data": {
        "content": `{\"blocks\":[{\"key\":\"${key}\",\"text\":\"${description}\",\"type\":\"unstyled\",\"depth\":0,\"inlineStyleRanges\":[],\"entityRanges\":[],\"data\":{}}],\"entityMap\":{}}`,
        "position": {
          "x": 10.325000000000001,
          "y": -11.325000000000001,
          "z": 0
        },
        "pos": [
          {
            "x": 10.325000000000001,
            "y": -11.325000000000001,
            "z": 0
          },
          {
            "x": 10.325000000000001,
            "y": -11.700000000000001,
            "z": 0
          },
          {
            "x": 10.68671875,
            "y": -11.700000000000001,
            "z": 0
          },
          {
            "x": 10.68671875,
            "y": -11.325000000000001,
            "z": 0
          }
        ]
      }
    };
  });
};

// helper function to test alias list consistency 0,1,2,3,4...
export const isAliasConsistent = () => {
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
    imageNodeCounter = processedAtoms.length - 1;
    for (let m = 0; m < mols.length; m++) {
      const mol = latestData[mols[m]];
      const removableIndices = [];
      for (let a = 0; a < mol?.atoms?.length; a++) {
        const atom = mol.atoms[a];
        const splits = atom?.alias?.split('_');
        // label A with three part alias
        if (ALIAS_PATTERNS.twoParts.test(atom.alias)) {
          imageNodeCounter += 1;
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
            imageNodeCounter += 1;
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
    return null;
  }
};

// IMP: helper function to handle new atoms added to the canvas
export const handleAddAtom = async () => {
  const processedAtoms = [];
  imageNodeCounter = -1;
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

const removeTextNodeFromStruct = (images, data) => {
  const keysToDel = [];
  images.forEach(num => {
    Object.keys(textNodeStruct).forEach(key => {
      // Split the key by underscores and check if the third part matches the number
      const parts = key.split('_');
      if (parts[2] && parseInt(parts[2]) === num) {
        keysToDel.push(textNodeStruct[key]);
      }
    });
  });

  textList.forEach((item, idx) => {
    if (keysToDel.indexOf(JSON.parse(item.data.content).blocks[0].key) != -1) {
      textList.splice(idx, 1);
    }
  });

  return textList;

};

// helper function to remove template by image
export const handleOnDeleteImage = async () => {
  mols = mols.filter((item) => item != null);
  let images = canvasSelection?.images || [];
  if (!images.length) images = deepCompare(oldImagePack, imagesList);
  const filteredTextList = removeTextNodeFromStruct(images, latestData);

  const { data, imageFoundIndexCount } = await removeImageTemplateAtom(new Set([...images]), mols, latestData);
  imageNodeCounter -= imageFoundIndexCount;

  const dataRoot = removeTextFromData(data);
  dataRoot.push(...filteredTextList);
  latestData.root.nodes = dataRoot;
  return latestData;
};

function deepCompare(oldArray, newArray) {
  const removedIndexes = [];

  // Loop through the old array to find missing elements
  for (let i = 0; i < oldArray.length; i++) {
    let isFound = false;
    for (let j = 0; j < newArray.length; j++) {
      if (JSON.stringify(oldArray[i]) === JSON.stringify(newArray[j])) {
        isFound = true;
        break;
      }
    }
    // If element from old array not found in new array, mark it as removed
    if (!isFound) {
      removedIndexes.push(i);
    }
  }
  return removedIndexes;
}

// helper function to remove template by atom with alias
export const handleOnDeleteAtom = async (deleteCopy) => {
  try {
    const data = { ...latestData };
    deleteCopy.forEach((item) => {
      if (ALIAS_PATTERNS.threeParts.test(item.alias)) {
        const deletedSplits = parseInt(item.alias.split('_')[2]);

        for (let m = 0; m < mols.length; m++) {
          const mol = data[mols[m]];
          if (mol && mol?.atoms) {
            const atoms = mol?.atoms || [];
            for (let i = 0; i < atoms.length; i++) {
              const atom = atoms[i];
              if (ALIAS_PATTERNS.threeParts.test(atom?.alias)) {
                const atomSplits = atom.alias.split('_');
                if (parseInt(atomSplits[2]) > deletedSplits) {
                  atom.alias = `t_${atomSplits[1]}_${parseInt(atomSplits[2]) - 1}`;
                }
              }
            }
            data[mols[m]].atoms = atoms;
          }
        }
      }
    });
    return data;
  } catch (err) {
    console.error('handleDelete!!', err.message);
    return null;
  }
};

// function when a canvas is saved using main "SAVE" button
export const arrangePolymers = async (canvasData) => {
  mols.forEach((item) => latestData[item]?.atoms.map((i) => allAtoms.push(i)));
  const editorData = canvasData.trim();
  const lines = ['', ...editorData.split('\n')];
  if (lines.length < 5) return { ket2Molfile: null, svgElement: null };
  const elementsInfo = lines[3];

  const headers = elementsInfo.trim().split(' ').filter((i) => i !== '');
  const atomsCount = parseInt(headers[0]);
  const bondsCount = parseInt(headers[1]);

  const additionalDataStart = KET_TAGS.molfileHeaderLinenumber + atomsCount + bondsCount;
  const additionalDataEnd = lines.length - 1;

  const ket2Molfile = await reAttachPolymerList({
    lines, atomsCount, additionalDataStart, additionalDataEnd, allAtoms
  });
  return ket2Molfile;
};

export const arrangeTextNodes = async (ket2Molfile) => {
  ket2Molfile.push(KET_TAGS.textNodeIdentifier);
  let atomCount = 0;
  const assembleTextList = [];
  mols.forEach(async (item) => {
    const textSeparator = KET_TAGS.textIdentifier;
    latestData[item]?.atoms.forEach(async (atom) => {
      const textNodeKey = textNodeStruct[atom.alias];
      if (textNodeKey) {
        textList.forEach(item => {
          const block = JSON.parse(item.data.content).blocks[0];
          if (textNodeKey === block.key) {
            const line = [
              atomCount,
              textSeparator,
              textNodeKey,
              textSeparator,
              atom.alias,
              textSeparator,
              block.text
            ].join('').trim();
            assembleTextList.push(line);
          }
        });
      } else {
        console.log();
      }
      atomCount += 1;
    });
  });
  ket2Molfile.push(...assembleTextList, KET_TAGS.textNodeIdentifierClose);
  return ket2Molfile;
};

/* istanbul ignore next */
// helper function for saving molfile => re-layering images from iframe
const reArrangeImagesOnCanvas = async (iframeRef) => {
  const iframeDocument = iframeRef?.current?.contentWindow?.document;
  const svg = iframeDocument.querySelector('svg');
  const imageElements = iframeDocument.querySelectorAll('image');

  imageElements.forEach((img) => {
    const width = img.getAttribute('width');
    const height = img.getAttribute('height');
    const x = img.getAttribute('x');
    const y = img.getAttribute('y');

    const newImg = document.createElementNS('http://www.w3.org/2000/svg', 'image');
    newImg.setAttribute('x', x);
    newImg.setAttribute('y', y);
    newImg.setAttribute('width', width);
    newImg.setAttribute('height', height);
    newImg.setAttribute('href', img.getAttribute('href'));

    img.replaceWith(newImg);
  });

  // Ensure SVG has a proper viewBox
  svg.setAttribute('viewBox', '0 0 500 500');

  const svgElement = new XMLSerializer().serializeToString(svg);
  return svgElement;
};

/* istanbul ignore next */
// save molfile with source, should_fetch, should_move
const saveMoveCanvas = async (editor, data, isFetchRequired, isMoveRequired, recenter = false) => {
  const dataCopy = data || latestData;
  if (editor) {
    if (recenter || !imagesList.length) {
      await editor.structureDef.editor.setMolecule(JSON.stringify(dataCopy));
    } else {
      await editor.structureDef.editor.setMoleculeWithoutStructCenter(JSON.stringify(dataCopy));
    }
    if (isFetchRequired) {
      fetchKetcherData(editor);
    }

    if (isMoveRequired) {
      onTemplateMove(editor, recenter);
    }
  } else {
    console.error('Editor is undefined');
  }
};

/* istanbul ignore next */
// container function for template move
const onTemplateMove = async (editor, recenter = false) => {
  if (!editor || !editor.structureDef) return;

  // for tool bar button events
  if (!recenter && imageListCopyContainer.length || textListCopyContainer.length) {
    recenter = true;
  }

  // first fetch to save values
  await fetchKetcherData(editor);
  const molCopy = mols;
  const imageListCopy = imageListCopyContainer.length ? imageListCopyContainer : imagesList;
  const textListCopy = textListCopyContainer.length ? textListCopyContainer : textList;

  // second fetch save and place
  await fetchKetcherData(editor);
  await placeImageOnAtoms(molCopy, imageListCopy);
  await placeTextOnAtoms(molCopy, textListCopy);
  await saveMoveCanvas(editor, null, true, false, recenter);

  // clear required
  ImagesToBeUpdatedSetter(true);// perform image layer in DOM
  reloadCanvas = false; // stop load canvas
  imageListCopyContainer = [];
  textListCopyContainer = [];
};

/* istanbul ignore next */
// container function for onAddAtom
const onAddAtom = async (editor) => {
  if (editor && editor.structureDef) {
    await fetchKetcherData(editor);
    const { d, isConsistent } = await handleAddAtom();
    if (!isConsistent) {
      console.error('Generated aliases are inconsistent. Please try reopening the canvas again.');
      return null;
    }
    await saveMoveCanvas(editor, d, true, true);
    ImagesToBeUpdatedSetter(true);
  }
  return null;
};

// helper function to delete a pair of textnode by value
const deleteKeyByValue = (valueToDelete) => {
  // Iterate over each key-value pair in the object
  for (const key in textNodeStruct) {
    if (textNodeStruct.hasOwnProperty(key) && textNodeStruct[key] === valueToDelete) {
      delete textNodeStruct[key]; // Delete the key if the value matches
    }
  }
};

// helper function when a text node is deleted
const onDeleteText = async (editor) => {
  console.log('Delete text in in?');
  await fetchKetcherData(editor);
  textList.forEach((item, idx) => {
    const key = JSON.parse(item.data.content).blocks[0].key;
    if (!Object.values(textNodeStruct).includes(key)) {
      deleteKeyByValue(key);
      textList.splice(idx, 1);
    }
  });
};

const onAddText = async (editor) => {
  if (editor && editor.structureDef && selectedImageForTextNode) {
    await fetchKetcherData(editor);
    const { atomLocation, alias } = await findAtomByImageIndex(selectedImageForTextNode[0]);
    if (!atomLocation && !atomLocation?.length) return null;

    // sync positions between atom alias, and textnode
    const { width } = imagesList[selectedImageForTextNode[0]]?.boundingBox || 10;
    const lastTextNode = textList[textList.length - 1];
    lastTextNode.data.position = {
      x: atomLocation[0] + width / 2,
      y: atomLocation[1],
      z: atomLocation[2]
    };
    textList[textList.length - 1] = lastTextNode;
    // prepare data nodes
    const dataRoot = removeTextFromData(latestData);
    dataRoot.push(...textList);
    latestData.root.nodes = dataRoot;

    await editor.structureDef.editor.setMoleculeWithoutStructCenter(JSON.stringify(latestData));
    textNodeStruct[alias] = JSON.parse(lastTextNode.data.content).blocks[0].key;
  }
  selectedImageForTextNode = null;
};

/* istanbul ignore next */
// container function for on image delete
const onDeleteImage = async (editor) => {
  if (editor && editor.structureDef && !deletedAtoms.length) {
    const data = await handleOnDeleteImage();
    await saveMoveCanvas(editor, data, false, true);
  }
};

// remove a node from root.nodes by index num
const removeNodeByIndex = async (index) => {
  latestData.root.nodes.splice(index + mols.length, 1);
};

/* istanbul ignore next */
/* container function on atom delete
  removes an atom: atoms should always be consistent
    case1: when last(current count for image counter) image is deleted means aliases are consistent
    case1: when any image is deleted means aliases are in-consistent
*/
const onAtomDelete = async (editor) => {
  if (editor && editor.structureDef) {
    const molCopy = mols;
    const imageListCopy = imagesList;
    let deleteCopy = deletedAtoms;
    const alias = deletedAtoms[0]?.alias;
    const lastAliasInd = parseInt(alias?.split('_')[2]);
    await fetchKetcherData(editor);

    // when mols and images are changed
    if (molCopy.length > mols.length && imagesList.length > imageListCopy.length) {
      console.log(685);
      await editor.structureDef.editor.setMoleculeWithoutStructCenter(JSON.stringify(latestData));
      return;
    }

    // when one template is deleted
    if (molCopy.length === mols.length && imagesList.length === imageListCopy.length) { // deleted item is one
      await removeNodeByIndex(lastAliasInd);
      imagesList.splice(lastAliasInd, 1);
      console.log(694);
    }

    // when mol is deleted
    if (molCopy.length > mols.length && imagesList.length === imageListCopy.length) { // when atom is dragged to another atom
      console.log(699);
      const removalNotRequired = isAliasConsistent();
      if (removalNotRequired && imageNodeCounter !== lastAliasInd) {
        canvasSelection = null;
        return;
      }
      await removeNodeByIndex(lastAliasInd);
      imagesList.splice(lastAliasInd, 1);
    }

    if (molCopy.length < mols.length && imagesList.length === imageListCopy.length) { // when atom is dragged to another atom
      console.log(710);
      await removeNodeByIndex(lastAliasInd);
      imagesList.splice(lastAliasInd, 1);
    }

    console.log("out");
    imageNodeCounter -= deleteCopy.length; // update image used counter

    await filterTextList(deleteCopy); // rever text node structure
    await revaluateTextStructureIndecies(deleteCopy); // rever text node structure

    latestData = await handleOnDeleteAtom(deleteCopy); // rebase atom aliases
    await placeImageOnAtoms(molCopy, imagesList);
    await saveMoveCanvas(editor, null, false, true);
    deletedAtoms = [];
  }
};

const filterTextList = async (deleteCopy) => {
  // re-verb all the index when deleted index is small then existing third part
  const deleteLiasAlias = deleteCopy.map(i => i.alias);
  let valuesList = deleteLiasAlias.map(i => textNodeStruct[i]).filter(v => v != null);;

  const newTextList = textList.map((i) => {
    if (valuesList.indexOf(JSON.parse(i.data.content).blocks[0].key) == -1) {
      return i;
    }
  }).filter(v => v != null);

  if (valuesList.length) {
    latestData.root.nodes = [...removeTextFromData(latestData), ...newTextList];
    textList = [...newTextList];
  }
};
const revaluateTextStructureIndecies = async (deleteCopy) => {
  const deleteLiasAlias = deleteCopy.filter(i => textNodeStruct[i.alias]);
  if (deleteLiasAlias.length) {
    const textNodeCopy = {};
    Object.keys(textNodeStruct).forEach(item => {
      const value = textNodeStruct[item];
      const splits = item.split('_');
      if (deleteLiasAlias.indexOf(item) != -1) {
        item = `t_${splits[1]}_${parseInt(splits[2]) - 1}`;
      }
      const postCheck = parseInt(item.split('_')[2]) < 0;
      if (!postCheck) textNodeCopy[item] = value;
    });
    textNodeStruct = { ...textNodeCopy };
  }
};

/* istanbul ignore next */
const KetcherEditor = forwardRef((props, ref) => {
  const {
    editor, iH, iS, molfile
  } = props;

  const [showShapes, setShowShapes] = useState(false);

  const iframeRef = useRef();
  const initMol = molfile || '\n  noname\n\n  0  0  0  0  0  0  0  0  0  0999 V2000\nM  END\n';

  // Handlers for each event operation, mapped by operation name;
  const eventOperationHandlers = {
    'Load canvas': async () => {
      if (reloadCanvas) onTemplateMove(editor, true);
    },
    'Move image': async () => {
      console.log('Move image');
      addEventToFILOStack('Move image');
    },
    'Add atom': async () => {
      console.log('atom added?');
      addEventToFILOStack('Add atom');
    },
    'Upsert image': async () => {
      console.log('Upsert image');
      addEventToFILOStack('Upsert image');
    },
    'Move atom': async (eventItem) => {
      console.log('Move atom');
      const { exists } = isCanvasUpdateRequiredOnMove(eventItem);
      allowProcessingSetter(exists);
      addEventToFILOStack('Move atom');
    },
    'Delete image': async () => {
      oldImagePack = [...imagesList];
      addEventToFILOStack('Delete image');
    },
    'Delete atom': async (eventItem) => {
      console.log('Delete atom', eventItem);
      let atomCount = -1;
      if (eventItem.label === KET_TAGS.inspiredLabel) {
        for (let m = 0; m < mols?.length; m++) {
          const mol = mols[m];
          const atoms = latestData[mol]?.atoms;
          for (let a = 0; a < atoms?.length; a++) {
            atomCount++;
            if (atomCount === eventItem.id) {
              deletedAtoms.push(allAtoms[atomCount]);
            }
          }
        }
        oldImagePack = [...imagesList];
        addEventToFILOStack('Delete atom');
      }
    },
    'Add text': async () => {
      addEventToFILOStack('Add text');
    },
    'Delete text': async () => {
      if (!FILOStack.includes('Delete atom') && !FILOStack.includes('Delete image')) {
        addEventToFILOStack('Delete text');
      }
    }
  };

  // action based on event-name
  const eventHandlers = {
    'Move image': async () => onTemplateMove(editor),
    'Delete image': async () => {
      await fetchKetcherData(editor);
      await onDeleteImage(editor);
    },
    'Move atom': async () => {
      await fetchKetcherData(editor);
      await onTemplateMove(editor, false);
    },
    'Add atom': async () => onAddAtom(editor),
    'Delete atom': async () => {
      await onAtomDelete(editor);
      canvasSelection = null;
    },
    'Add text': async () => onAddText(editor),
    'Delete text': async () => onDeleteText(editor)
  };

  const fetchAndReplace = () => {
    imageListCopyContainer = [...imagesList];
    textListCopyContainer = [...textList];
    addEventToFILOStack('Move atom');
  };

  const removeTextNodeDescriptionOnTextPopup = () => {
    const paragraph = document.getElementById(KET_TAGS.templateEditProps.id);
    if (paragraph) {
      paragraph.remove();
    }
    selectedImageForTextNode = null;
  };

  // DOM button events with scope
  const buttonEvents = {
    // fetch and place data
    "[title='Clean Up \\(Ctrl\\+Shift\\+L\\)']": async () => fetchAndReplace(),
    "[title='Calculate CIP \\(Ctrl\\+P\\)']": async () => fetchAndReplace(),
    "[title='Layout \\(Ctrl\\+L\\)']": async () => fetchAndReplace(),
    "[title='Add/Remove explicit hydrogens']": async () => fetchAndReplace(),
    "[title='Aromatize \\(Alt\\+A\\)']": async () => fetchAndReplace(),
    "[title='3D Viewer']": async () => fetchAndReplace(),
    // others
    "[title='Rescale Polymer Canvas']": async () => onTemplateMove(editor, true),
    "[title='Open... \\(Ctrl\\+O\\)']": async () => removeTextNodeDescriptionOnTextPopup(),
    "[title='Save as... \\(Ctrl\\+S\\)']": async () => removeTextNodeDescriptionOnTextPopup(),
    "[title='Undo \\(Ctrl\\+Z\\)']": async () => undoKetcher(editor),
    "[title='Redo \\(Ctrl\\+Shift\\+Z\\)']": () => redoKetcher(editor),
    "[title='Polymer List']": async () => setShowShapes(!showShapes),
    "[title='Clear Canvas \\(Ctrl\\+Del\\)']": async () => {
      resetStore();
      removeTextNodeDescriptionOnTextPopup();
    }
  };

  useEffect(() => {
    resetStore();
    let iframe = null;
    if (editor && editor.structureDef) {
      iframe = iframeRef.current;
      if (iframe) {
        iframe.addEventListener('load', attachClickListeners); // DOM change listener
      }
      window.addEventListener('message', loadContent); // molfile initializer
    }
    return () => {
      if (iframe) {
        iframe.removeEventListener('load', attachClickListeners);
      }
      window.removeEventListener('message', loadContent);
    };
  }, [editor]);

  // enable editor change listener
  const onEditorContentChange = () => {
    editor._structureDef.editor.editor.subscribe('change', async (eventData) => {
      canvasSelection = editor._structureDef.editor.editor._selection;
      const result = await eventData;
      handleEventCapture(result);
    });
    editor._structureDef.editor.editor.subscribe('selectionChange', async (eventData) => {
      const currentSeletion = editor._structureDef.editor.editor._selection;
      if (currentSeletion?.images) {
        selectedImageForTextNode = editor._structureDef.editor.editor._selection?.images;
      }
    });
  };

  // Load the editor content and set up the molecule
  const loadContent = async (event) => {
    if (event.data.eventType === 'init') {
      window.editor = editor;
      if (editor && editor.structureDef) {
        onEditorContentChange(editor);
        const polymerTag = await hasKetcherData(initMol);
        const textNodes = await hasTextNodes(initMol);
        const ketFile = await editor._structureDef.editor.indigo.convert(initMol).catch((err) => {
          console.error('invalid molfile. Please try again', err.message);
        });
        const fileContent = JSON.parse(ketFile.struct);
        // process polymers
        const { molfileData } = await addPolymerTags(polymerTag, fileContent);
        const textNodeList = await addTextNodes(textNodes, molfileData);
        molfileData.root.nodes.push(...textNodeList);
        saveMoveCanvas(editor, molfileData, true, true);
        ImagesToBeUpdatedSetter(true);
      }
    }
  };

  // helper function to execute a stack: first in last out
  const processFILOStack = async () => {
    const loadCanvasIndex = FILOStack.indexOf('Load canvas');
    if (loadCanvasIndex > -1) {
      FILOStack.splice(loadCanvasIndex, 1);
      uniqueEvents.delete('Load canvas');
    }
    while (FILOStack.length > 0) {
      const event = FILOStack.pop();
      uniqueEvents.delete(event);
      if (eventHandlers[event]) {
        // eslint-disable-next-line no-await-in-loop
        await eventHandlers[event]();
      }
    }
    await runImageLayering(); // post all the images at the end of the canvas not duplicate
    FILOStack = [];
    uniqueEvents.clear();
  };

  // main function to capture all events from editor
  const handleEventCapture = async (data) => {
    allowProcessingSetter(true);

    const selection = editor._structureDef.editor.editor._selection;
    if (selection?.images || selection?.texts) {
      addEventToFILOStack('Move atom');
    }

    // eslint-disable-next-line no-restricted-syntax
    for (const eventItem of data) {
      const operationHandler = eventOperationHandlers[eventItem?.operation];
      if (operationHandler) {
        // eslint-disable-next-line no-await-in-loop
        await operationHandler(eventItem);
      }
    }
    if (allowProcessing) {
      processFILOStack();
    }
  };

  // all logic implementation if move atom has an alias which passed three part regex
  const isCanvasUpdateRequiredOnMove = (eventItem) => {
    const { id } = eventItem;
    const targetAtom = allAtoms[id];
    if (targetAtom) {
      return { exists: ALIAS_PATTERNS.threeParts.test(targetAtom.alias), atom: targetAtom };
    }
    return { exists: true, atom: targetAtom };
  };

  // add all the images at the end of the canvas
  const runImageLayering = async () => {
    if (ImagesToBeUpdated && !LAYERING_FLAGS.skipImageLayering) {
      setTimeout(async () => {
        await updateImagesInTheCanvas(iframeRef);
      }, [500]);
    }
  };

  // helper function to add event to stack
  const addEventToFILOStack = (event) => {
    if (event === 'Delete image' && FILOStack.includes('Delete atom')) {
      // console.log('Cannot add "Delete image" after "Delete atom" event.');
      return;
    }

    if (event === 'Delete atom' && FILOStack.includes('Move atom')) {
      // console.log('Cannot add "Delete atom" after "Delete move" event.');
      return;
    }

    if (event === 'Delete atom' && FILOStack.includes('Delete text')) {
      // console.log('Cannot add "Delete atom" after "Delete text" event.');
      return;
    }

    if (event === 'Delete image' && FILOStack.includes('Delete text')) {
      // console.log('Cannot add "Delete image" after "Delete text" event.');
      return;
    }

    // Add event to FILO stack only if it's not already in uniqueEvents
    if (!uniqueEvents.has(event)) {
      FILOStack.push(event);
      uniqueEvents.add(event);
    }
  };

  // helper function to add mutation observers to DOM elements
  const attachClickListeners = () => {
    // Main function to attach listeners and observers
    if (iframeRef.current && iframeRef.current?.contentWindow?.document) {
      const iframeDocument = iframeRef.current.contentWindow.document;

      // Attach MutationObserver to listen for relevant DOM mutations (e.g., new elements added)
      const observer = new MutationObserver(async (mutationsList) => {
        await Promise.all(
          mutationsList.map(async (mutation) => {
            if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
              await Promise.all(
                Object.keys(buttonEvents).map(async (selector) => {
                  await attachListenerForTitle(iframeDocument, selector, buttonEvents);
                  makeTransparentByTitle(iframeDocument);
                })
              );
              if (selectedImageForTextNode) {
                for (let i = 0; i < mutation.addedNodes.length; i++) {
                  const node = mutation.addedNodes[i]; // Access each node
                  await addTextNodeDescriptionOnTextPopup(node);
                }
              }
            }
          })
        );

        const cancelButton = iframeDocument.querySelector('.Dialog-module_cancel__8d83c');
        const crossButton = iframeDocument.querySelector('.Dialog-module_buttonTop__91ha8');

        if (cancelButton) {
          cancelButton?.addEventListener('click', () => {
            console.log("Cancel button clicked");
            selectedImageForTextNode = null;
          });
        }
        if (crossButton) {
          crossButton?.addEventListener('click', () => {
            console.log("cross button clicked");
            selectedImageForTextNode = null;
          });
        }

        if (!LAYERING_FLAGS.skipTemplateName) {
          await updateTemplatesInTheCanvas(iframeRef);
        }
      });

      // Start observing the iframe's document for changes (child nodes added anywhere in the subtree)
      observer.observe(iframeDocument, {
        childList: true,
        subtree: true,
      });

      // Fallback: Try to manually find buttons after some time, debounce the function
      const debounceAttach = setTimeout(() => {
        Object.keys(buttonEvents).forEach((title) => {
          attachListenerForTitle(iframeDocument, title);
        });

        // Ensure iframe content is loaded before adding the button
        if (iframeRef?.current?.contentWindow?.document?.readyState === 'complete') {
          PolymerListIconKetcherToolbarButton(iframeDocument);
          rescaleToolBarButoon(iframeDocument);
        } else {
          if (iframeRef?.current?.onload) {
            iframeRef.current.onload = PolymerListIconKetcherToolbarButton;
            iframeRef.current.onload = rescaleToolBarButoon;
          }
        }
      }, 1000);

      // Cleanup function
      return () => {
        observer.disconnect();
        clearTimeout(debounceAttach);
        Object.keys(buttonEvents).forEach((title) => {
          const button = iframeDocument.querySelector(`[title="${title}"]`);
          if (button) {
            button.removeEventListener('click', buttonEvents[title]);
          }
        });
      };
    }
    return null;
  };

  // ref functions when a canvas is saved using main "SAVE" button
  useImperativeHandle(ref, () => ({
    onSaveFileK2SC: async () => {
      await fetchKetcherData(editor);
      const canvasDataMol = await editor.structureDef.editor.getMolfile();
      let svgElement = await reArrangeImagesOnCanvas(iframeRef);
      const ket2MolfilePolymerArranged = await arrangePolymers(canvasDataMol);
      const ket2MolfileTextArranged = await arrangeTextNodes(ket2MolfilePolymerArranged);
      resetStore();
      ket2MolfileTextArranged.push(KET_TAGS.fileEndIdentifier);


      return { ket2Molfile: ket2MolfileTextArranged.join('\n'), svgElement };
    }
  }));

  const onShapeSelection = async (tempId) => {
    const rootStruct = {
      nodes: [
        {
          $ref: 'mol0'
        },

      ],
      connections: [],
      templates: []
    };
    const dummyContentToCopy = {
      root: {},
      mol0: {
        type: 'molecule',
        atoms: [
          {
            label: 'A',
            alias: 't_1_0',
            location: [
              21.07065471112727,
              -12.001127313397285,
              0
            ]
          },
        ],
        bonds: [],
        stereoFlagPosition: {
          x: 25.07065471112727,
          y: -12.001127313397285,
          z: 0
        }
      }
    };

    setShowShapes(false);
    dummyContentToCopy.root = { ...rootStruct };
    const dummyAlias = { ...dummyContentToCopy };
    const imageItem = await fetchSurfaceChemistryImageData(tempId);

    dummyAlias.root.nodes.push(imageItem);
    dummyAlias.mol0.atoms[0].alias = `t_${tempId}`;
    dummyAlias.mol0.atoms.selected = true;
    await editor._structureDef.editor.addFragment(
      JSON.stringify(dummyAlias)
    );

    fetchKetcherData(editor);
    onAddAtom(editor);
  };

  return (
    <div>
      <PolymerListModal
        loading={showShapes}
        onShapeSelection={onShapeSelection}
        onCloseClick={() => setShowShapes(false)}
        title="Select a template"
      />
      <iframe
        ref={iframeRef}
        id={editor?.id}
        src={editor?.extSrc}
        title={editor?.label}
        height={iH}
        width="100%"
        style={iS}
      />
    </div>
  );
});

KetcherEditor.propTypes = {
  molfile: PropTypes.string,
  editor: PropTypes.object.isRequired,
  iH: PropTypes.string.isRequired,
  iS: PropTypes.object.isRequired,
};

KetcherEditor.displayName = 'KetcherEditor';

export default KetcherEditor;
