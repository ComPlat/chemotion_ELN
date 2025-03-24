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
  imageNodeCounter,
  latestDataSetter,
  imageUsedCounterSetter
} from 'src/components/structureEditor/KetcherEditor';
import { ALIAS_PATTERNS, KET_TAGS } from 'src/utilities/ketcherSurfaceChemistry/constants';
import {
  findAtomByImageIndex,
  handleAddAtom
} from 'src/utilities/ketcherSurfaceChemistry/AtomsAndMolManipulation';
import { fetchKetcherData } from 'src/utilities/ketcherSurfaceChemistry/InitializeAndParseKetcher';
import {
  imageNodeForTextNodeSetter,
  buttonClickForRectangleSelection
} from 'src/utilities/ketcherSurfaceChemistry/DomHandeling';
import {
  ImagesToBeUpdatedSetter, imagesList, mols, allAtoms,
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
  FILOStackSetter
} from 'src/utilities/ketcherSurfaceChemistry/stateManager';
import {
  placeTextOnAtoms,
  reArrangeImagesOnCanvas,
  fetchSurfaceChemistryImageData,
  placeAtomOnImage,
  placeImageOnAtoms
} from 'src/utilities/ketcherSurfaceChemistry/Ketcher2SurfaceChemistryUtils';

// canvas actions
const removeUnfamiliarRgLabels = async (lines) => {
  const removableAtoms = [];
  for (let i = lines.length - 1; i > 0; i--) { // Looping backwards to avoid index shifting issues
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

  const headers = elementsInfo.trim().split(' ').filter((i) => i !== '');
  const atomsCount = parseInt(headers[0]);
  const bondsCount = parseInt(headers[1]);

  const additionalDataStart = KET_TAGS.molfileHeaderLinenumber + atomsCount + bondsCount;
  const additionalDataEnd = lines.length - 1;

  const ket2Lines = await reAttachPolymerList({
    lines, atomsCount, additionalDataStart, additionalDataEnd, allAtoms
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
      }
      atomCount += 1;
    });
  });
  console.log({ assembleTextList });
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
      textNodesPairs[Y.toFixed(4)] = pairValue;
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
      const [idx, , , text] = item;
      struct[idx] = text;
    }
  }
  return struct;
};

// process text nodes into for formula
const assembleTextDescriptionFormula = async (ket2Lines) => {
  const startAtoms = 3;
  const atomsCount = ket2Lines[3].trim().split(' ')[0];
  const startTextNode = ket2Lines.indexOf(KET_TAGS.textNodeIdentifier);
  const endTextNode = ket2Lines.indexOf(KET_TAGS.textNodeIdentifierClose);
  const endAtom = parseInt(atomsCount) + 3;
  const textNodesPairs = await collectTextListing(ket2Lines, startTextNode, endTextNode);
  const formula = await traverseAtonForFormulaFormation(ket2Lines, textNodesPairs, startAtoms, endAtom);
  return formula;
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
  // Iterate over each key-value pair in the object
  for (const key in textNodeStruct) {
    if (textNodeStruct[key] && textNodeStruct[key] === valueToDelete) {
      delete textNodeStruct[key]; // Delete the key if the value matches
    }
  }
  // return textNodeStruct;
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
      z: atomLocation[2]
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
        atom.$refs = [
          'rg-6'
        ];
      }
    }
  }
  return data;
};

// prepare svg
const prepareSvg = async (editor) => {
  const regex = /source-\d+/;
  const moves = [];
  const parser = new DOMParser();
  const matchingGlyphs = [];
  const A_PATH_ONE = 'M 2.9375 -7.140625 C 3.820312 -7.140625 4.476562 -6.96875 4.90625 -6.625 C 5.332031 -6.289062 5.546875 -5.785156 5.546875 -5.109375 C 5.546875 -4.734375 5.472656 -4.414062 5.328125 -4.15625 C 5.191406 -3.90625 5.015625 -3.703125 4.796875 -3.546875 C 4.578125 -3.398438 4.347656 -3.285156 4.109375 -3.203125 L 6.0625 0 L 5.015625 0 L 3.296875 -2.953125 L 1.875 -2.953125 L 1.875 0 L 0.96875 0 L 0.96875 -7.140625 Z M 2.890625 -6.359375 L 1.875 -6.359375 L 1.875 -3.703125 L 2.9375 -3.703125 C 3.519531 -3.703125 3.941406 -3.816406 4.203125 -4.046875 C 4.472656 -4.285156 4.609375 -4.625 4.609375 -5.0625 C 4.609375 -5.53125 4.46875 -5.863281 4.1875 -6.0625 C 3.90625 -6.257812 3.472656 -6.359375 2.890625 -6.359375 Z M 2.890625 -6.359375 ';
  const A_PATH_TWO = 'M 0.546875 -3.046875 C 0.546875 -3.554688 0.585938 -4.0625 0.671875 -4.5625 C 0.765625 -5.0625 0.929688 -5.507812 1.171875 -5.90625 C 1.410156 -6.3125 1.742188 -6.632812 2.171875 -6.875 C 2.597656 -7.113281 3.144531 -7.234375 3.8125 -7.234375 C 3.957031 -7.234375 4.113281 -7.226562 4.28125 -7.21875 C 4.457031 -7.207031 4.597656 -7.1875 4.703125 -7.15625 L 4.703125 -6.40625 C 4.578125 -6.4375 4.4375 -6.460938 4.28125 -6.484375 C 4.132812 -6.503906 3.988281 -6.515625 3.84375 -6.515625 C 3.382812 -6.515625 3 -6.4375 2.6875 -6.28125 C 2.382812 -6.132812 2.144531 -5.925781 1.96875 -5.65625 C 1.789062 -5.394531 1.660156 -5.085938 1.578125 -4.734375 C 1.492188 -4.390625 1.445312 -4.019531 1.4375 -3.625 L 1.484375 -3.625 C 1.640625 -3.863281 1.851562 -4.0625 2.125 -4.21875 C 2.40625 -4.382812 2.757812 -4.46875 3.1875 -4.46875 C 3.800781 -4.46875 4.296875 -4.28125 4.671875 -3.90625 C 5.054688 -3.53125 5.25 -2.992188 5.25 -2.296875 C 5.25 -1.554688 5.039062 -0.972656 4.625 -0.546875 C 4.21875 -0.117188 3.671875 0.09375 2.984375 0.09375 C 2.523438 0.09375 2.113281 -0.015625 1.75 -0.234375 C 1.382812 -0.460938 1.09375 -0.8125 0.875 -1.28125 C 0.65625 -1.75 0.546875 -2.335938 0.546875 -3.046875 Z M 2.96875 -0.640625 C 3.382812 -0.640625 3.722656 -0.773438 3.984375 -1.046875 C 4.242188 -1.316406 4.375 -1.734375 4.375 -2.296875 C 4.375 -2.753906 4.257812 -3.113281 4.03125 -3.375 C 3.800781 -3.644531 3.457031 -3.78125 3 -3.78125 C 2.6875 -3.78125 2.410156 -3.710938 2.171875 -3.578125 C 1.941406 -3.453125 1.757812 -3.289062 1.625 -3.09375 C 1.5 -2.894531 1.4375 -2.6875 1.4375 -2.46875 C 1.4375 -2.1875 1.492188 -1.898438 1.609375 -1.609375 C 1.722656 -1.328125 1.890625 -1.09375 2.109375 -0.90625 C 2.335938 -0.726562 2.625 -0.640625 2.96875 -0.640625 Z M 2.96875 -0.640625';

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
      const allTrue = isGroupMatching.every(Boolean); // returns true if all are true
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
  moves.forEach((moveElement) => {
    // svgElement.appendChild(moveElement);
  });
  const updatedSVGString = new XMLSerializer().serializeToString(doc);
  return updatedSVGString;
};

/* istanbul ignore next */
// save molfile with source, should_fetch, should_move
export const saveMoveCanvas = async (
  editor,
  data,
  isFetchRequired,
  isMoveRequired,
  recenter = false,
) => {
  const dataCopy = data || latestData;
  if (editor) {
    // dataCopy = await applySelectedStruct(editor, dataCopy);
    if (recenter) {
      await editor.structureDef.editor.setMolecule(JSON.stringify(dataCopy));
    } else {
      await editor.structureDef.editor.setMolecule(JSON.stringify(dataCopy), { rescale: false });
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
    if (!textList.length) {
      await fetchKetcherData(editor);
      await editor._structureDef.editor.editor.renderAndRecoordinateStruct();
      await fetchKetcherData(editor);
      saveMoveCanvas(editor, latestData, true, true, false);
    }
    await fetchKetcherData(editor);
  } catch (err) {
    console.log('centerPositionCanvas', err.message);
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
  // if (placemenType === 'atom-placement') {
  //   imageNodes = await placeImageOnAtoms(molCopy, imageListCopy);
  // } else {
  //   imageNodes = await placeAtomOnImage(molCopy, imageListCopy);
  // }
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
    await centerPositionCanvas(editor);
    const canvasDataMol = await editor.structureDef.editor.getMolfile();
    await reArrangeImagesOnCanvas(iframeRef); // svg display
    const ket2Lines = await arrangePolymers(canvasDataMol); // polymers added
    const ket2LineTextArranged = await arrangeTextNodes(ket2Lines); // text node
    if (textList.length) textNodesFormula = await assembleTextDescriptionFormula(ket2LineTextArranged); // text node formula
    ket2LineTextArranged.push(KET_TAGS.fileEndIdentifier);
    const svgElement = await prepareSvg(editor);
    resetStore();
    return { ket2Molfile: ket2LineTextArranged.join('\n'), svgElement, textNodesFormula };
  } catch (e) {
    console.error('onSaveFileK2SC', e);
    return e.message;
  }
};

const onPasteNewShapes = async (editor, tempId, imageToBeAdded, iframeRef) => {
  const combo = [];
  combo.push({
    $ref: `mol${mols.length}`
  });
  if (imageToBeAdded) {
    const imageItem = await fetchSurfaceChemistryImageData(tempId);
    imageItem.boundingBox.y = -1.5250001907348631;
    imageItem.boundingBox.x = 1.5250000000000004;
    combo.push(imageItem);
  }
  imageUsedCounterSetter(imageNodeCounter + 1);
  if (!latestData) { latestDataSetter(emptyKetcherStore()); }
  latestData.root.nodes.push(...combo);
  latestData[`mol${mols.length}`] = await addNewMol(tempId, imageNodeCounter);
  saveMoveCanvas(editor, latestData, true, true, false);
  await buttonClickForRectangleSelection(iframeRef);
  FILOStackSetter([]);
  allAtomsSetter([]);
};

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
  onPasteNewShapes
};
