/* eslint-disable no-use-before-define */
/* eslint-disable no-underscore-dangle */
/* eslint-disable no-restricted-syntax */
/* eslint-disable no-param-reassign */
/* eslint-disable no-plusplus */
/* eslint-disable radix */
import { reAttachPolymerList } from 'src/utilities/ketcherSurfaceChemistry/PolymersTemplates';
import {
  latestData,
  resetStore,
  latestDataSetter,
  imageUsedCounterSetter,
} from 'src/components/structureEditor/KetcherEditor';
import { ALIAS_PATTERNS, KET_TAGS } from 'src/utilities/ketcherSurfaceChemistry/constants';
import { findAtomByImageIndex, handleAddAtom } from 'src/utilities/ketcherSurfaceChemistry/AtomsAndMolManipulation';
import { fetchKetcherData } from 'src/utilities/ketcherSurfaceChemistry/InitializeAndParseKetcher';
import {
  imageNodeForTextNodeSetter,
  buttonClickForRectangleSelection,
} from 'src/utilities/ketcherSurfaceChemistry/DomHandeling';
import {
  ImagesToBeUpdatedSetter,
  imagesList,
  mols,
  allAtoms,
  textList,
  textListSetter,
  textNodeStruct,
  deletedAtomsSetter,
  reloadCanvasSetter,
  imageListCopyContainer,
  textListCopyContainer,
  imageListCopyContainerSetter,
  textListCopyContainerSetter,
  addNewMol,
  emptyKetcherStore,
  allAtomsSetter,
  FILOStackSetter,
} from 'src/utilities/ketcherSurfaceChemistry/stateManager';
import {
  placeTextOnAtoms,
  reArrangeImagesOnCanvas,
  fetchSurfaceChemistryImageData,
  placeAtomOnImage,
} from 'src/utilities/ketcherSurfaceChemistry/Ketcher2SurfaceChemistryUtils';

// canvas actions
const removeUnfamiliarRgLabels = async (lines) => {
  const removableAtoms = [];
  for (let i = lines.length - 1; i > 0; i--) {
    // Looping backwards to avoid index shifting issues
    if (ALIAS_PATTERNS.threeParts.test(lines[i])) {
      const template = parseInt(lines[i].split('_')[1]);

      if (template > 50) {
        removableAtoms.push(lines[i - 1].split('   ')[1]);
        // Remove both previous (i-1) and current (i) item
        lines.splice(i - 1, 2);
        i--;
      }
    }
  }
  return lines;
};

// function when a canvas is saved using main "SAVE" button
const arrangePolymers = async (canvasData) => {
  mols.forEach((item) => latestData[item]?.atoms.map((i) => allAtoms.push(i)));
  const editorData = canvasData.trim();
  let lines = ['', ...editorData.split('\n')];
  lines = await removeUnfamiliarRgLabels(lines);

  if (lines.length < 5) return { ket2Molfile: null, svgElement: null };
  const elementsInfo = lines[3];

  const headers = elementsInfo
    .trim()
    .split(' ')
    .filter((i) => i !== '');
  const atomsCount = parseInt(headers[0]);
  const bondsCount = parseInt(headers[1]);

  const additionalDataStart = KET_TAGS.molfileHeaderLinenumber + atomsCount + bondsCount;
  const additionalDataEnd = lines.length - 1;

  const ket2Lines = await reAttachPolymerList({
    lines,
    atomsCount,
    additionalDataStart,
    additionalDataEnd,
    allAtoms,
  });
  return ket2Lines;
};

// helper function to arrange text nodes for formula
const arrangeTextNodes = async (ket2Molfile) => {
  ket2Molfile.push(KET_TAGS.textNodeIdentifier);
  let atomCount = 0;
  const assembleTextList = [];
  mols.forEach(async (item) => {
    const textSeparator = KET_TAGS.textIdentifier;
    latestData[item]?.atoms.forEach(async (atom) => {
      const textNodeKey = textNodeStruct[atom.alias];

      if (textNodeKey) {
        textList.forEach((textItem) => {
          const block = JSON.parse(textItem.data.content).blocks[0];
          if (textNodeKey === block.key) {
            const line = [atomCount, textSeparator, textNodeKey, textSeparator, atom.alias, textSeparator, block.text]
              .join('')
              .trim();
            assembleTextList.push(line);
          }
        });
      }
      atomCount += 1;
    });
  });
  ket2Molfile.push(...assembleTextList, KET_TAGS.textNodeIdentifierClose);
  return ket2Molfile;
};

// sort and join / text nodes
const traverseAtonForFormulaFormation = async (ket2Lines, textNodesPairs, startAtoms, endAtom) => {
  let count = 0;
  for (let i = startAtoms + 1; i <= endAtom; i++) {
    const pairValue = textNodesPairs[count];
    if (pairValue) {
      delete textNodesPairs[count];
      const Y = parseFloat(ket2Lines[i].trim().split('   ')[1]);
      textNodesPairs[Y.toFixed(4)] = pairValue.text;
    }
    count++;
  }
  const sortedYIndices = Object.fromEntries(
    Object.entries(textNodesPairs).sort(([a], [b]) => parseFloat(b) - parseFloat(a))
  );

  return Object.values(sortedYIndices).join('/');
};

// collect text node with index
const collectTextListing = async (ket2Lines, startTextNode, endTextNode) => {
  const struct = {};
  for (let i = startTextNode + 1; i < endTextNode; i++) {
    const item = ket2Lines[i].split(KET_TAGS.textIdentifier);
    if (item.length === 4) {
      const [idx, , unique, text] = item;
      struct[idx] = { text, unique };
    }
  }
  return struct;
};

const connectionHash = async (ket2Lines, bondsCount, startAtoms, atomsCount) => {
  const connections = {};
  const startIdx = atomsCount + startAtoms + 1;
  for (let i = startIdx; i < startIdx + bondsCount; i++) {
    const line = ket2Lines[i]
      .trim()
      .split(' ')
      .filter((j) => j !== '');
    if (line.length >= 3) {
      const [atom1, atom2] = line;
      console.log('atom1, atom2', atom1, atom2);
      if (!connections[atom1]) connections[atom1] = [];
      connections[atom1].push(atom2);
    }
  }
  console.log('connections', connections);
  console.log('texts', textList);
  return smartInlineExpand(connections);
};

const smartInlineExpand = (input) => {
  const result = JSON.parse(JSON.stringify(input)); // deep clone
  const keysToDelete = new Set();

  for (const key in result) {
    const children = result[key];
    for (const child of children) {
      if (input[child]) {
        const childValues = input[child];
        const nextLevelKey = findNextKey(key, result);
        if (nextLevelKey) {
          const nextLevelValues = result[nextLevelKey];
          const newItems = childValues.filter((val) => !nextLevelValues.includes(val));
          if (newItems.length > 0) {
            result[nextLevelKey].push(...newItems);
            keysToDelete.add(child);
          }
        }
      }
    }
  }

  // Remove any fully inlined keys
  for (const key of keysToDelete) {
    delete result[key];
  }

  return result;
};

// Helper: find the "next" key in insertion order
function findNextKey(currentKey, hash) {
  const keys = Object.keys(hash);
  const idx = keys.indexOf(currentKey);
  if (idx !== -1 && idx + 1 < keys.length) {
    return keys[idx + 1];
  }
  return null;
}

function connectWithUnderscore(connections, data) {
  const result = {};

  for (const key in connections) {
    const connectedKeys = connections[key];

    const texts = connectedKeys.map((k) => data[k]?.text).filter(Boolean); // remove undefined/null texts

    result[key] = texts.join('_');
  }

  return result;
}

const subtractOneFromAll = (obj) => {
  const result = {};
  for (const key in obj) {
    result[key] = obj[key].map((val) => Number(val) - 1);
  }
  return result;
};

// process text nodes into for formula
const assembleTextDescriptionFormula = async (ket2Lines, editor) => {
  const startAtoms = 3;
  const splitsHeaders = ket2Lines[3]
    .trim()
    .split(' ')
    .map((i) => i.trim())
    .filter((i) => i !== '');
  const atomsCount = parseInt(splitsHeaders[0]);
  const bondsCount = parseInt(splitsHeaders[1]);
  const startTextNode = ket2Lines.indexOf(KET_TAGS.textNodeIdentifier);
  const endTextNode = ket2Lines.indexOf(KET_TAGS.textNodeIdentifierClose);
  const endAtom = atomsCount + 3;
  const indicesMap = {};
  for (let i = 0; i < atomsCount; i++) {
    indicesMap[i] = [];
  }
  const data = JSON.parse(await editor.structureDef.editor.getKet());

  for (let mol = 0; mol < mols.length; mol++) {
    const { bonds } = data[mols[mol]] || {};
    for (let atom1Bond = 0; atom1Bond < bonds?.length; atom1Bond++) {
      const [atom1, atom2] = bonds[atom1Bond].atoms || [];
      for (let atom2Bond = atom1Bond; atom2Bond < bonds?.length; atom2Bond++) {
        if (atom1 !== atom2) {
          indicesMap[atom1].push(atom2);
        }
      }
    }
  }

  console.log('indicesMap', indicesMap);
  const atomNumbersConnectWith_ = [];
  const indicesKeys = Object.keys(indicesMap);
  for (let atom = 0; atom < indicesKeys.length; atom++) {
    const connectedAtoms = indicesMap[atom];
    if (connectedAtoms.length > 1) {
      atomNumbersConnectWith_.push(...connectedAtoms);
    }
  }

  const textNodesPairs = await collectTextListing(ket2Lines, startTextNode, endTextNode);
  const pairKeys = Object.keys(textNodesPairs);
  console.log('pairKeys', pairKeys);
  console.log('atomNumbersConnectWith_', atomNumbersConnectWith_);

  // for (let textNode = 0; textNode < pairKeys.length; textNode++) {
  //   if (atomNumbersConnectWith_.indexOf(parseInt(pairKeys[textNode])) !== -1) {
  //     textNodesPairs[pairKeys[textNode]].text += '_';
  //   }
  // }

  for (let i = 0; i < atomNumbersConnectWith_.length; i++) {
    const idx = atomNumbersConnectWith_[i];
    if (textNodesPairs[idx]) {
      textNodesPairs[idx].text += '_'; // textNodesPairs[idx].text.replace(/_/g, '');
    }
  }

  const formula = await traverseAtonForFormulaFormation(ket2Lines, textNodesPairs, startAtoms, endAtom);
  console.log('formula', formula);
  return '';
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
    await saveMoveCanvas(editor, d, true, true, false);
    ImagesToBeUpdatedSetter(true);
  }
  return null;
};

// helper function to delete a pair of text node by value
const deleteKeyByValue = (valueToDelete) => {
  for (const key in textNodeStruct) {
    if (textNodeStruct[key] && textNodeStruct[key] === valueToDelete) {
      delete textNodeStruct[key];
    }
  }
};

// helper function when a text node is deleted
const onDeleteText = async (editor) => {
  try {
    if (editor) {
      await fetchKetcherData(editor);
    }
    const textListAlias = textList;
    textListAlias.forEach((item, idx) => {
      const { key } = JSON.parse(item.data.content).blocks[0];
      if (!Object.values(textNodeStruct).includes(key)) {
        deleteKeyByValue(key);
        textListAlias.splice(idx, 1);
      }
    });
    textListSetter(textListAlias);
  } catch (e) {
    console.error('onDeleteText', e);
  }
};

// function to add text nodes to canvas/struct
const onAddText = async (editor, selectedImageForTextNode) => {
  if (editor && editor.structureDef && selectedImageForTextNode) {
    await fetchKetcherData(editor);
    const { atomLocation, alias } = await findAtomByImageIndex(selectedImageForTextNode[0]);

    if (!atomLocation && !atomLocation?.length) return null;

    // sync positions between atom alias, and text-node
    const { width } = imagesList[selectedImageForTextNode[0]]?.boundingBox || 10;
    const lastTextNode = textList[textList.length - 1];

    lastTextNode.data.position = {
      x: atomLocation[0] + width / 2,
      y: atomLocation[1],
      z: atomLocation[2],
    };
    textList[textList.length - 1] = lastTextNode;
    textNodeStruct[alias] = JSON.parse(lastTextNode.data.content).blocks[0].key;
    saveMoveCanvas(editor, latestData, true, true, false);
  }
  imageNodeForTextNodeSetter(null);
  return true;
};

// make all special atom to rg-labels6 temp
const replaceAliasWithRG = async (data) => {
  for (const molName of mols) {
    const molecule = data[molName];
    for (let atomIndex = 0; atomIndex < molecule.atoms.length; atomIndex++) {
      const atom = molecule.atoms[atomIndex];
      if (ALIAS_PATTERNS.threeParts.test(atom.alias)) {
        delete atom.label;
        delete atom.alias;
        atom.type = 'rg-label';
        atom.$refs = ['rg-6'];
      }
    }
  }
  return data;
};

// prepare svg
// TODO: fix or remove after image fixes from ketcher epam
const prepareSvg = async (editor) => {
  const regex = /source-\d+/;
  const moves = [];
  const parser = new DOMParser();
  const matchingGlyphs = [];
  const A_PATH_ONE = '';
  const A_PATH_TWO = '';

  const struct = await replaceAliasWithRG({ ...latestData });
  const generateImageParams = { outputFormat: 'svg' };
  const data = JSON.stringify(struct);
  const svgBlob = await editor.structureDef.editor.generateImage(data, generateImageParams);
  const svgString = await new Response(svgBlob).text();
  const doc = parser.parseFromString(svgString, 'image/svg+xml');

  const uses = doc.querySelectorAll('*');
  const glyphs = doc.querySelectorAll("g[id^='glyph-']");

  glyphs.forEach((glyph) => {
    const path = glyph.querySelector('path');
    if (!path) return;

    const d = path.getAttribute('d').trim();
    if (d.includes(A_PATH_ONE.trim()) || d.includes(A_PATH_TWO.trim())) {
      matchingGlyphs.push(glyph.getAttribute('id'));
    }
  });

  const groups = doc.querySelectorAll('g');
  groups.forEach((group) => {
    const usesList = group.querySelectorAll('*');
    if (usesList.length === 2) {
      const isGroupMatching = [];
      usesList.forEach((use) => {
        const useEach = use.getAttributeNS('http://www.w3.org/1999/xlink', 'href').replace('#', '');
        isGroupMatching.push(matchingGlyphs.indexOf(useEach) !== -1);
      });
      usesList.forEach((use) => {
        use.style.fill = 'transparent';
      });
    }
  });

  uses.forEach((useElement) => {
    const xlinkHref = useElement.getAttributeNS('http://www.w3.org/1999/xlink', 'href');
    if (regex.test(xlinkHref)) {
      // useElement.remove();
      moves.push(useElement);
    }
  });
  const updatedSVGString = new XMLSerializer().serializeToString(doc);
  return updatedSVGString;
};

/* istanbul ignore next */
// save molfile with source, should_fetch, should_move
export const saveMoveCanvas = async (editor, data, isFetchRequired, isMoveRequired, recenter = false) => {
  const dataCopy = data || latestData;
  if (editor) {
    if (recenter) {
      await editor.structureDef.editor.setMolecule(JSON.stringify(dataCopy));
    } else {
      await editor.structureDef.editor.setMolecule(JSON.stringify(dataCopy), {
        rescale: false,
      });
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

const centerPositionCanvas = async (editor) => {
  try {
    await fetchKetcherData(editor);
    if (!textList.length) {
      await editor._structureDef.editor.editor.struct().clone();
      await editor._structureDef.editor.editor.renderAndRecoordinateStruct();
      // const clone = editor._structureDef.editor.editor.struct().clone();
      await fetchKetcherData(editor);
      saveMoveCanvas(editor, latestData, true, true, false);
      await fetchKetcherData(editor);
    }
  } catch (err) {
    console.error('centerPositionCanvas', err.message);
  }
};

const onTemplateMove = async (editor, recenter = false) => {
  if (!editor || !editor.structureDef) return;

  // for tool bar button events
  if (!recenter && (imageListCopyContainer.length || textListCopyContainer.length)) {
    recenter = true;
  }

  // first fetch to save values
  await fetchKetcherData(editor);

  const molCopy = mols;
  const imageListCopy = imageListCopyContainer.length ? imageListCopyContainer : imagesList;
  const textListCopy = textListCopyContainer.length ? textListCopyContainer : textList;

  // second fetch save and place
  await fetchKetcherData(editor);

  let imageNodes = [];
  imageNodes = await placeAtomOnImage(molCopy, imageListCopy);
  latestData.root.nodes = imageNodes;
  const textNodes = await placeTextOnAtoms(molCopy, textListCopy);
  latestData.root.nodes = textNodes;
  await saveMoveCanvas(editor, latestData, true, false, recenter);

  // clear required
  ImagesToBeUpdatedSetter(true); // perform image layer in DOM
  reloadCanvasSetter(false);
  deletedAtomsSetter([]);
  imageListCopyContainerSetter([]);
  textListCopyContainerSetter([]);
};

const onFinalCanvasSave = async (editor, iframeRef) => {
  try {
    let textNodesFormula = '';
    let ket2Lines = [];

    await centerPositionCanvas(editor);
    const canvasDataMol = await editor.structureDef.editor.getMolfile();
    await reArrangeImagesOnCanvas(iframeRef); // svg display
    ket2Lines = await arrangePolymers(canvasDataMol); // polymers added
    ket2Lines = await arrangeTextNodes(ket2Lines); // text node
    if (textList?.length) textNodesFormula = await assembleTextDescriptionFormula(ket2Lines, editor);
    ket2Lines.push(KET_TAGS.fileEndIdentifier);
    const svgElement = await prepareSvg(editor);
    resetStore();
    return {
      ket2Molfile: ket2Lines.join('\n'),
      svgElement,
      textNodesFormula,
    };
  } catch (e) {
    console.error('onSaveFileK2SC', e);
    return e.message;
  }
};

const onPasteNewShapes = async (editor, tempId, imageToBeAdded, iframeRef) => {
  // Check the length of mols and imagesList
  const molCount = mols.length === 0 ? 0 : mols.length;
  const imageCount = imagesList.length === 0 ? 0 : imagesList.length;

  const combo = [{ $ref: `mol${molCount}` }];

  // If an image is to be added, fetch the image data and adjust its bounding box
  if (imageToBeAdded) {
    const imageItem = await fetchSurfaceChemistryImageData(tempId);
    imageItem.boundingBox.y = -1.5250001907348631;
    imageItem.boundingBox.x = 1.5250000000000004;
    combo.push(imageItem);
  }

  // Update image used counter
  const imageCountAlias =
    imagesList.length === 0 ? 0 : molCount < imageCount ? imagesList.length - 1 : imagesList.length;

  imageUsedCounterSetter(imageCountAlias);

  if (!latestData) {
    latestDataSetter(emptyKetcherStore());
  }

  // Add nodes to root if both molCount and imageCount are 0 or different
  if (molCount === 0 && imageCount === 0) {
    latestData.root.nodes.push(...combo);
    // Add a new molecule
    latestData[`mol${molCount}`] = await addNewMol(tempId);
  } else if (molCount !== imageCount) {
    latestData.root.nodes.push(...combo);
    // Add a new molecule
    latestData[`mol${molCount}`] = await addNewMol(tempId);
  }
  saveMoveCanvas(editor, latestData, true, true, false);

  await buttonClickForRectangleSelection(iframeRef);
  FILOStackSetter([]);
  allAtomsSetter([]);
};

const getTitleSelector = (title) => `[title='${title.replace(/\(/g, '\\(').replace(/\)/g, '\\)')}']`;

export {
  arrangePolymers,
  arrangeTextNodes,
  assembleTextDescriptionFormula,
  onAddAtom,
  onDeleteText,
  onAddText,
  prepareSvg,
  centerPositionCanvas,
  onTemplateMove,
  onFinalCanvasSave,
  onPasteNewShapes,
  getTitleSelector,
};
