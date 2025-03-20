/* eslint-disable no-await-in-loop */
/* eslint-disable no-plusplus */
/* eslint-disable radix */
/* eslint-disable no-use-before-define */
/* eslint-disable no-restricted-syntax */
/* eslint-disable no-param-reassign */
/* eslint-disable import/no-mutable-exports */
import {
  loadKetcherData, mols, imagesList, latestData
} from 'src/components/structureEditor/KetcherEditor';
import {
  allAtoms, fetchKetcherData, handleAddAtom, imageNodeCounter, imageNodeForTextNodeSetter, imageUsedCounterSetter, saveMoveCanvas, textList, textNodeStruct
} from 'src/components/structureEditor/KetcherEditor';
import { allTemplates } from 'src/components/structureEditor/KetcherEditor';
import { deletedAtoms } from 'src/components/structureEditor/KetcherEditor';
import { TextListSetter } from 'src/components/structureEditor/KetcherEditor';

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
  textIdentifier: '#',
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
    if (start === -1 || end === -1) return [];
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
        if (polymerItem && polymerItem.split('/').length >= 2 && (atom.type === KET_TAGS.rgLabel || ALIAS_PATTERNS.threeParts.test(atom.label))) {
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
  for (const tab of allTemplates) {
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

// helper function to remove bonds by atom id
const updateBondList = async (indexToMatch, bondList) => {
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

// helper function to remove template by atom with alias
const handleOnDeleteAtom = async (missingNumbers, data, imageL) => {
  try {
    const textNodeStructureCopy = { ...textNodeStruct };
    const structureKeys = Object.keys(textNodeStruct);
    structureKeys.forEach((i) => {
      const split = parseInt(i.split('_')[2]);
      if (missingNumbers.indexOf(split) !== -1) {
        delete textNodeStruct[i];
      }
    });

    for (const molKey of mols) {
      const mol = data[molKey];
      if (mol && mol?.atoms) {
        for (const atom of mol.atoms) {
          if (ALIAS_PATTERNS.threeParts.test(atom?.alias)) {
            const previousAlias = atom.alias;
            const atomSplits = previousAlias.split('_');
            const currentAlias = parseInt(atomSplits[2]);

            // Count how many missing numbers are LESS than the current alias
            const missingCount = missingNumbers.filter((num) => num < currentAlias).length;

            if (missingCount > 0) {
              atom.alias = `t_${atomSplits[1]}_${currentAlias - missingCount}`;

              if (textNodeStructureCopy[previousAlias]) {
                textNodeStruct[atom.alias] = textNodeStruct[previousAlias];
                delete textNodeStruct[previousAlias];
              }
            }
          }
        }
      }
    }

    data.root.nodes = data.root.nodes.filter((node) => node.type !== 'image');
    data.root.nodes.push(...imageL);
    return data;
  } catch (err) {
    console.error('handleDelete!!', err.message);
    return null;
  }
};

// remove atoms from the template-list with alias,
const removeImageTemplateAtom = async (data, aliasToBeRemoved) => {
  try {
    for (const molKey of mols) {
      const molecule = data[molKey];
      if (molecule && molecule.atoms) {
        const atomList = molecule?.atoms || [];
        const bondList = molecule?.bonds || [];
        let removeIndex = -1;

        for (let i = 0; i < atomList.length; i++) {
          if (ALIAS_PATTERNS.threeParts.test(atomList[i].alias)) {
            const split = parseInt(atomList[i].alias.split('_')[2]);
            if (aliasToBeRemoved.indexOf(split) !== -1) {
              atomList.splice(i, 1);
              removeIndex = i;
            }
            if (!atomList?.length) {
              data.root.nodes = removeMoleculeFromData(data, molKey);
              delete data[molKey];
            }
          }
        }

        if (removeIndex !== -1 && bondList.length) {
          data[molKey].bonds = await updateBondList(removeIndex, bondList);
        }
        if (atomList.length) data[molKey].atoms = atomList;
      }
    }
    return data;
  } catch (err) {
    console.error('removeImageTemplateAtom', err.message);
    return data;
  }
};

// helper function to find atom in ket format by image idx referenced with alias 3rd part
const findAtomByImageIndex = async (imgIdx) => {
  for (const molName of mols) {
    const molecule = latestData[molName];
    for (let atomIndex = 0; atomIndex < molecule.atoms.length; atomIndex++) {
      const atom = molecule.atoms[atomIndex];
      if (ALIAS_PATTERNS.threeParts.test(atom.alias)) {
        const aliasLastPart = parseInt(atom.alias.split('_')[2]);
        if (imgIdx === aliasLastPart) return { atomLocation: atom.location, alias: atom.alias };
      }
    }
  }
  return { atomLocation: null, alias: '' };
};

const collectMissingAliases = async () => {
  const aliasList = [];
  for (let i = 0; i < mols.length; i++) {
    const { atoms } = latestData[mols[i]];
    for (let j = 0; j < atoms.length; j++) {
      const split = atoms[j]?.alias?.split('_')[2];
      if (split) {
        aliasList.push(parseInt(split));
      }
    }
  }
  return aliasList;
};

const findMissingNumbers = async (arr) => {
  // Convert array to numbers and sort in ascending order
  const nums = arr.map(Number).sort((a, b) => a - b);

  const min = 0;
  const max = Math.max(...nums);
  const missing = [];

  for (let i = min; i <= max; i++) {
    if (!nums.includes(i)) {
      missing.push(i);
    }
  }
  return missing;
};

// helper function set image coordinates
const adjustImageCoordinatesAtomDependent = (imageCoordinates, location) => ({
  ...imageCoordinates,
  x: location[0] - imageCoordinates.width / 2,
  y: location[1] + imageCoordinates.height / 2,
  z: 0,
});

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

// generates list of images with atom location based on alias present in ket2 format
const placeImageOnAtoms = async (mols_, imagesList_) => {
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
    return [...removeImagesFromData(latestData), ...imageListParam];
  } catch (err) {
    console.error('placeImageOnAtoms', err.message);
  }
};

// place text nodes on atom with matching aliases
const placeTextOnAtoms = async (mols_) => {
  try {
    const updatedTextList = [];
    for (const item of mols_) {
      for (const atom of latestData[item].atoms) {
        const textNodeKey = textNodeStruct[atom.alias];

        if (atom && ALIAS_PATTERNS.threeParts.test(atom.alias) && textNodeKey) {
          const res = await findByKeyAndUpdateTextNodePosition(textNodeKey, atom);
          if (res) updatedTextList.push(res);
        }
      }
    }
    const diff = await deepCompareContent(textList, updatedTextList); // extra text components without aliases
    return [...removeTextFromData(latestData), ...updatedTextList, ...diff.map((i) => textList[i])];
  } catch (err) {
    console.error('placeTextOnAtoms', err.message);
    return [];
  }
};

// helper function to remove template by image
const handleOnDeleteImage = async (canvasSelection, oldImagePack, textL) => {
  const images = canvasSelection?.images || [];
  // if (!images.length) images = deepCompare(oldImagePack, imagesList);
  console.log(images);
  return data;
  const filteredTextList = removeTextNodeFromStruct(images, textL);
  const { data, imageFoundIndexCount } = await removeImageTemplateAtom(new Set([...images]), mols, latestData);
  const remainingCount = imageNodeCounter - imageFoundIndexCount;
  imageUsedCounterSetter(remainingCount);
  const dataRoot = removeTextFromData(data);
  dataRoot.push(...filteredTextList);
  data.root.nodes = dataRoot;
  return data;
};

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

// generating images for ket2 format from molfile polymers list
const addPolymerTags = async (polymerTag, data) => {
  const collectedImages = [];
  if (polymerTag && polymerTag.length) {
    const processedResponse = await addingPolymersToKetcher(polymerTag, data, imageNodeCounter);
    imageUsedCounterSetter(processedResponse.image_counter);
    processedResponse.molfileData?.root?.nodes.push(...processedResponse.c_images);
    return {
      collected_images: processedResponse.c_images,
      molfileData: processedResponse.molfileData
    };
  }
  return { collectedImages, molfileData: data };
};

// generating images for ket2 format from molfile polymers list
const addTextNodes = async (textNodes) => textNodes.map((item) => {
  const [idx, key, alias, description] = item.split(KET_TAGS.textIdentifier);
  if (alias && key) {
    textNodeStruct[alias] = key;
    return {
      type: 'text',
      data: {
        content: `{\"blocks\":[{\"key\":\"${key}\",\"text\":\"${description}\",\"type\":\"unstyled\",\"depth\":0,\"inlineStyleRanges\":[],\"entityRanges\":[],\"data\":{}}],\"entityMap\":{}}`,
        position: {
          x: 10.325000000000001,
          y: -11.325000000000001,
          z: 0
        },
        pos: [
          {
            x: 10.325000000000001,
            y: -11.325000000000001,
            z: 0
          },
          {
            x: 10.325000000000001,
            y: -11.700000000000001,
            z: 0
          },
          {
            x: 10.68671875,
            y: -11.700000000000001,
            z: 0
          },
          {
            x: 10.68671875,
            y: -11.325000000000001,
            z: 0
          }
        ]
      }
    };
  }
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

// remove text node from struct
const removeTextNodeFromStruct = (images, textL) => {
  const keysToDel = [];
  images.forEach((num) => {
    Object.keys(textNodeStruct).forEach((key) => {
      // Split the key by underscores and check if the third part matches the number
      const parts = key.split('_');
      if (parts[2] && parseInt(parts[2]) === num) {
        keysToDel.push(textNodeStruct[key]);
      }
    });
  });

  textL.forEach((item, idx) => {
    if (keysToDel.indexOf(JSON.parse(item.data.content).blocks[0].key) != -1) {
      textL.splice(idx, 1);
    }
  });
  return textL;
};

// find by key and update text node position from alias matching atoms
const findByKeyAndUpdateTextNodePosition = async (textNodeKey, atom) => {
  for (const key of Object.keys(textNodeStruct)) {
    for (let textIdx = 0; textIdx < textList.length; textIdx++) {
      const text = textList[textIdx];
      const content = JSON.parse(text.data.content); // Parse content
      if (content.blocks[0].key === textNodeKey) {
        const split = atom.alias.split('_')[2];
        text.data.position = {
          x: atom.location[0] + imagesList[split].boundingBox.width / 2,
          y: atom.location[1],
          z: atom.location[2]
        };
        return text;
      }
    }
  }
};

/* attaching polymers list is ketcher rails standards to a molfile
  s => S means its a surface polymers
  final output is expected a string:  "11 12s 13"
*/
const reAttachPolymerList = async ({
  lines, atomsCount, additionalDataStart, additionalDataEnd
}) => {
  const lineCopy = [...lines];
  const aliasesList = [];
  for (let i = additionalDataStart; i <= additionalDataEnd; i++) {
    if (ALIAS_PATTERNS.threeParts.test(lines[i])) {
      const splitTemp = parseInt(lines[i].split('_')[1]);
      splitTemp < 50 && aliasesList.push(lines[i - 1], lines[i]);
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

const buttonClickForRectangleSelection = async (iframeRef) => {
  const iframeDocument = iframeRef?.current?.contentWindow?.document;
  console.log(iframeDocument);
  const button = iframeDocument?.querySelector('[data-testid="select-rectangle"]');
  if (button) {
    button.click();
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

const addTextNodeDescriptionOnTextPopup = async (node) => {
  if (node?.classList?.contains('Select-module_selectContainer__yXT-t') && node?.classList?.contains('Modal-module_modalOverlay__AzVeg')) {
    // Your existing logic
    const parentElement = node.querySelector('.Dialog-module_body__EWh4H.Dialog-module_withMargin__-zVS4');

    let newParagraph; // Declare the variable to store the added paragraph

    if (parentElement) { // Ensure showTextNode is used properly
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

// canvas actions

const removeUnfamiliarRgLabels = async (lines) => {
  const removeableAtoms = [];
  for (let i = lines.length - 1; i > 0; i--) { // Looping backwards to avoid index shifting issues
    if (ALIAS_PATTERNS.threeParts.test(lines[i])) {
      const template = parseInt(lines[i].split('_')[1]);

      if (template > 50) {
        removeableAtoms.push(lines[i - 1].split('   ')[1]);
        // Remove both previous (i-1) and current (i) item
        lines.splice(i - 1, 2);
        i--;
      }
    }
  }
  return removeAtomFromLineByIndex(lines, removeableAtoms);
};

const removeAtomFromLineByIndex = (lines) => {
  const elementsInfo = lines[3];
  const headers = elementsInfo.trim().split(' ').filter((i) => i !== '');
  const atomsCount = parseInt(headers[0]);
  for (let i = elementsInfo; i > atomsCount.length; i--) {
    console.log(item);
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

// helper functon to arrange text nodes for formula
const arrangeTextNodes = async (ket2Molfile) => {
  ket2Molfile.push(KET_TAGS.textNodeIdentifier);
  let atomCount = 0;
  const assembleTextList = [];
  mols.forEach(async (item) => {
    const textSeparator = KET_TAGS.textIdentifier;
    latestData[item]?.atoms.forEach(async (atom) => {
      const textNodeKey = textNodeStruct[atom.alias];
      if (textNodeKey) {
        textList.forEach((item) => {
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

// process text nodes into for formula
const assembleTextDescriptionFormula = async (ket2Lines) => {
  const startAtoms = 3;
  const atomsCount = ket2Lines[3].trim().split(' ')[0];
  const startTextNode = ket2Lines.indexOf(KET_TAGS.textNodeIdentifier);
  const endTextNode = ket2Lines.indexOf(KET_TAGS.textNodeIdentifierClose);
  const endAtom = parseInt(atomsCount) + 3;
  const textNodesPairs = await collectTextListing(ket2Lines, startTextNode, endTextNode);
  const formula = await treverseAtonForFormulaFormation(ket2Lines, textNodesPairs, startAtoms, endAtom);
  return formula;
};

// collect text node with index
const collectTextListing = async (ket2Lines, startTextNode, endTextNode) => {
  const struct = {};
  for (let i = startTextNode + 1; i < endTextNode; i++) {
    const item = ket2Lines[i].split(KET_TAGS.textIdentifier);
    if (item.length == 4) {
      const [idx, , , text] = item;
      struct[idx] = text;
    }
  }
  return struct;
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
const deleteKeyByValue = (valueToDelete, textNodeStruct) => {
  // Iterate over each key-value pair in the object
  for (const key in textNodeStruct) {
    if (textNodeStruct.hasOwnProperty(key) && textNodeStruct[key] === valueToDelete) {
      delete textNodeStruct[key]; // Delete the key if the value matches
    }
  }
  return textNodeStruct;
};

// helper function when a text node is deleted
const onDeleteText = async (editor, textList, textNodeStruct) => {
  console.log('Delete text in in?');
  await fetchKetcherData(editor);
  textList.forEach((item, idx) => {
    const { key } = JSON.parse(item.data.content).blocks[0];
    if (!Object.values(textNodeStruct).includes(key)) {
      textNodeStruct = deleteKeyByValue(key, textNodeStruct);
      textList.splice(idx, 1);
    }
  });
  return { textNodeStruct, textList };
};

/* istanbul ignore next */
// container function for on image delete
const onDeleteImage = async (editor, canvasSelection, oldImagePack, textL) => {
  const data = await handleOnDeleteImage(canvasSelection, oldImagePack, textL);
  await saveMoveCanvas(editor, data, false, true);
};

// sort and join / text nodes
const treverseAtonForFormulaFormation = async (ket2Lines, textNodesPairs, startAtoms, endAtom) => {
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

// function to add text nodes to canvas/struct
const onAddText = async (editor, selectedImageForTextNode) => {
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

    await editor.structureDef.editor.setMolecule(JSON.stringify(latestData), false);
    textNodeStruct[alias] = JSON.parse(lastTextNode.data.content).blocks[0].key;
  }
  imageNodeForTextNodeSetter(null);
};

async function getSvgFromBlob(imageBlob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = function(event) {
      resolve(event.target.result); // Return the SVG string
    };

    reader.onerror = function(error) {
      reject(error);
    };

    reader.readAsText(imageBlob);
  });
}

const reArrangeImagesOnCanvasViaKetcher = async (editor) => {
  try {
    const latestDataCopy = JSON.stringify(latestData);
    const imageBlob = await editor.structureDef.editor.generateImage(latestDataCopy, { outputFormat: 'svg' });
    const svgString = await getSvgFromBlob(imageBlob);
    return svgString;
  } catch (err) {
    console.log(err.message);
    return null;
  }
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
    newImg.setAttribute('preserveAspectRatio', 'none');
    img.replaceWith(newImg);
  });
  const svgElement = new XMLSerializer().serializeToString(svg);
  return svgElement;
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
  adjustImageCoordinatesAtomDependent,
  placeImageOnAtoms,
  findByKeyAndUpdateTextNodePosition,
  placeTextOnAtoms,
  addPolymerTags,
  addTextNodes,
  isAliasConsistent,
  removeTextNodeFromStruct,
  handleOnDeleteImage,
  arrangePolymers,
  arrangeTextNodes,
  assembleTextDescriptionFormula,
  onAddAtom,
  deleteKeyByValue,
  onDeleteText,
  onAddText,
  onDeleteImage,
  collectMissingAliases,
  findMissingNumbers,
  deepCompare,
  deepCompareNumbers,
  deepCompareContent,
  handleOnDeleteAtom,

  // DOM Methods
  disableButton,
  attachListenerForTitle,
  updateImagesInTheCanvas,
  updateTemplatesInTheCanvas,
  makeTransparentByTitle,
  undoKetcher,
  redoKetcher,
  addTextNodeDescriptionOnTextPopup,
  reArrangeImagesOnCanvas,
  reArrangeImagesOnCanvasViaKetcher,
  buttonClickForRectangleSelection,

  // setters
  ImagesToBeUpdatedSetter,
  allowProcessingSetter,
};
