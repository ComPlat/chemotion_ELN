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
import { findTemplateIdCategoryFromTemplates } from 'src/utilities/ketcherSurfaceChemistry/iconBaseProvider';

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
  const A_PATH_ONE = '';
  const A_PATH_TWO = '';
  const struct = await replaceAliasWithRG({ ...latestData });
  const generateImageParams = { outputFormat: 'svg' };
  const parser = new DOMParser();
  const data = JSON.stringify(struct);
  const svgBlob = await editor.structureDef.editor.generateImage(data, generateImageParams);
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

// The complete processing function
function processJsonMolecules(jsonData, verticalThreshold = 1) {
  const result = [];
  const combinedParts = [];

  const nodeRefs = jsonData.root.nodes
    .filter((n) => n.$ref && jsonData[n.$ref]?.type === 'molecule')
    .map((n) => n.$ref);

  nodeRefs.forEach((ref, molIndex) => {
    const mol = jsonData[ref];
    if (!mol || !mol.atoms) {
      result.push(`Mol ${molIndex + 1}: (no atoms)`);
      return;
    }

    // ✅ Filter atoms with alias and extract alias part
    const validAtoms = mol.atoms
      .map((atom) => {
        if (!atom.alias) return null;
        const aliasParts = atom.alias.split('_');
        if (aliasParts.length < 2) return null;
        return {
          aliasPart: aliasParts[2],
          y: atom.location[1]
        };
      })
      .filter((atom) => atom !== null);

    if (validAtoms.length === 0) {
      result.push(`Mol ${molIndex + 1}: (no atoms)`);
      return;
    }

    const used = new Set();
    const verticalPairs = [];

    // Step 1: Pair vertical-close atoms using aliasPart
    for (let i = 0; i < validAtoms.length; i++) {
      if (used.has(i)) continue;

      let closestIndex = -1;
      let minDiff = Infinity;

      for (let j = 0; j < validAtoms.length; j++) {
        if (i === j || used.has(j)) continue;

        const yDiff = Math.abs(validAtoms[i].y - validAtoms[j].y);
        if (yDiff < verticalThreshold && yDiff < minDiff) {
          minDiff = yDiff;
          closestIndex = j;
        }
      }

      if (closestIndex !== -1) {
        const top = validAtoms[i].y > validAtoms[closestIndex].y ? i : closestIndex;
        const bottom = top === i ? closestIndex : i;

        verticalPairs.push(`${validAtoms[top].aliasPart}_${validAtoms[bottom].aliasPart}`);
        used.add(i);
        used.add(closestIndex);
      }
    }

    // Step 2: Unused atoms → add aliasParts directly
    const unusedStrings = validAtoms
      .map((atom, i) => (!used.has(i) ? atom.aliasPart : null))
      .filter((p) => p !== null);

    // Combine for this molecule
    const connString = [...verticalPairs, ...unusedStrings].join('/');
    result.push(`Mol ${molIndex + 1}: ${connString}`);
    if (connString) combinedParts.push(connString);
  });

  // Step 3: Final combined output
  const finalCombinedString = combinedParts.join('/');
  result.push(`Combined: ${finalCombinedString}`);

  return finalCombinedString;
}

const replaceAliasesWithIndexesAndCollectComponents = async (comboString) => {
  const textNodeStructureModified = {};
  const textNodeStructureForComponents = [];

  Object.keys(textNodeStruct).forEach((alias) => {
    const keyText = textNodeStruct[alias];
    const parts = alias.split('_');
    const textListAlias = textList;

    textListAlias.forEach(async (item) => {
      const { key, text } = JSON.parse(item.data.content).blocks[0];
      if (key === keyText) {
        textNodeStructureModified[parts[2]] = text;
        const categoryName = await findTemplateIdCategoryFromTemplates(parts[1]);
        textNodeStructureForComponents.push({ [text]: categoryName });
      }
    });
  });

  // Split by / first, then split by _ and flatten
  const replacedString = comboString
    .split('/')
    .map((part) => part
      .split('_')
      .map((num) => textNodeStructureModified[num]) // don't use || num
      .filter(Boolean) // remove undefined/null
      .join('_'))
    .filter(Boolean) // remove empty parts
    .join('/');
  return { replacedString, textNodeStructureForComponents };
};

const onFinalCanvasSave = async (editor, iframeRef) => {
  try {
    let textNodesFormula = '';
    let componentsListContainer = '';
    let ket2Lines = [];
    await centerPositionCanvas(editor);
    const canvasDataMol = await editor.structureDef.editor.getMolfile('V2000');
    const ketFormatData = JSON.parse(await editor.structureDef.editor.getKet());
    await reArrangeImagesOnCanvas(iframeRef); // assemble image on the canvas
    ket2Lines = await arrangePolymers(canvasDataMol, editor); // polymers added
    await arrangeTextNodes(ket2Lines); // text node
    if (textList?.length) {
      const molStrings = processJsonMolecules(ketFormatData);
      const { replacedString, textNodeStructureForComponents } = await replaceAliasesWithIndexesAndCollectComponents(molStrings);
      componentsListContainer = textNodeStructureForComponents;
      textNodesFormula = replacedString;
    }
    ket2Lines.push(KET_TAGS.fileEndIdentifier);
    const svgElement = await prepareSvg(editor);
    resetStore();
    return {
      ket2Molfile: ket2Lines.join('\n'),
      svgElement,
      textNodesFormula,
      componentsList: componentsListContainer,
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
  arrangeTextNodes,
  onAddText,
  prepareSvg,
  centerPositionCanvas,
  onTemplateMove,
  onFinalCanvasSave,
  onPasteNewShapes,
  getTitleSelector,
  saveMoveCanvas
};
