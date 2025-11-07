/* eslint-disable no-use-before-define */
/* eslint-disable no-underscore-dangle */
/* eslint-disable no-restricted-syntax */
/* eslint-disable no-param-reassign */
/* eslint-disable no-plusplus */
/* eslint-disable radix */
import { templateAliasesPrepare } from 'src/utilities/ketcherSurfaceChemistry/PolymersTemplates';
import {
  latestData,
  resetStore,
  imageUsedCounterSetter,
  imageNodeCounter,
  latestDataSetter
} from 'src/components/structureEditor/KetcherEditor';
import { ALIAS_PATTERNS, KET_TAGS } from 'src/utilities/ketcherSurfaceChemistry/constants';
import { fetchKetcherData } from 'src/utilities/ketcherSurfaceChemistry/InitializeAndParseKetcher';
import { findAtomByImageIndex, handleAddAtom } from 'src/utilities/ketcherSurfaceChemistry/AtomsAndMolManipulation';
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

// function when a canvas is saved using main "SAVE" button
const arrangePolymers = async (canvasData, editor) => {
  // grab image index
  // find index for alias
  // on matching create a string to be attached with polymers sections
  const listOfAtomsWithAlias = [];
  const data = JSON.parse(await editor.structureDef.editor.getKet());
  mols
    .flatMap((item) => data[item]?.atoms ?? [])
    .filter((i) => ALIAS_PATTERNS.threeParts.test(i.alias))
    .forEach((i) => listOfAtomsWithAlias.push(i.alias));
  const processString = await templateAliasesPrepare(listOfAtomsWithAlias);
  return [...canvasData.split('\n'), KET_TAGS.polymerIdentifier, processString];
};

// helper function to arrange text nodes for formula
const arrangeTextNodes = async (ket2Molfile) => {
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
  if (!assembleTextList.length) return ket2Molfile;
  ket2Molfile.push(KET_TAGS.textNodeIdentifier, ...assembleTextList, KET_TAGS.textNodeIdentifierClose);
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

  const atomNumbersConnectWith_ = [];
  const indicesKeys = Object.keys(indicesMap);
  for (let atom = 0; atom < indicesKeys.length; atom++) {
    const connectedAtoms = indicesMap[atom];
    if (connectedAtoms.length > 1) {
      atomNumbersConnectWith_.push(...connectedAtoms);
    }
  }

  const textNodesPairs = await collectTextListing(ket2Lines, startTextNode, endTextNode);

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
  try {
    const regex = /source-\d+/;
    const A_PATH_ONE = '';
    const A_PATH_TWO = '';
    const generateImageParams = {outputFormat: 'svg'};
    const parser = new DOMParser();
    const canvasDataMol = await editor.structureDef.editor.getMolfile('V2000');

    const svgBlob = await editor.structureDef.editor.generateImage(canvasDataMol, generateImageParams)
      .catch((err) => { throw new Error(err); });

    const svgString = await new Response(svgBlob).text();
    const doc = parser.parseFromString(svgString, 'image/svg+xml');
    const uses = doc.querySelectorAll('*');
    const glyphs = doc.querySelectorAll("g[id^='glyph-']");
    const matchingGlyphs = [];
    const moves = [];

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
          const useEach = use.getAttributeNS('http://www.w3.org/1999/xlink', 'href')?.replace('#', '');
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
    return { svg: updatedSVGString };
  } catch (e) {
    return { svg: null, message: e.message };
  }
};

/* istanbul ignore next */
// save molfile with source, should_fetch, should_move
const saveMoveCanvas = async (editor, data, isFetchRequired, isMoveRequired, recenter = false) => {
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
    const clone = editor._structureDef.editor.editor.struct().clone();
    await editor._structureDef.editor.editor.renderAndRecoordinateStruct(clone);
    await fetchKetcherData(editor);
    saveMoveCanvas(editor, latestData, true, true, false);
    await fetchKetcherData(editor);
  } catch (err) {
    await fetchKetcherData(editor);
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

  if (textListCopy.length > 0) {
    const textNodes = await placeTextOnAtoms(molCopy, textListCopy);
    latestData.root.nodes = textNodes;
  }

  await saveMoveCanvas(editor, latestData, true, false, recenter);

  // clear required
  ImagesToBeUpdatedSetter(true); // perform image layer in DOM
  reloadCanvasSetter(false);
  deletedAtomsSetter([]);
  imageListCopyContainerSetter([]);
  textListCopyContainerSetter([]);
};

const attachSVG = async (data, editor) => ({
  ...data,
  svgElement: await prepareSvg(editor)
});

const onFinalCanvasSave = async (editor, iframeRef) => {
  let ket2Lines = [];
  let textNodesFormula = '';

  try {
    await centerPositionCanvas(editor);
    const canvasDataMol = await editor.structureDef.editor.getMolfile('V2000').catch((err) => { throw new Error(err); });
    await reArrangeImagesOnCanvas(iframeRef); // assemble image on the canvas
    ket2Lines = await arrangePolymers(canvasDataMol, editor); // polymers added
    await arrangeTextNodes(ket2Lines); // text node
    if (textList?.length) textNodesFormula = await assembleTextDescriptionFormula(ket2Lines, editor); // process string labels
    ket2Lines.push(KET_TAGS.fileEndIdentifier);
    resetStore();
    return attachSVG({
      ket2Molfile: ket2Lines.join('\n'),
      textNodesFormula,
    }, editor);
  } catch (e) {
    return attachSVG({
      ket2Molfile: '',
      textNodesFormula: '',
    }, editor);
  }
};

const onPasteNewShapes = async (editor, tempId, imageToBeAdded, iframeRef) => {
  const molCount = mols.length;
  const imageCount = imagesList.length;
  if (!latestData) latestDataSetter(emptyKetcherStore());

  if (imageToBeAdded) {
    // image header
    // mol headers
    // mol body
    imageUsedCounterSetter(imageCount);
    const imageItem = await fetchSurfaceChemistryImageData(tempId);
    imageItem.boundingBox = { ...imageItem.boundingBox, x: 1.525, y: -1.5250001907348631 };
    latestData.root.nodes.push({ $ref: `mol${molCount}` });
    latestData.root.nodes.push(imageItem);
    latestData[`mol${molCount}`] = await addNewMol(tempId);
  } else if (imageCount - 1 !== imageNodeCounter) {
    // header
    // atom
    if (imageCount - 1 > imageNodeCounter) {
      imageUsedCounterSetter(imageNodeCounter + 1);
      if (!latestData[`mol${molCount}`]) {
        latestData.root.nodes.push({ $ref: `mol${molCount}` });
        latestData[`mol${molCount}`] = await addNewMol(tempId);
      }
    }
  }

  saveMoveCanvas(editor, latestData, true, true, false);

  await buttonClickForRectangleSelection(iframeRef);
  FILOStackSetter([]);
  allAtomsSetter([]);
};

const getTitleSelector = (title) => `[title='${title.replace(/\(/g, '\\(').replace(/\)/g, '\\)')}']`;

export {
  arrangePolymers,
  onAddAtom,
  onDeleteText,
  arrangeTextNodes,
  assembleTextDescriptionFormula,
  onAddText,
  prepareSvg,
  centerPositionCanvas,
  onTemplateMove,
  onFinalCanvasSave,
  onPasteNewShapes,
  getTitleSelector,
  saveMoveCanvas
};
