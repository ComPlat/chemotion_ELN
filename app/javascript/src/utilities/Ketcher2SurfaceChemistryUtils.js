/* eslint-disable no-await-in-loop */
/* eslint-disable no-plusplus */
/* eslint-disable radix */
/* eslint-disable no-use-before-define */
/* eslint-disable no-restricted-syntax */
/* eslint-disable no-param-reassign */
/* eslint-disable import/no-mutable-exports */
import { loadKetcherData, mols, imagesList, latestData } from 'src/components/structureEditor/KetcherEditor';
import { textNodeStruct } from '../components/structureEditor/KetcherEditor';

// pattern's for alias identification
const ALIAS_PATTERNS = Object.freeze({
  threeParts: /t_\d{1,3}_\d{1,3}/,
  twoParts: /^t_\d{1,3}$/
});

// enable/disable text labels Matching label A and putting images in the end
const LAYERING_FLAGS = Object.freeze({
  skipTemplateName: false,
  skipImageLayering: false
});

// tags
const KET_TAGS = Object.freeze({
  inspiredLabel: 'A',
  RGroupTag: 'R#',
  templateSurface: 5,
  templateBead: 1,
  polymerIdentifier: '> <PolymersList>',
  textNodeIdentifier: '> <TextNode>',
  textNodeIdentifierClose: '> </TextNode>',
  fileEndIdentifier: '$$$$',
  molfileHeaderLinenumber: 4,
  rgLabel: 'rg-label',
  shapes: ['Bead', 'Surface'],
  moleculeIdentifier: '> <MoleculesList>', // New tag
  textIdentifier: "#",
  templateEditProps: {
    text: 'You are adding a text description to the selected template',
    id: 'templateSelectedInfo'
  }
});

// image exists in dom
let ImagesToBeUpdated = false;

// allowed to process based on atom
let allowProcessing = true;

// Helper to initialize Ketcher data
const initializeKetcherData = async (data) => {
  try {
    await loadKetcherData(data);
  } catch (err) {
    throw new Error(`Failed to initialize Ketcher data: ${err.message}`);
  }
};

// helper function to examine the file coming ketcher rails
const hasKetcherData = async (molfile) => {
  if (!molfile) {
    console.error('Invalid molfile source.');
    return null;
  }

  try {
    const lines = molfile.trim().split('\n');
    const polymerLine = lines.reverse().find((line) => line.includes(KET_TAGS.polymerIdentifier));
    return polymerLine ? lines[lines.indexOf(polymerLine) - 1]?.trim() || null : null;
  } catch (err) {
    console.error('Opening this molfile is not correct. Please report this molfile to dev team.');
    return null;
  }
};

// helper function to examine the file coming ketcher rails
const hasTextNodes = async (molfile) => {
  if (!molfile) {
    console.error('Invalid molfile source.');
    return null;
  }
  try {
    const lines = molfile.trim().split('\n');
    const start = lines.indexOf(KET_TAGS.textNodeIdentifier);
    const end = lines.indexOf(KET_TAGS.textNodeIdentifierClose);
    const sliceOfTextNodes = lines.slice(start + 1, end);
    return sliceOfTextNodes;
  } catch (err) {
    console.error('Opening this molfile is not correct. Please report this molfile to dev team.');
    return null;
  }
};

// Helper to determine template type based on polymer value
const getTemplateType = (polymerValue) => {
  const hasSurface = polymerValue.includes('s');
  const templateSplits = polymerValue.split('/');
  if (!hasSurface) {
    return { type: templateSplits[1], size: templateSplits[2] };
  }
  const binaryTemplates = hasSurface ? KET_TAGS.templateSurface : KET_TAGS.templateBead;
  return { type: binaryTemplates, size: templateSplits[1] };
};

// Helper to update an atom with K2SC labels and aliases
const updateAtom = (atomLocation, templateType, imageCounter) => ({
  label: KET_TAGS.inspiredLabel,
  alias: `t_${templateType}_${imageCounter}`,
  location: atomLocation
});

// Helper to create a bounding box for a template with atom location
const templateWithBoundingBox = async (templateType, atomLocation, templateSize) => {
  const template = await fetchSurfaceChemistryImageData(templateType);
  const defaultSize = [template.boundingBox.height, template.boundingBox.width];
  const [height, width] = templateSize?.split('-') || defaultSize;
  template.boundingBox.x = atomLocation[0];
  template.boundingBox.y = atomLocation[1];
  template.boundingBox.z = 0;
  template.boundingBox.height = height * 1;
  template.boundingBox.width = width * 1;
  return template;
};

// helper function to process ketcher-rails files and adding image to ketcher2 canvas
const addingPolymersToKetcher = async (railsPolymersList, data, imageNodeCounter) => {
  try {
    const polymerList = railsPolymersList.split(' '); // e.g., ["10", "11s", "12", "13s"]
    let visitedAtoms = 0;
    const collectedImages = [];
    await initializeKetcherData(data);

    // eslint-disable-next-line no-restricted-syntax
    for (const molName of mols) {
      const molecule = data[molName];
      for (let atomIndex = 0; atomIndex < molecule.atoms.length; atomIndex++) {
        const atom = molecule.atoms[atomIndex];
        const polymerItem = polymerList[visitedAtoms];
        if (polymerItem && polymerItem.split("/").length >= 2 && (atom.type === KET_TAGS.rgLabel || ALIAS_PATTERNS.threeParts.test(atom.label))) {
          // counters
          imageNodeCounter += 1;
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
    return { c_images: collectedImages, molfileData: data, image_counter: imageNodeCounter };
  } catch (err) {
    console.error({ err: err.message });
    return null;
  }
};

// helper function to fetch list of all surface chemistry shape/image list
const fetchSurfaceChemistryImageData = async (templateId) => {
  const response = await fetch('/json/surfaceChemistryShapes.json');
  const data = await response.json();
  for (const tab of data) {
    for (const subTab of tab.subTabs) {
      for (const shape of subTab.shapes) {
        if (shape.template_id === parseInt(templateId)) {
          const constructImageObj = {
            type: 'image',
            format: 'image/svg+xml',
            boundingBox: {
              width: shape.width,
              height: shape.height,
              x: 8.700000000000001,
              y: -5.824999999999999,
              z: 0
            },
            data: shape.payload
          };
          return constructImageObj;
        }
      }
    }
  }
  return null; // Return null if no matching template_id found
};

// helper function to return a new template-image for imagesList with new location
const prepareImageFromTemplateList = async (idx, location) => {
  const template = await fetchSurfaceChemistryImageData(idx);
  if (!template) {
    console.error('template not found', template);
    return null;
  }
  template.boundingBox.x = location[0];
  template.boundingBox.y = location[1];
  template.boundingBox.z = location[2];
  return template;
};

// helper function to update counter for other mols when a image-template is removed
const resetOtherAliasCounters = (atom, molList, latestData) => {
  for (let m = 0; m < molList?.length; m++) {
    const mol = molList[m];
    const atoms = latestData[mol]?.atoms;
    for (let a = 0; a < atoms?.length; a++) {
      const item = atoms[a];
      if (ALIAS_PATTERNS.threeParts.test(item.alias)) {
        const atomSplits = atom?.alias?.split('_');
        const itemSplits = item?.alias?.split('_');
        if (parseInt(atomSplits[2]) <= parseInt(itemSplits[2])) {
          if (parseInt(itemSplits[2]) !== 0) {
            const stepBack = parseInt(itemSplits[2]) - 1;
            const newAlias = `${itemSplits[0]}_${itemSplits[1]}_${stepBack}`;
            atoms[a].alias = newAlias;
          }
        }
      }
    }
  }
  return latestData;
};

// to find is new atom
const isNewAtom = (eventItem) => eventItem.label === KET_TAGS.inspiredLabel;

// filter out mol-node from ket2 format
const removeMoleculeFromData = (data, molKey) => data.root.nodes.filter((node) => node.$ref !== molKey);

// filter images from nodes
const removeImagesFromData = (data) => data.root.nodes.filter((node) => node.type !== 'image');

// filter images from nodes
const removeTextFromData = (data) => data.root.nodes.filter((node) => node.type !== 'text');

// Updates atom aliases in a molecule after removing certain images and updates the molecule data.
const updateMoleculeAliases = async (container, atomList) => {
  for (const imgIdx of container) {
    for (let i = 0; i < atomList.length; i++) {
      const atom = atomList[i];
      if (ALIAS_PATTERNS.threeParts.test(atom.alias)) {
        const splits = atom.alias.split('_');
        if (parseInt(splits[2]) > imgIdx) {
          const newValue = `t_${splits[1]}_${parseInt(splits[2]) - 1}`;
          const oldValue = `t_${splits[1]}_${parseInt(splits[2])}`;
          const textNode = textNodeStruct[oldValue];
          if (textNode) {
            textNodeStruct[newValue] = textNode;
            delete textNodeStruct[oldValue];
          }
          atomList[i].alias = newValue;
        }
      }
    }
  }
  return atomList;
};

// helper function to remove bonds by atom id
const updateBondList = (indexToMatch, bondList) => {
  // Update bonds to reflect the removal of the atom
  const list = [];
  for (const ba of bondList) {
    if (!ba.atoms.includes(indexToMatch)) {
      const adjustedAtoms = ba.atoms.map((j) => (j > indexToMatch ? j - 1 : j));
      list.push({ ...ba, atoms: adjustedAtoms });
    }
  }
  return list;
};

// Removes atoms that match image index, updates bonds, and collects removed indices.
const removeAndUpdateAtoms = async (atomsList, bondsList, images, container) => {
  let imageFoundIndex = 0;

  // Iterate backwards to avoid index-shifting issues
  for (let i = atomsList.length - 1; i >= 0; i--) {
    const atom = atomsList[i];

    if (atom?.alias && atom.label === KET_TAGS.inspiredLabel) {
      const imgIndex = parseInt(atom.alias.split('_')[2]);
      if (images.has(imgIndex)) {
        container.add(imgIndex);
        bondsList = updateBondList(i, bondsList); // Update bonds to reflect the removal of the atom
        atomsList.splice(i, 1); // Remove the atom
        imageFoundIndex++; // Increment counter for found images
      }
    }
  }
  return {
    updatedAtoms: atomsList,
    updatedBonds: bondsList,
    removedIndices: container,
    removedCount: imageFoundIndex,
    selectedImageList: images
  };
};

// Updates molecule data or removes it from the dataset based on the atoms list.
const updateOrRemoveMolecule = async (molecule, container, atomsList, bondsList) => {
  // Molecule has atoms, update its data
  molecule.atoms = await updateMoleculeAliases(container, atomsList);
  molecule.bonds = bondsList;
  return molecule;
};

// remove atoms from the template-list with alias,
const removeImageTemplateAtom = async (images, molList, data) => {
  try {
    const removeIndexList = new Set();
    let imageFoundIndexCount = 0;

    for (const molKey of molList) {
      const molecule = data[molKey];
      // if (!molecule || !molecule.atoms) continue;
      if (molecule && molecule.atoms) {
        const atomList = molecule?.atoms || [];
        const bondList = molecule?.bonds || [];

        // step 1: remove atoms and bonds based on images list
        const {
          updatedAtoms, updatedBonds, removedIndices, removedCount
          // eslint-disable-next-line no-await-in-loop
        } = await removeAndUpdateAtoms(atomList, bondList, images, removeIndexList);

        // step 2: data filler
        imageFoundIndexCount += removedCount; // Update total found count
        removedIndices.forEach((item) => removeIndexList.add(item)); // updated remove indices

        // step 3: Updates molecule data or delete atoms if empty
        if (atomList.length) {
          data[molKey] = await updateOrRemoveMolecule(molecule, removeIndexList, updatedAtoms, updatedBonds);
        } else {
          // Molecule has no atoms, remove it from the data
          data.root.nodes = removeMoleculeFromData(data, molKey);
          delete data[molKey];
        }
      }
    }
    return { data, imageFoundIndexCount };
  } catch (err) {
    console.error('removeImageTemplateAtom', err.message);
    return null;
  }
};

// helper function to find atom in ket format by image idx referenced with alias 3rd part
const findAtomByImageIndex = async (imgIdx) => {
  for (const molName of mols) {
    const molecule = latestData[molName];
    for (let atomIndex = 0; atomIndex < molecule.atoms.length; atomIndex++) {
      const atom = molecule.atoms[atomIndex];
      if (ALIAS_PATTERNS.threeParts.test(atom.alias)) {
        const aliasLastPart = parseInt(atom.alias.split("_")[2]);
        if (imgIdx === aliasLastPart) return { atomLocation: atom.location, alias: atom.alias };
      }
    }
  }
  return { atomLocation: null, alias: '' };
};

// collect polymers atom list from molfile
const processAtomLines = async (linesCopy, atomStarts, atomsCount) => {
  const atomAliasList = [];

  for (let i = atomStarts; i < atomsCount + atomStarts; i++) {
    const line = linesCopy[i].split(' ');
    const idx = line.indexOf(KET_TAGS.inspiredLabel);
    if (idx !== -1) {
      line[idx] = KET_TAGS.RGroupTag;
      atomAliasList.push(`${i - atomStarts}`);
    }
    linesCopy[i] = line.join(' ');
  }
  return { linesCopy, atomAliasList };
};

/* attaching polymers list is ketcher rails standards to a molfile
  s => S means its a surface polymers
  final output is expected a string:  "11 12s 13"
*/
const reAttachPolymerList = async ({
  lines, atomsCount, additionalDataStart, additionalDataEnd
}) => {
  let lineCopy = [...lines];
  const aliasesList = [];
  for (let i = additionalDataStart; i <= additionalDataEnd; i++) {
    if (ALIAS_PATTERNS.threeParts.test(lines[i])) {
      aliasesList.push(lines[i - 1], lines[i]);
      lines.splice(i - 1, 2); // Remove 2 elements starting from index i - 1
      i -= 2;
    }
  }

  // change atoms to R# for ketcher rails compatibilty
  const { linesCopy, atomAliasList } = await processAtomLines(lines, KET_TAGS.molfileHeaderLinenumber, atomsCount);

  // helper to combine and prepare alias into a polymer list
  // 0/3/1.30-1.28 7/1/0.90-0.91 => 2 aliases combined with space to form a string
  // 0/3/1.30-1.28 => what a single alias has atomIndex/template#/height-width
  const preparedAliasPolymerLine = await templateAliasesPrepare(aliasesList, atomAliasList);
  const collectedLines = [KET_TAGS.polymerIdentifier, preparedAliasPolymerLine];
  linesCopy.splice(lineCopy.length, 0, ...collectedLines);
  return linesCopy;
};


// helper to combine and prepare alias into a polymer list
const templateAliasesPrepare = async (aliasesList, atomAliasList) => {
  let counter = 0;

  for (let i = 1; i < aliasesList.length; i += 2) {
    if (ALIAS_PATTERNS.threeParts.test(aliasesList)) {
      const templateId = parseInt(aliasesList[i].split('_')[1]);
      const imagePlace = parseInt(aliasesList[i].split('_')[2]);
      const { height, width } = imagesList[imagePlace]?.boundingBox;
      if (templateId) {
        atomAliasList[counter] += templateId === KET_TAGS.templateSurface ? 's' : `/${templateId}`;
        atomAliasList[counter] += `/${height.toFixed(2)}-${width.toFixed(2)}`;
        counter++;
      }
    }
  }
  return atomAliasList.join(' ');
};

// DOM functions
// Function to attach click listeners based on titles
/* istanbul ignore next */
const attachListenerForTitle = (iframeDocument, selector, buttonEvents) => {
  const button = iframeDocument.querySelector(selector);
  if (button && !button.hasClickListener) {
    button.addEventListener('click', buttonEvents[selector]);
    button.hasClickListener = true;
  }
};

/* istanbul ignore next */
// function to make template list extra content hidden
const makeTransparentByTitle = (iframeDocument) => {
  const elements = iframeDocument.querySelectorAll('[title]');
  /* istanbul ignore next */
  elements.forEach((element) => {
    if (KET_TAGS.shapes.indexOf(element.getAttribute('title')) !== -1) {
      element.querySelectorAll('path, text').forEach((child) => {
        if (
          (child.getAttribute('stroke-width') === '2'
            && child.getAttribute('stroke-linecap') === 'round'
            && child.getAttribute('stroke-linejoin') === 'round')
          || (
            child.tagName.toLowerCase() === 'text'
            && (child.textContent.trim() === 'R1' || child.textContent.trim() === 'A')
          )
        ) {
          child.style.opacity = '0';
        }
      });
    }
  });
};

/* istanbul ignore next */
// function to disable canvas button based on title
const disableButton = (iframeDocument, title) => {
  const button = iframeDocument.querySelector(`[title="${title}"]`);
  if (button) {
    button.setAttribute('disabled', true);
    button.classList.add('disabled');
  }
};

/* istanbul ignore next */
// helper function to update DOM images using layering technique
const updateImagesInTheCanvas = async (iframeRef) => {
  if (iframeRef.current) {
    const iframeDocument = iframeRef.current.contentWindow.document;
    const svg = iframeDocument.querySelector('svg'); // Get the main SVG tag
    if (svg) {
      const imageElements = iframeDocument.querySelectorAll('image'); // Select all text elements
      imageElements.forEach((img) => {
        svg?.removeChild(img);
      });

      imageElements.forEach((img) => {
        svg?.appendChild(img);
      });
    }
    ImagesToBeUpdated = false;
  }
};

/* istanbul ignore next */
// helper function to update text > span > t_###_### fill transparent
const updateTemplatesInTheCanvas = async (iframeRef) => {
  const iframeDocument = iframeRef.current.contentWindow.document;
  const svg = iframeDocument.querySelector('svg'); // Get the main SVG tag
  if (svg) {
    const textElements = svg.querySelectorAll('text'); // Select all text elements
    textElements.forEach((textElem) => {
      const { textContent } = textElem; // Get the text content of the <text> element
      if (textContent === KET_TAGS.inspiredLabel) { // Check if it matches the pattern
        textElem.setAttribute('fill', 'transparent'); // Set fill to transparent
      }
    });
  }
};

// helper function to handle ketcher undo DOM element
const undoKetcher = (editor) => {
  try {
    const list = [...editor._structureDef.editor.editor.historyStack];
    const { historyPtr } = editor._structureDef.editor.editor;
    let operationIdx = 0;
    for (let i = historyPtr - 1; i >= 0; i--) {
      if (list[i]?.operations[0]?.type !== 'Load canvas') {
        break;
      } else {
        operationIdx++;
      }
    }
    for (let j = 0; j < operationIdx; j++) {
      editor._structureDef.editor.editor.undo();
    }
  } catch (error) {
    console.error({ undo: error });
  }
};

// helper function to handle ketcher undo DOM element
const redoKetcher = (editor) => {
  try {
    const list = [...editor._structureDef.editor.editor.historyStack];
    const { historyPtr } = editor._structureDef.editor.editor;
    let operationIdx = 1;

    for (let i = historyPtr; i < list.length; i++) {
      if (list[i]?.operations[0]?.type !== 'Load canvas') {
        break;
      } else {
        operationIdx++;
      }
    }
    for (let j = 0; j < operationIdx; j++) {
      editor._structureDef.editor.editor.redo();
    }
    setTimeout(async () => {
      await fetchKetcherData(editor);
      const data = await handleAddAtom(); // rebase atom aliases
      await saveMoveCanvas(editor, data, false, true);
    }, [500]);
  } catch (error) {
    console.error({ redo: error });
  }
};

// helper function on layout to keep the images on the latest styles
const mainImageSizingOnRerender = async (editor, images, oldLatestData) => {
  try {
    // fetch latest data
    // update old images on the root list
    // place images on A atoms
    // save molfile
    // await placeImageOnAtoms(mols, images, editor);
    const imagesL = removeImagesFromData(oldLatestData);
    oldLatestData.root.nodes.push(imagesL);
    await editor.structureDef.editor.setMolecule(JSON.stringify(oldLatestData));
  } catch (error) {
    console.error({ mainImageSizingOnRerender: error });
  }
};

const addTextNodeDescriptionOnTextPopup = async (node) => {
  if (node?.classList?.contains('Select-module_selectContainer__yXT-t') && node?.classList?.contains('Modal-module_modalOverlay__AzVeg')) {
    // Your existing logic
    const parentElement = node.querySelector('.Dialog-module_body__EWh4H.Dialog-module_withMargin__-zVS4');


    let newParagraph;  // Declare the variable to store the added paragraph

    if (parentElement) {  // Ensure showTextNode is used properly
      newParagraph = document.createElement('p');
      const firstChild = parentElement.lastChild;
      newParagraph.id = KET_TAGS.templateEditProps.id; // Add an ID to the paragraph

      newParagraph.textContent = KET_TAGS.templateEditProps.text;
      parentElement.insertBefore(newParagraph, firstChild.nextSibling);
    }

  }
};


// setter
const ImagesToBeUpdatedSetter = (status) => {
  ImagesToBeUpdated = status;
};

// setter
const allowProcessingSetter = (data) => {
  allowProcessing = data;
};

export {
  // data patterns
  ALIAS_PATTERNS,
  KET_TAGS,
  // flags
  LAYERING_FLAGS,
  ImagesToBeUpdated,
  allowProcessing,

  // methods
  hasKetcherData,
  hasTextNodes,
  addingPolymersToKetcher,
  prepareImageFromTemplateList,
  resetOtherAliasCounters,
  isNewAtom,
  removeImageTemplateAtom,
  reAttachPolymerList,
  removeImagesFromData,
  removeTextFromData,
  fetchSurfaceChemistryImageData,
  updateBondList,
  findAtomByImageIndex,

  // DOM Methods
  disableButton,
  attachListenerForTitle,
  updateImagesInTheCanvas,
  updateTemplatesInTheCanvas,
  makeTransparentByTitle,
  undoKetcher,
  redoKetcher,
  mainImageSizingOnRerender,
  addTextNodeDescriptionOnTextPopup,

  // setters
  ImagesToBeUpdatedSetter,
  allowProcessingSetter,
};
