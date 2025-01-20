/* eslint-disable no-await-in-loop */
/* eslint-disable no-plusplus */
/* eslint-disable radix */
/* eslint-disable no-use-before-define */
/* eslint-disable no-restricted-syntax */
/* eslint-disable no-param-reassign */
/* eslint-disable import/no-mutable-exports */
import { loadKetcherData, mols } from 'src/components/structureEditor/KetcherEditor';

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
  templateSurface: 2,
  templateBead: 1,
  polymerIdentifier: '> <PolymersList>',
  fileEndIdentifier: '$$$$',
  molfileHeaderLinenumber: 4,
  rgLabel: 'rg-label',
  shapes: ['Bead', 'Surface'],
  moleculeIdentifier: '> <MoleculesList>' // New tag
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

// helper to stringify Surface chemistry template because it only takes stringified structs
const templateParser = async () => {
  const response = await fetch('/json/surfaceChemistryTemplates.json');
  const templateListStorage = await response.json();
  const outputData = templateListStorage.map((item) => {
    const structObject = item.struct; // Parse the struct field
    item.struct = JSON.stringify(structObject, null, 4); // Re-stringify with formatting
    return item;
  });
  return outputData;
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

// Helper to determine template type based on polymer value
const getTemplateType = (polymerValue) => {
  const hasSurface = polymerValue.includes('s');
  return hasSurface ? KET_TAGS.templateSurface : KET_TAGS.templateBead;
};

// Helper to update an atom with K2SC labels and aliases
const updateAtom = (atomLocation, templateType, imageCounter) => ({
  label: KET_TAGS.inspiredLabel,
  alias: `t_${templateType}_${imageCounter}`,
  location: atomLocation
});

// Helper to create a bounding box for a template with atom location
const templateWithBoundingBox = async (templateType, atomLocation) => {
  const list = await fetchSurfaceChemistryImageData();
  const template = list[templateType];
  const boundingBox = { ...template.boundingBox };
  boundingBox.x = atomLocation[0];
  boundingBox.y = atomLocation[1];
  boundingBox.z = 0;
  return { ...template, boundingBox };
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
        if ((atom.type === KET_TAGS.rgLabel || ALIAS_PATTERNS.threeParts.test(atom.label))) {
          // counters
          imageNodeCounter += 1;
          visitedAtoms += 1;
          // step 1: get template type
          const templateType = getTemplateType(polymerItem);
          // step 2: update atom with alias
          data[molName].atoms[atomIndex] = updateAtom(atom.location, templateType, imageNodeCounter);
          // step 3: sync bounding box with atom location
          const newTemplate = await templateWithBoundingBox(templateType, atom.location);
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
const fetchSurfaceChemistryImageData = async () => {
  const response = await fetch('/json/surfaceChemistryImages.json');
  return response.json();
};

// helper function to return a new template-image for imagesList with new location
const prepareImageFromTemplateList = async (idx, location) => {
  const list = await fetchSurfaceChemistryImageData();
  list[idx].boundingBox.x = location[0];
  list[idx].boundingBox.y = location[1];
  list[idx].boundingBox.z = location[2];
  return list[idx];
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

// Updates atom aliases in a molecule after removing certain images and updates the molecule data.
const updateMoleculeAliases = async (container, atomList) => {
  for (const imgIdx of container) {
    for (let i = 0; i < atomList.length; i++) {
      const atom = atomList[i];
      if (ALIAS_PATTERNS.threeParts.test(atom.alias)) {
        const splits = atom.alias.split('_');
        if (parseInt(splits[2]) > imgIdx) {
          atomList[i].alias = `t_${splits[1]}_${parseInt(splits[2]) - 1}`;
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
  const aliasesList = lineCopy.slice(additionalDataStart, additionalDataEnd);
  const { linesCopy, atomAliasList } = await processAtomLines(lineCopy, KET_TAGS.molfileHeaderLinenumber, atomsCount);
  linesCopy.splice(additionalDataStart, additionalDataEnd - additionalDataStart);
  lineCopy = linesCopy;
  let counter = 0;
  for (let i = 1; i < aliasesList.length; i += 2) {
    const templateId = parseInt(aliasesList[i].split('_')[1]);
    if (templateId) {
      atomAliasList[counter] += templateId === KET_TAGS.templateSurface ? 's' : '';
      counter++;
    }
  }
  const collectedLines = [KET_TAGS.polymerIdentifier, atomAliasList.join(' '), KET_TAGS.fileEndIdentifier];
  lineCopy.splice(lineCopy.length, 0, ...collectedLines);
  return lineCopy.join('\n');
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
  addingPolymersToKetcher,
  prepareImageFromTemplateList,
  resetOtherAliasCounters,
  isNewAtom,
  removeImageTemplateAtom,
  reAttachPolymerList,
  templateParser,
  removeImagesFromData,

  // DOM Methods
  disableButton,
  attachListenerForTitle,
  updateImagesInTheCanvas,
  updateTemplatesInTheCanvas,
  makeTransparentByTitle,

  // setters
  ImagesToBeUpdatedSetter,

  allowProcessingSetter,
};
