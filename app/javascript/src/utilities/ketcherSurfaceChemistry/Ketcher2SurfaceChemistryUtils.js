/* eslint-disable no-underscore-dangle */
/* eslint-disable no-await-in-loop */
/* eslint-disable no-plusplus */
/* eslint-disable radix */
/* eslint-disable no-use-before-define */
/* eslint-disable no-restricted-syntax */
/* eslint-disable no-param-reassign */
/* eslint-disable import/no-mutable-exports */

import {
  removeImagesFromData,
  removeTextFromData,
  adjustAtomCoordinates
} from 'src/utilities/ketcherSurfaceChemistry/AtomsAndMolManipulation';
import { ALIAS_PATTERNS, KET_TAGS } from 'src/utilities/ketcherSurfaceChemistry/constants';
import { findByKeyAndUpdateTextNodePosition } from 'src/utilities/ketcherSurfaceChemistry/TextNode';
import {
  mols, textNodeStruct, allTemplates, templatesBaseHashWithTemplateId, textList
} from 'src/utilities/ketcherSurfaceChemistry/stateManager';
import { latestData } from 'src/components/structureEditor/KetcherEditor';
import loadAndEncodeSVG from 'src/utilities/ketcherSurfaceChemistry/iconBaseProvider';

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
              width: shape.width || 1,
              height: shape.height || 1,
              x: 8.700000000000001,
              y: -5.824999999999999,
              z: 0
            },
            data: await loadAndEncodeSVG(shape.iconName),
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
const resetOtherAliasCounters = (atom, molList) => {
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

// generates list of images with atom location based on alias present in ket2 format
const placeImageOnAtoms = async (mols_, imagesList_) => {
  try {
    const imageListParam = imagesList_;
    mols_.forEach(async (item) => {
      (latestData[item]?.atoms || []).forEach((atom) => {
        if (atom && ALIAS_PATTERNS.threeParts.test(atom?.alias)) {
          const aliasSplits = atom.alias.split('_');
          const imageCoordinates = imageListParam[aliasSplits[2]]?.boundingBox;
          if (!imageCoordinates) {
            throw new Error('Invalid alias');
          }
          const boundingBox = {
            x: atom.location[0] - imageCoordinates.width / 2,
            y: atom.location[1] + imageCoordinates.height / 2,
            z: atom.location[2],
            width: imageCoordinates.width,
            height: imageCoordinates.height
          };
          imageListParam[aliasSplits[2]].boundingBox = boundingBox;
        }
      });
    });
    return [...removeImagesFromData(latestData), ...imageListParam];
  } catch (err) {
    console.error('placeImageOnAtoms', err.message);
    return latestData?.root?.nodes ?? [];
  }
};

// generates list of images with atom location based on alias present in ket2 format
const placeAtomOnImage = async (mols_, imagesList_) => {
  try {
    const imageListParam = imagesList_;
    mols_.forEach(async (item) => {
      (latestData[item]?.atoms || []).forEach((atom, idx) => {
        if (atom && ALIAS_PATTERNS.threeParts.test(atom?.alias)) {
          const aliasSplits = atom.alias.split('_');
          const imageCoordinates = imageListParam[aliasSplits[2]]?.boundingBox;
          if (!imageCoordinates) {
            throw new Error('Invalid alias');
          }
          const coordinates = adjustAtomCoordinates(imageCoordinates);
          latestData[item].atoms[idx].location = coordinates;
        }
      });
    });
    return [...removeImagesFromData(latestData), ...imageListParam];
  } catch (err) {
    console.error('placeAtomOnImage', err.message);
    return latestData?.root?.nodes ?? [];
  }
};

const findTextNodesNotConnectedWithTemplates = (updatedTextList) => {
  const values = Object.values(textNodeStruct);
  const list = [];
  for (let i = 0; i < updatedTextList.length; i++) {
    const block = JSON.parse(updatedTextList[i].data.content).blocks[0];
    if (values.indexOf(block.key) === -1) {
      list.push(updatedTextList[i]);
    }
  }
  return list;
};

// place text nodes on atom with matching aliases
const placeTextOnAtoms = async () => {
  try {
    const updatedTextList = [];
    for (const item of mols) {
      for (const atom of latestData[item].atoms) {
        const textNodeKey = textNodeStruct[atom.alias];

        if (atom && ALIAS_PATTERNS.threeParts.test(atom.alias) && textNodeKey) {
          const res = await findByKeyAndUpdateTextNodePosition(textNodeKey, atom);
          if (res) updatedTextList.push(res);
        }
      }
    }
    // findTextNodesNotConnectedWithTemplates should check ALL textList, not just updatedTextList
    // It finds text nodes that are NOT in textNodeStruct (unassociated text nodes)
    const otherTextNodes = await findTextNodesNotConnectedWithTemplates(textList); // extra text components without aliases
    return [...removeTextFromData(latestData), ...updatedTextList, ...otherTextNodes];
  } catch (err) {
    console.error('placeTextOnAtoms', err.message);
    return [];
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

const applySelectedStruct = async (editor, dataCopy) => {
  try {
    const selection = editor._structureDef.editor.editor.selection();
    if (selection?.atoms) {
      const { atoms: selectedAtoms } = selection;
      let atomCount = 0;
      for (let i = 0; i < mols.length; i++) {
        const { atoms } = dataCopy[mols[i]];
        for (let j = 0; j < atoms.length; j++) {
          if (selectedAtoms.indexOf(atomCount) !== -1) {
            atoms[j].selected = true;
          }
          atomCount++;
        }
        dataCopy[mols[i]].atoms = atoms;
      }
    }
    return dataCopy;
  } catch (err) {
    console.error('applySelectedStruct', err.message);
    return dataCopy;
  }
};

// find template from dataset by image base
const findTemplateByPayload = async (targetPayload) => {
  for (const [templateId, iconName] of Object.entries(templatesBaseHashWithTemplateId)) {
    const base64 = await loadAndEncodeSVG(iconName);
    if (base64 === targetPayload) {
      return templateId;
    }
  }
  return null;
};

export {
  // methods
  prepareImageFromTemplateList,
  resetOtherAliasCounters,
  isNewAtom,
  fetchSurfaceChemistryImageData,
  placeImageOnAtoms,
  placeAtomOnImage,
  placeTextOnAtoms,
  applySelectedStruct,
  findTemplateByPayload,

  // DOM Methods
  reArrangeImagesOnCanvas,
};
