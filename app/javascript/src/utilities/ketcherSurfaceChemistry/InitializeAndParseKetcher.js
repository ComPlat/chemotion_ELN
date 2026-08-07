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
  allNodesSetter,
  imagesListSetter,
  molsSetter,
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
import { rootStore } from 'src/stores/mobx/RootStore';

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
// preserveImagesWhenEmpty: when true (from fetchKetcherData), keep imagesList if data has no images
// because getKet() often omits them. When false (default), always sync imagesList with data.
const loadKetcherData = async (data, options = {}) => {
  const { preserveImagesWhenEmpty = false } = options;
  const nodes = data?.root?.nodes && Array.isArray(data.root.nodes) ? data.root.nodes : [];
  allAtomsSetter([]);
  allNodesSetter([...nodes]);

  const imageNodesFromData = nodes.filter((item) => item.type === 'image');

  if (imageNodesFromData.length > 0) {
    imagesListSetter(imageNodesFromData);
  } else if (!preserveImagesWhenEmpty) {
    imagesListSetter([]);
  }

  // Text nodes are managed in local state; getKet() never returns them after initial load.
  // Always sync textList: set to found nodes, or clear if the canvas has none.
  const textNodesFromData = nodes.filter((item) => item.type === 'text');
  if (textNodesFromData.length > 0) {
    textListSetter(textNodesFromData);
  } else if (!preserveImagesWhenEmpty) {
    textListSetter([]);
  }

  // Derive mol refs by $ref presence — more robust than index slicing when node order varies.
  const molRefs = (nodes || []).filter((n) => n?.$ref).map((n) => n.$ref);
  molsSetter(molRefs);
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

// helper function to examine the file coming from ketcher/rails
// Use the *first* PolymersList block so shape order is preserved on import (matches atom index order).
const hasKetcherData = async (molfile) => {
  if (!molfile) {
    console.error('Invalid molfile source.');
    return null;
  }

  try {
    const lines = molfile.trim().split('\n');
    const firstIndex = lines.findIndex((line) => line.includes(KET_TAGS.polymerIdentifier));
    if (firstIndex === -1) return null;
    // Collect content lines after "> <PolymersList>" until next block tag (preserve order for shapes)
    const contentLines = [];
    for (let i = firstIndex + 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (line.startsWith('> <')) break;
      if (line.length > 0) contentLines.push(line);
    }
    return contentLines.length > 0 ? contentLines.join(' ') : null;
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

// Strip stereoLabel / stereoFlagPosition that Indigo auto-generates from wedge bonds.
// V2000 MOL cannot store stereogroup data so these fields are always Indigo inventions, never
// user-set values. Removing them prevents "ABS" from reappearing on every reopen while leaving
// wedge bond geometry intact. Users may still add stereo labels in-session; they just won't
// persist (V2000 limitation).
//
// Also converts bare rg-label atoms (R# without M RGP / no R-group definition) to plain label
// atoms. Indigo produces rg-label type when converting a bare R# atom, but its own JSON loader
// rejects rg-label without a complete R-group definition — causing "invalid atom type: rg-label"
// errors when the user tries to save.
const stripAutoEnhancedStereo = (ketJson) => {
  if (!ketJson) return ketJson;
  const result = { ...ketJson };

  // Collect all R-group keys actually defined in the KET root nodes
  const definedRGroups = new Set(
    (result.root?.nodes || [])
      .map((n) => n.$ref)
      .filter((ref) => typeof ref === 'string' && ref.startsWith('rg'))
  );

  for (const key of Object.keys(result)) {
    if (key === 'root') continue;
    const mol = result[key];
    if (!mol || typeof mol !== 'object') continue;
    if (mol.atoms) {
      mol.atoms = mol.atoms.map((atom) => {
        // eslint-disable-next-line no-unused-vars
        const { stereoLabel, ...rest } = atom;
        // Convert rg-label atoms whose R-group definitions are absent — Indigo's JSON loader
        // rejects them and the user cannot save. Keep the label so the atom still displays as R#.
        if (rest.type === 'rg-label') {
          const refs = Array.isArray(rest.$refs) ? rest.$refs : [];
          const hasDefinition = refs.some((ref) => definedRGroups.has(ref));
          if (!hasDefinition) {
            // eslint-disable-next-line no-unused-vars
            const { type, $refs, ...atomRest } = rest;
            return { ...atomRest, label: atomRest.label || 'R#' };
          }
        }
        return rest;
      });
    }
    if ('stereoFlagPosition' in mol) {
      // eslint-disable-next-line no-unused-vars
      const { stereoFlagPosition, ...rest } = mol;
      result[key] = rest;
    }
  }
  return result;
};

// Unconditionally convert every rg-label atom to a plain label atom.
// Ketcher stores R# atoms as rg-label internally and always creates a matching
// definition node — so the hasDefinition guard in stripAutoEnhancedStereo never
// fires for them. This function is called on every getKet() result so that
// latestData and anything downstream (setMolecule, generateImage) never receive
// the rg-label type that Indigo's KET loader rejects.
const sanitizeRgLabelAtoms = (ketJson) => {
  if (!ketJson || typeof ketJson !== 'object') return ketJson;
  const result = { ...ketJson };
  for (const key of Object.keys(result)) {
    if (key === 'root') continue;
    const mol = result[key];
    if (!mol?.atoms) continue;
    if (!mol.atoms.some((a) => a.type === 'rg-label')) continue;
    result[key] = {
      ...mol,
      atoms: mol.atoms.map((atom) => {
        if (atom.type !== 'rg-label') return atom;
        // eslint-disable-next-line no-unused-vars
        const { type, $refs, ...rest } = atom;
        return { ...rest, label: rest.label || 'R#' };
      }),
    };
  }
  return result;
};

// Return molfile string up to and including M  END so Indigo only sees standard CTAB.
const getStandardMolfileForIndigo = (molfile) => {
  if (!molfile || typeof molfile !== 'string') return molfile;
  const normalized = molfile.replace(/\r\n/g, '\n');
  const lines = normalized.split('\n');
  const endIndex = lines.findIndex((line) => /^M\s+END/.test(line));
  if (endIndex === -1) return molfile;
  return lines.slice(0, endIndex + 1).join('\n');
};

// Build a synthetic PolymersList (indexed format) from V2000 atom alias blocks for files that
// predate the explicit PolymersList tag. The alias block format is:
//   A    <atom_number_1indexed>
//   t_<templateType>_<imageIndex>
// We default size to 1.00-1.00 since older files were created before size support was added.
const extractPolymerTagFromAliases = (molfile) => {
  if (!molfile || typeof molfile !== 'string') return null;
  // Normalize both \r\n (Windows) and bare \r (classic Mac) to \n.
  const lines = molfile.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');
  const entries = [];
  for (let i = 0; i < lines.length; i++) {
    const match = lines[i].match(/^A\s+(\d+)$/);
    if (match && i + 1 < lines.length) {
      const aliasText = lines[i + 1].trim();
      // Anchored regex avoids false positives from aliases with extra underscores.
      const aliasMatch = aliasText.match(/^t_(\d+)_(\d+)$/);
      if (aliasMatch) {
        const templateType = parseInt(aliasMatch[1], 10);
        const atomIndex = parseInt(match[1], 10) - 1; // V2000 is 1-indexed
        if (!Number.isNaN(templateType) && atomIndex >= 0) {
          entries.push(`${atomIndex}/${templateType}/1.00-1.00`);
        }
      }
    }
  }
  return entries.length > 0 ? entries.join(' ') : null;
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

// Parse polymer entry as atomIndex/templateId/size when present (e.g. "2/10/1.00-1.00").
// Returns { atomIndex, type, size } or null when format is legacy (e.g. "0", "0s", "3/95/1.00-1.00" without leading index).
const parsePolymerEntryByAtomIndex = (polymerValue) => {
  const trimmed = (polymerValue || '').trim();
  if (!trimmed || trimmed.includes('s')) return null;
  const parts = trimmed.split('/');
  if (parts.length < 3) return null;
  const atomIndex = parseInt(parts[0], 10);
  const templateId = parts[1];
  if (Number.isNaN(atomIndex) || templateId === undefined) return null;
  const templateIdNum = parseInt(templateId, 10);
  if (Number.isNaN(templateIdNum)) return null;
  return { atomIndex, type: templateId, size: parts[2] || '1-1' };
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
    // Ketcher stores R# atoms as rg-label internally. Strip them so latestData
    // never contains rg-label — Indigo's KET loader rejects that type in every
    // downstream call (setMolecule, generateImage, getMolfile).
    const raw = JSON.parse(ketString);
    const data = sanitizeRgLabelAtoms(raw);
    await latestDataSetter(data);
    // preserveImagesWhenEmpty: Ketcher's getKet() often omits image nodes from its output.
    // If data has no images, keep the existing imagesList rather than wiping it.
    await loadKetcherData(data, { preserveImagesWhenEmpty: true });
  } catch (err) {
    console.error('fetchKetcherData', err.message);
  }
};

const prepareKetcherData = async (editor, initMol, options = {}) => {
  const { isPaste = false } = options;
  try {
    const polymerTagFromPasted = await hasKetcherData(initMol)
      || extractPolymerTagFromAliases(initMol);
    const textNodes = await hasTextNodes(initMol);

    // Fast path: no polymer or text data and not a paste-merge operation.
    // Pass the V2000 MOL directly to Ketcher (bypasses indigo.convert) so:
    //  - bare R# atoms (no M RGP) don't become invalid rg-label atoms in the KET loader
    //  - wedge bonds render without Indigo auto-generating ABS stereogroups
    if (!polymerTagFromPasted && !textNodes?.length && !isPaste) {
      const cleanMol = getStandardMolfileForIndigo(initMol);
      try {
        await editor.structureDef.editor.setMolecule(cleanMol);
      } catch (setErr) {
        NotificationActions.add({
          title: 'Structure Editor error',
          message: setErr?.message || String(setErr),
          level: 'error',
          position: 'tc',
          dismissible: 'button',
          autoDismiss: 12,
        });
        return;
      }
      // Clear polymer state from any previously loaded molecule so paste operations
      // on this structure don't inherit the prior molecule's polymer decorations.
      storedPolymersListLineSetter(null);
      await fetchKetcherData(editor);
      setTimeout(async () => { await centerPositionCanvas(editor); }, 100);
      return;
    }

    const molfileForIndigo = getStandardMolfileForIndigo(initMol);
    const formatError = (err) => {
      if (err?.message != null) return err.message;
      if (err && typeof err?.toString === 'function') return err.toString();
      return String(err);
    };
    const notifyMolfileError = (details, level = 'error') => {
      rootStore.notificationsStore.add({
        title: 'Structure Editor error',
        message: `${details}`,
        level,
        position: 'tc',
        autoDismiss: 12,
      });
    };
    const conversionErrors = [];

    let ketFile = await editor._structureDef.editor.indigo.convert(molfileForIndigo).catch((err) => {
      conversionErrors.push(`Ketcher/Indigo ${formatError(err)}`);
      return null;
    });

    if (conversionErrors.length > 0) {
      const uniqueErrors = [...new Set(conversionErrors)];
      notifyMolfileError(uniqueErrors.join(' | '), 'error');
    }

    if (!ketFile || !ketFile.struct) {
      console.error('Failed to convert molfile to ket format.');
      return;
    }

    let fileContent = stripAutoEnhancedStereo(JSON.parse(ketFile.struct));
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
  extractPolymerTagFromAliases,
  getTemplateType,
  parsePolymerEntryByAtomIndex,
  templateWithBoundingBox,
  fetchKetcherData,
  loadKetcherData,
  prepareKetcherData,
  loadTemplates,
  sanitizeRgLabelAtoms,
};
