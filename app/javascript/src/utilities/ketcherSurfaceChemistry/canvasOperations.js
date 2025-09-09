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
  imageUsedCounterSetter,
  imageNodeCounter,
  latestDataSetter
} from 'src/components/structureEditor/KetcherEditor';
import { ALIAS_PATTERNS, KET_TAGS } from 'src/utilities/ketcherSurfaceChemistry/constants';
import { handleAddAtom } from 'src/utilities/ketcherSurfaceChemistry/AtomsAndMolManipulation';
import { fetchKetcherData } from 'src/utilities/ketcherSurfaceChemistry/InitializeAndParseKetcher';
import {
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
    await editor._structureDef.editor.editor.renderAndRecoordinateStruct();
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
    await centerPositionCanvas(editor);
    const canvasDataMol = await editor.structureDef.editor.getMolfile();
    await reArrangeImagesOnCanvas(iframeRef); // svg display
    const ket2Lines = await arrangePolymers(canvasDataMol); // polymers added
    ket2Lines.push(KET_TAGS.fileEndIdentifier);
    const svgElement = await prepareSvg(editor);
    resetStore();
    return {
      ket2Molfile: ket2Lines.join('\n'),
      svgElement,
      textNodesFormula: '',
    };
  } catch (e) {
    console.error('onSaveFileK2SC', e);
    return e.message;
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
  prepareSvg,
  centerPositionCanvas,
  onTemplateMove,
  onFinalCanvasSave,
  onPasteNewShapes,
  getTitleSelector,
};
