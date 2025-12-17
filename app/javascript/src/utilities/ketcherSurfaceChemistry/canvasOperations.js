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
import { ALIAS_PATTERNS, KET_TAGS, KET_DOM_TAG } from 'src/utilities/ketcherSurfaceChemistry/constants';
import { fetchKetcherData } from 'src/utilities/ketcherSurfaceChemistry/InitializeAndParseKetcher';
import { findAtomByImageIndex, handleAddAtom } from 'src/utilities/ketcherSurfaceChemistry/AtomsAndMolManipulation';
import {
  imageNodeForTextNodeSetter,
  buttonClickForRectangleSelection,
  runImageLayering,
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
  placeImageOnAtoms,
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

  for (const item of mols) {
    const textSeparator = KET_TAGS.textIdentifier;
    const atoms = latestData[item]?.atoms || [];

    for (const atom of atoms) {
      const textNodeKey = textNodeStruct[atom.alias];

      if (textNodeKey) {
        for (const textItem of textList) {
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
        }
      }
      atomCount += 1;
    }
  }

  if (!assembleTextList.length) return ket2Molfile;

  ket2Molfile.push(
    KET_TAGS.textNodeIdentifier,
    ...assembleTextList,
    KET_TAGS.textNodeIdentifierClose
  );

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
    const lastTextKey = JSON.parse(lastTextNode.data.content).blocks[0].key;

    // Skip if this text is already associated with another alias (e.g., from paste operation)
    const alreadyAssociated = Object.entries(textNodeStruct)
      .some(([existingAlias, key]) => key === lastTextKey && existingAlias !== alias);

    if (alreadyAssociated) {
      imageNodeForTextNodeSetter(null);
      return true;
    }

    lastTextNode.data.position = {
      x: atomLocation[0] + width / 2,
      y: atomLocation[1],
      z: atomLocation[2],
    };
    textList[textList.length - 1] = lastTextNode;
    textNodeStruct[alias] = lastTextKey;
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
const prepareSvg = async (editor) => {
  try {
    const struct = await replaceAliasWithRG({ ...latestData });
    const generateImageParams = { outputFormat: 'svg' };
    const parser = new DOMParser();
    const data = JSON.stringify(struct);
    const svgBlob = await editor.structureDef.editor.generateImage(data, generateImageParams);
    const svgString = await new Response(svgBlob).text();
    const doc = parser.parseFromString(svgString, 'image/svg+xml');
    const svg = new XMLSerializer().serializeToString(doc);
    return { svg, message: null };
  } catch (e) {
    return { svg: null, message: e?.message || 'Unknown error in prepareSvg' };
  }
};

// function to get SVG from canvas element without modification
const getSvgFromCanvas = async (iframeRef) => {
  try {
    const iframeDocument = iframeRef?.current?.contentWindow?.document;
    if (!iframeDocument) {
      return { svg: null, message: 'iframe document not available' };
    }

    const canvasElement = iframeDocument.querySelector('[data-testid="canvas"]');
    if (!canvasElement) {
      return { svg: null, message: 'Canvas element not found' };
    }

    // Clone the element to avoid modifying the original
    const clonedCanvas = canvasElement.cloneNode(true);

    // Remove layer placeholder rectangles (they inflate bounding box)
    const layerClasses = [
      'backgroundLayer', 'imagesLayer', 'selectionPlateLayer',
      'selectionPointsLayer', 'hoveringLayer', 'atomLayer',
      'bondSkeletonLayer', 'warningsLayer', 'dataLayer',
      'additionalInfoLayer', 'indicesLayer'
    ];
    layerClasses.forEach((cls) => {
      const el = clonedCanvas.querySelector(`.${cls}`);
      if (el) el.remove();
    });

    // Also remove desc and hidden text elements
    const descEl = clonedCanvas.querySelector('desc');
    if (descEl) descEl.remove();
    Array.from(clonedCanvas.querySelectorAll('text')).forEach((txt) => {
      if (txt.style.display === 'none') txt.remove();
    });

    // Process images similar to updateImagesInTheCanvas - move images to the end for proper layering
    const imageElements = Array.from(clonedCanvas.querySelectorAll(KET_DOM_TAG.imageTag));
    if (imageElements.length > 0) {
      // Remove all images from their current positions
      imageElements.forEach((img) => {
        if (img.parentNode) {
          img.parentNode.removeChild(img);
        }
      });

      // Re-append all images at the end to ensure they appear on top
      imageElements.forEach((img) => {
        clonedCanvas.appendChild(img);
      });
    }

    // Calculate bounding box from ORIGINAL canvas (getBBox needs DOM-attached elements)
    let minX = Infinity; let minY = Infinity; let maxX = -Infinity; let
      maxY = -Infinity;
    const visibleElements = canvasElement.querySelectorAll('path, image, text');
    visibleElements.forEach((el) => {
      // Skip layer placeholders and hidden elements
      if (el.classList && layerClasses.some((cls) => el.classList.contains(cls))) return;
      if (el.style.display === 'none') return;
      try {
        const elBbox = el.getBBox();
        if (elBbox.width > 0 && elBbox.height > 0) {
          minX = Math.min(minX, elBbox.x);
          minY = Math.min(minY, elBbox.y);
          maxX = Math.max(maxX, elBbox.x + elBbox.width);
          maxY = Math.max(maxY, elBbox.y + elBbox.height);
        }
      } catch (e) { /* ignore elements that can't get bbox */ }
    });

    // Fallback if no valid bbox found
    if (minX === Infinity || maxX === -Infinity) {
      const fallbackBbox = canvasElement.getBBox();
      minX = fallbackBbox.x;
      minY = fallbackBbox.y;
      maxX = fallbackBbox.x + fallbackBbox.width;
      maxY = fallbackBbox.y + fallbackBbox.height;
    }

    const padding = 5;
    const contentX = minX - padding;
    const contentY = minY - padding;
    const contentWidth = (maxX - minX) + (padding * 2);
    const contentHeight = (maxY - minY) + (padding * 2);

    // Output dimensions
    const outputWidth = 325;
    const outputHeight = 250;
    const outputAspect = outputWidth / outputHeight;
    const contentAspect = contentWidth / contentHeight;

    // Adjust viewBox to center content and fill the output while preserving aspect ratio
    let viewBoxX; let viewBoxY; let viewBoxWidth; let
      viewBoxHeight;

    if (contentAspect > outputAspect) {
      // Content is wider - fit to width, center vertically
      viewBoxWidth = contentWidth;
      viewBoxHeight = contentWidth / outputAspect;
      viewBoxX = contentX;
      viewBoxY = contentY - (viewBoxHeight - contentHeight) / 2;
    } else {
      // Content is taller - fit to height, center horizontally
      viewBoxHeight = contentHeight;
      viewBoxWidth = contentHeight * outputAspect;
      viewBoxX = contentX - (viewBoxWidth - contentWidth) / 2;
      viewBoxY = contentY;
    }

    // Set viewBox to fit the content centered, output size to 325x250
    clonedCanvas.setAttribute('viewBox', `${viewBoxX} ${viewBoxY} ${viewBoxWidth} ${viewBoxHeight}`);
    clonedCanvas.setAttribute('width', `${outputWidth}`);
    clonedCanvas.setAttribute('height', `${outputHeight}`);
    clonedCanvas.removeAttribute('transform');

    const serializer = new XMLSerializer();
    const svgString = serializer.serializeToString(clonedCanvas);

    return { svg: svgString, message: null };
  } catch (error) {
    console.error('getSvgFromCanvas: Error generating SVG', error);
    return { svg: null, message: error?.message || 'Unknown error in getSvgFromCanvas' };
  }
};

const applyCanvasDataToEditor = async (editor, dataCopy, recenter = false) => {
  if (!editor || !editor.structureDef) {
    console.error('Editor is undefined');
    return;
  }

  const serialized = JSON.stringify(dataCopy);
  if (recenter) {
    await editor.structureDef.editor.setMolecule(serialized);
    return;
  }
  await editor.structureDef.editor.setMolecule(serialized, { rescale: false });
};

/* istanbul ignore next */
// save molfile with source, should_fetch, should_move
const saveMoveCanvas = async (
  editor,
  data,
  isFetchRequired,
  isMoveRequired,
  recenter = false,
  moveOptions = {}
) => {
  const dataCopy = data || latestData;
  if (!editor || !editor.structureDef) {
    console.error('Editor is undefined');
    return;
  }
  if (!dataCopy) {
    console.warn('saveMoveCanvas called without canvas data');
    return;
  }

  if (isMoveRequired) {
    await applyCanvasDataToEditor(editor, dataCopy, recenter);
    if (isFetchRequired) {
      await fetchKetcherData(editor);
    }
    await onTemplateMove(editor, recenter, moveOptions);
    return;
  }

  await applyCanvasDataToEditor(editor, dataCopy, recenter);

  if (isFetchRequired) {
    await fetchKetcherData(editor);
  }
  await runImageLayering();
};

const centerPositionCanvas = async (editor) => {
  try {
    const clone = editor._structureDef.editor.editor.struct().clone();
    await editor._structureDef.editor.editor.renderAndRecoordinateStruct(clone);
    await fetchKetcherData(editor);
    // syncImagesOnly: true ensures images follow the re-centered atom positions
    saveMoveCanvas(editor, latestData, true, true, false, { syncImagesOnly: true });
    await fetchKetcherData(editor);
  } catch (err) {
    await fetchKetcherData(editor);
    console.error('centerPositionCanvas', err.message);
  }
};

const onTemplateMove = async (editor, recenter = false, options = {}) => {
  if (!editor || !editor.structureDef) return;
  const { syncImagesOnly = false } = options;

  // for tool bar button events - but skip recentering when only syncing images
  if (!recenter && !syncImagesOnly && (imageListCopyContainer.length || textListCopyContainer.length)) {
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
  if (syncImagesOnly) {
    imageNodes = await placeImageOnAtoms(molCopy, imageListCopy);
  } else {
    imageNodes = await placeAtomOnImage(molCopy, imageListCopy);
  }
  latestData.root.nodes = imageNodes;

  // Always reposition text nodes to follow atom positions
  if (textListCopy.length > 0) {
    const textNodes = await placeTextOnAtoms(molCopy, textListCopy);
    latestData.root.nodes = textNodes;
  }
  await applyCanvasDataToEditor(editor, latestData, recenter);
  await fetchKetcherData(editor);

  // clear required
  ImagesToBeUpdatedSetter(true); // perform image layer in DOM
  reloadCanvasSetter(false);
  deletedAtomsSetter([]);
  imageListCopyContainerSetter([]);
  textListCopyContainerSetter([]);
  await runImageLayering();
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

    // Extract alias parts and y positions
    const validAtoms = mol.atoms
      .map((atom) => {
        if (!atom.alias) return null;
        const aliasParts = atom.alias.split('_');
        if (aliasParts.length < 3) return null;
        return {
          aliasPart: aliasParts[2],
          y: atom.location[1]
        };
      })
      .filter(Boolean);

    if (validAtoms.length === 0) {
      result.push(`Mol ${molIndex + 1}: (no atoms)`);
      return;
    }

    // Sort by y descending (highest first)
    validAtoms.sort((a, b) => b.y - a.y);

    const used = new Set();
    const parts = [];

    for (let i = 0; i < validAtoms.length; i++) {
      if (used.has(i)) continue;

      let paired = false;
      for (let j = i + 1; j < validAtoms.length; j++) {
        if (used.has(j)) continue;

        const yDiff = Math.abs(validAtoms[i].y - validAtoms[j].y);
        if (yDiff <= verticalThreshold) {
          // Pair them with '_' and put the higher component first
          parts.push(`${validAtoms[i].aliasPart}_${validAtoms[j].aliasPart}`);
          used.add(i);
          used.add(j);
          paired = true;
          break;
        }
      }

      if (!paired) {
        parts.push(validAtoms[i].aliasPart);
        used.add(i);
      }
    }

    const connString = parts.join('/');
    result.push(`Mol ${molIndex + 1}: ${connString}`);
    if (connString) combinedParts.push(connString);
  });

  const finalCombinedString = combinedParts.join('/');
  result.push(`Combined: ${finalCombinedString}`);

  return finalCombinedString;
}

const replaceAliasesWithIndexesAndCollectComponents = async (comboString) => {
  const textNodeStructureModified = {};
  const textNodeStructureForComponents = [];

  for (const alias of Object.keys(textNodeStruct)) {
    const keyText = textNodeStruct[alias];
    const parts = alias.split('_');
    for (const item of textList) {
      const { key, text } = JSON.parse(item.data.content).blocks[0];
      if (key === keyText) {
        textNodeStructureModified[parts[2]] = text;
        const categoryName = await findTemplateIdCategoryFromTemplates(parts[1]);
        textNodeStructureForComponents.push({ [text]: categoryName });
      }
    }
  }

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

    const canvasDataMol = await editor.structureDef.editor.getMolfile('V2000');
    const ketFormatData = JSON.parse(await editor.structureDef.editor.getKet());
    await reArrangeImagesOnCanvas(iframeRef); // assemble image on the canvas
    ket2Lines = await arrangePolymers(canvasDataMol, editor); // polymers added
    ket2Lines = await arrangeTextNodes(ket2Lines); // text node
    if (textList?.length) {
      const molStrings = processJsonMolecules(ketFormatData);
      const {
        replacedString,
        textNodeStructureForComponents
      } = await replaceAliasesWithIndexesAndCollectComponents(molStrings);
      componentsListContainer = textNodeStructureForComponents;
      textNodesFormula = replacedString;
    }
    ket2Lines.push(KET_TAGS.fileEndIdentifier);
    const svgElement = imagesList.length ? await getSvgFromCanvas(iframeRef) : await prepareSvg(editor);
    resetStore();
    return {
      ket2Molfile: ket2Lines.join('\n'),
      svgElement,
      textNodesFormula,
      componentsList: componentsListContainer,
    };
  } catch (e) {
    return {
      ket2Molfile: '',
      svgElement : {svg: null, message: e?.message || 'Unknown error in prepareSvg' },
      textNodesFormula: '',
      componentsList: [],
    };
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
  centerPositionCanvas,
  onTemplateMove,
  onFinalCanvasSave,
  onPasteNewShapes,
  getTitleSelector,
  saveMoveCanvas,
};
