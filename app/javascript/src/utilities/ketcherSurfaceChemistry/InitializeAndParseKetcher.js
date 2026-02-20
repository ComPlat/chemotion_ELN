/* eslint-disable no-use-before-define */
/* eslint-disable no-underscore-dangle */
/* eslint-disable no-restricted-syntax */
import {
  fetchSurfaceChemistryImageData
} from 'src/utilities/ketcherSurfaceChemistry/Ketcher2SurfaceChemistryUtils';
import { KET_TAGS, ALIAS_PATTERNS } from 'src/utilities/ketcherSurfaceChemistry/constants';
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
  setBase64TemplateHashSetter,
  storedPolymersListLine,
  storedPolymersListLineSetter,
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
  onPasteWithKetcherData,
}) => {
  resetStore();
  const iframe = iframeRef.current;
  let pasteListener = null;

  const handleIframeLoad = () => {
    attachClickListeners(iframeRef, buttonEvents, editor);
    setBase64TemplateHashSetter(allTemplates);

    if (onPasteWithKetcherData && iframe?.contentDocument) {
      const iframeDoc = iframe.contentDocument;
      pasteListener = (e) => {
        const text = e.clipboardData?.getData?.('text/plain') || '';
        if (text.includes(KET_TAGS.polymerIdentifier)) {
          e.preventDefault();
          e.stopPropagation();
          onPasteWithKetcherData(text);
        }
      };
      iframeDoc.addEventListener('paste', pasteListener, true);
    }
  };

  if (editor?.structureDef) {
    if (iframe) {
      iframe.addEventListener('load', handleIframeLoad);
    }
    window.addEventListener('message', loadContent);
    loadTemplates();
  }

  return () => {
    if (iframe?.contentDocument && pasteListener) {
      iframe.contentDocument.removeEventListener('paste', pasteListener, true);
    }
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
    const lastIndex = lines.map((line, i) => (line.includes(KET_TAGS.polymerIdentifier) ? i : -1))
      .filter((i) => i >= 0)
      .pop();
    if (lastIndex == null) return null;
    return lines[lastIndex + 1]?.trim() || null;
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

// Return molfile string up to and including M  END so Indigo only sees standard CTAB.
const getStandardMolfileForIndigo = (molfile) => {
  if (!molfile || typeof molfile !== 'string') return molfile;
  const lines = molfile.trim().split('\n');
  const endIndex = lines.findIndex((line) => line && /^M\s+END/.test(line));
  if (endIndex === -1) return molfile;
  return lines.slice(0, endIndex + 1).join('\n');
};

// Reindex alias third part (image index) so pasted atoms point into merged image list.
const reindexPastedAliases = (pastedMolData, imageIndexOffset) => {
  if (!pastedMolData?.atoms || imageIndexOffset <= 0) return;
  pastedMolData.atoms.forEach((atom) => {
    if (atom?.alias && ALIAS_PATTERNS.threeParts.test(atom.alias)) {
      const parts = atom.alias.split('_');
      const oldIndex = parseInt(parts[2], 10);
      if (!Number.isNaN(oldIndex)) {
        parts[2] = String(imageIndexOffset + oldIndex);
        atom.alias = parts.join('_');
      }
    }
  });
};

// Merge current canvas ket with pasted ket so structure and PolymersList can be extended.
const mergeKetWithPasted = (currentKet, pastedKet) => {
  if (!currentKet?.root?.nodes?.length) return pastedKet;
  if (!pastedKet?.root?.nodes?.length) return currentKet;
  const currentMolRefs = currentKet.root.nodes.filter((n) => n && n.$ref);
  const currentImageCount = currentKet.root.nodes.filter((n) => n && n.type === 'image').length;
  const nextMolIndex = currentMolRefs.length;
  const pastedMolRefs = pastedKet.root.nodes.filter((n) => n && n.$ref);
  const merged = JSON.parse(JSON.stringify(currentKet));
  const insertIndex = currentMolRefs.length;
  for (let i = 0; i < pastedMolRefs.length; i++) {
    const newKey = `mol${nextMolIndex + i}`;
    const oldKey = pastedMolRefs[i].$ref;
    if (!pastedKet[oldKey]) continue;
    merged[newKey] = JSON.parse(JSON.stringify(pastedKet[oldKey]));
    reindexPastedAliases(merged[newKey], currentImageCount);
    merged.root.nodes.splice(insertIndex + i, 0, { $ref: newKey });
  }
  // Do not add pasted image/text nodes; addPolymerTags will create images for all R# atoms
  return merged;
};

function findTemplateById(id) {
  return allTemplates
    ?.flatMap((category) => category?.subTabs || [])
    .flatMap((subTab) => subTab?.shapes || [])
    .find((shape) => shape.template_id === id) || null;
}

// Helper to determine template type based on polymer value
// Formats: "0" / "0s" (single part) -> bead/surface; "3/95/1.00-1.00" (index/templateId/size) -> template 95; "6/7/1.00-2.00" -> template 7
const getTemplateType = (polymerValue) => {
  const trimmed = (polymerValue || '').trim();
  if (!trimmed) {
    const template = findTemplateById(KET_TAGS.templateBead);
    return { type: KET_TAGS.templateBead, size: template ? `${template.height}-${template.width}` : '1-1' };
  }
  const hasSurface = trimmed.includes('s');
  const binaryTemplates = hasSurface ? KET_TAGS.templateSurface : KET_TAGS.templateBead;
  const templateSplits = trimmed.split('/');
  if (templateSplits.length === 1) {
    const template = findTemplateById(binaryTemplates);
    return { type: binaryTemplates, size: template ? `${template.height}-${template.width}` : '1-1' };
  }
  if (!hasSurface && templateSplits.length >= 2) {
    return { type: templateSplits[1], size: templateSplits[2] || '1-1' };
  }
  return { type: binaryTemplates, size: templateSplits[1] || '1-1' };
};

// Helper to create a bounding box for a template with atom location
const templateWithBoundingBox = async (templateType, atomLocation, templateSize) => {
  let template = await fetchSurfaceChemistryImageData(templateType);
  if (!template) {
    template = await fetchSurfaceChemistryImageData(KET_TAGS.templateBead);
    if (template) {
      console.warn(`Template id ${templateType} not found, using bead (${KET_TAGS.templateBead}).`);
    }
  }
  if (!template) return null;
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

const prepareKetcherData = async (editor, initMol, options = {}) => {
  const { isPaste = false } = options;
  try {
    const polymerTagFromPasted = await hasKetcherData(initMol);
    const textNodes = await hasTextNodes(initMol);
    const molfileForIndigo = getStandardMolfileForIndigo(initMol);
    const formatError = (err) => (err?.message != null ? err.message : (err && typeof err?.toString === 'function' ? err.toString() : String(err)));

    let ketFile = await editor._structureDef.editor.indigo.convert(molfileForIndigo).catch((err) => {
      console.error('invalid molfile. Please try again', formatError(err));
      return null;
    });

    if (!ketFile?.struct && molfileForIndigo !== initMol) {
      ketFile = await editor._structureDef.editor.indigo.convert(initMol).catch((err) => {
        console.error('invalid molfile (fallback). Please try again', formatError(err));
        return null;
      });
    }

    if (!ketFile || !ketFile.struct) {
      console.error('Failed to convert molfile to ket format.');
      return;
    }

    let fileContent = JSON.parse(ketFile.struct);
    let polymerTagToUse = polymerTagFromPasted;

    if (isPaste && (storedPolymersListLine || polymerTagFromPasted)) {
      const extended = [storedPolymersListLine, polymerTagFromPasted].filter(Boolean).map((s) => s.trim()).join(' ');
      polymerTagToUse = extended || polymerTagToUse;
      try {
        const currentKetString = await editor.structureDef.editor.getKet();
        const currentKet = JSON.parse(currentKetString);
        fileContent = mergeKetWithPasted(currentKet, fileContent);
      } catch (e) {
        console.warn('Could not merge with current canvas, applying pasted only.', e);
      }
    }

    if (!isPaste && polymerTagFromPasted) {
      storedPolymersListLineSetter(polymerTagFromPasted);
    }

    textNodeStructSetter({});
    await applyKetcherData(polymerTagToUse, fileContent, textNodes, editor);

    if (polymerTagToUse) {
      storedPolymersListLineSetter(polymerTagToUse);
    }

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
