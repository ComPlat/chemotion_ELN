/* eslint-disable no-use-before-define */
/* eslint-disable no-underscore-dangle */
/* eslint-disable no-restricted-syntax */
import {
  fetchSurfaceChemistryImageData
} from 'src/utilities/ketcherSurfaceChemistry/Ketcher2SurfaceChemistryUtils';
import { KET_TAGS } from 'src/utilities/ketcherSurfaceChemistry/constants';
import {
  allTemplates,
  templateListSetter,
  allAtoms,
  allAtomsSetter,
  allNodes,
  allNodesSetter,
  imagesList,
  imagesListSetter,
  mols,
  molsSetter,
  textList,
  textListSetter,
  textNodeStructSetter,
  ImagesToBeUpdatedSetter,
  setBase64TemplateHashSetter
} from 'src/utilities/ketcherSurfaceChemistry/stateManager';
import {
  latestDataSetter,
} from 'src/components/structureEditor/KetcherEditor';
import { addPolymerTags } from 'src/utilities/ketcherSurfaceChemistry/PolymersTemplates';
import {
  addTextNodes
} from 'src/utilities/ketcherSurfaceChemistry/TextNode';
import {
  centerPositionCanvas,
  saveMoveCanvas,
} from 'src/utilities/ketcherSurfaceChemistry/canvasOperations';
import {
  attachClickListeners
} from 'src/utilities/ketcherSurfaceChemistry/DomHandeling';

const loadTemplates = async () => {
  fetch('/json/surfaceChemistryShapes.json').then((response) => {
    if (!response.ok) {
      throw new Error('Network response was not ok');
    }
    return response.json();
  }).then((data) => {
    templateListSetter(data);
  }).catch((error) => {
    console.error('Error fetching the JSON data:', error);
  });
};

// prepare/load ket2 format data
const loadKetcherData = async (data) => {
  const nodes = data?.root?.nodes && Array.isArray(data.root.nodes) ? data.root.nodes : [];
  allAtomsSetter([]);
  allNodesSetter([...nodes]);
  imagesListSetter(nodes.filter((item) => item.type === 'image'));
  textListSetter(nodes.filter((item) => item.type === 'text'));
  const sliceEnd = Math.max(0, nodes.length - imagesList.length - textList.length);
  molsSetter(sliceEnd > 0 ? nodes.slice(0, sliceEnd).map((i) => i.$ref) : []);
  const molRefs = sliceEnd > 0 ? nodes.slice(0, sliceEnd).map((i) => i.$ref) : [];
  molRefs.forEach((item) => (data[item]?.atoms || []).map((i) => allAtoms.push(i)));
};

const setupEditorIframe = ({
  iframeRef,
  editor,
  resetStore,
  loadContent,
  buttonEvents,
}) => {
  resetStore();
  const iframe = iframeRef.current;
  const handleIframeLoad = () => {
    attachClickListeners(iframeRef, buttonEvents, editor);
    setBase64TemplateHashSetter(allTemplates);
  };

  if (editor?.structureDef) {
    if (iframe) {
      iframe.addEventListener('load', handleIframeLoad);
    }
    window.addEventListener('message', loadContent);
    loadTemplates();
  }

  return () => {
    if (iframe) {
      iframe.removeEventListener('load', handleIframeLoad);
    }
    window.removeEventListener('message', loadContent);
  };
};

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
    const polymerLine = lines.find((line) => line.includes(KET_TAGS.polymerIdentifier));
    return polymerLine ? lines[lines.indexOf(polymerLine) + 1]?.trim() || null : null;
  } catch (err) {
    console.error('Error processing molfile');
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
    console.error('Error processing molfile');
    return null;
  }
};

function findTemplateById(id) {
  return allTemplates
    ?.flatMap((category) => category?.subTabs || [])
    .flatMap((subTab) => subTab?.shapes || [])
    .find((shape) => shape.template_id === id) || null;
}

// Helper to determine template type based on polymer value
const getTemplateType = (polymerValue) => {
  const hasSurface = polymerValue.includes('s');
  const binaryTemplates = hasSurface ? KET_TAGS.templateSurface : KET_TAGS.templateBead;
  const templateSplits = polymerValue.split('/');
  if (templateSplits.length === 1) {
    const template = findTemplateById(binaryTemplates);
    return { type: binaryTemplates, size: `${template.height}-${template.width}` };
  }
  if (!hasSurface) {
    return { type: templateSplits[1], size: templateSplits[2] };
  }
  return { type: binaryTemplates, size: templateSplits[1] };
};

// Helper to create a bounding box for a template with atom location
const templateWithBoundingBox = async (templateType, atomLocation, templateSize) => {
  const template = await fetchSurfaceChemistryImageData(templateType);
  const defaultSize = [template.boundingBox.height, template.boundingBox.width];
  const [height, width] = templateSize?.split('-') || defaultSize;
  template.boundingBox.x = atomLocation[0];
  template.boundingBox.y = atomLocation[1];
  template.boundingBox.z = 0;
  template.boundingBox.height = parseFloat(height);
  template.boundingBox.width = parseFloat(width);
  return template;
};

/* istanbul ignore next */
// helper function to rebase with the ketcher canvas data
const fetchKetcherData = async (editor) => {
  try {
    if (!editor) throw new Error('Editor instance is invalid');
    const ketString = await editor.structureDef.editor.getKet();
    const data = JSON.parse(ketString);
    await latestDataSetter(data);
    await loadKetcherData(data);
  } catch (err) {
    console.error('fetchKetcherData', err.message);
  }
};

const prepareKetcherData = async (editor, initMol) => {
  try {
    const polymerTag = await hasKetcherData(initMol);
    const textNodes = await hasTextNodes(initMol);
    const ketFile = await editor._structureDef.editor.indigo.convert(initMol).catch((err) => {
      console.error('invalid molfile. Please try again', err.message);
    });

    if (!ketFile || !ketFile.struct) {
      console.error('Failed to convert molfile to ket format.');
      return;
    }

    const fileContent = JSON.parse(ketFile.struct);
    textNodeStructSetter({});
    await applyKetcherData(polymerTag, fileContent, textNodes, editor);
    // Increased timeout to ensure canvas is fully rendered before centering
    setTimeout(async () => {
      await centerPositionCanvas(editor);
    }, 100);
  } catch (err) {
    console.error('Error preparing Ketcher data:', err.message);
  }
};

const applyKetcherData = async (polymerTag, fileContent, textNodes, editor) => {
  try {
    let molfileContent = fileContent;
    if (polymerTag) {
      const { molfileData } = await addPolymerTags(polymerTag, fileContent);
      molfileContent = molfileData;
    }
    // Add text nodes when available (with or without polymer tag, so labels aren't lost on open)
    if (textNodes && textNodes.length > 0) {
      const textNodeList = await addTextNodes(textNodes);
      const validNodes = (textNodeList || []).filter(Boolean);
      if (validNodes.length) {
        molfileContent.root.nodes.push(...validNodes);
      }
    }
    saveMoveCanvas(editor, molfileContent, true, true, false, { syncImagesOnly: true });
    ImagesToBeUpdatedSetter(true);
    return { molfileContent, polymerTag };
  } catch (err) {
    console.error('Error applying Ketcher data:', err.message);
    return null;
  }
};

export {
  setupEditorIframe,
  initializeKetcherData,
  hasKetcherData,
  hasTextNodes,
  getTemplateType,
  templateWithBoundingBox,
  fetchKetcherData,
  loadKetcherData,
  prepareKetcherData,
  loadTemplates
};
