/* eslint-disable no-restricted-syntax */
/* eslint-disable no-plusplus */
import { KET_TAGS, ALIAS_PATTERNS } from 'src/utilities/ketcherSurfaceChemistry/constants';
import {
  imagesList, mols, textList, textNodeStruct,
} from 'src/utilities/ketcherSurfaceChemistry/stateManager';
import { latestData } from 'src/components/structureEditor/KetcherEditor';
import {
  removeTextFromData,
} from 'src/utilities/ketcherSurfaceChemistry/AtomsAndMolManipulation';

// Safely extract { key, text } from a text node's data.content.
// data.content is normally Draft.js JSON but can be a plain string for legacy nodes.
// Returns null if content is absent or unparseable.
const parseDraftBlock = (content) => {
  if (!content) return null;
  try {
    const parsed = JSON.parse(content);
    const block = parsed?.blocks?.[0];
    if (block) return block;
  } catch (_e) { /* plain text */ }
  return null;
};

// Calculate available space on left and right sides of an atom/image.
// currentTextKey: Draft.js block key of the label being placed — skipped when scanning
//   other text labels so a label is never treated as an obstacle to itself.
// Returns { left: number, right: number } representing distance to nearest obstacle
const calculateAvailableSpace = (atomLocation, imageWidth, currentImageIndex, currentTextKey = null) => {
  const atomX = atomLocation[0];
  const atomY = atomLocation[1];
  const verticalThreshold = 2.0; // Only consider obstacles within this Y range

  let leftSpace = Infinity;
  let rightSpace = Infinity;

  // Check distance to other images
  for (let i = 0; i < imagesList.length; i++) {
    if (i === parseInt(currentImageIndex, 10)) continue; // Skip current image

    const img = imagesList[i];
    if (!img?.boundingBox) continue;

    const imgCenterX = img.boundingBox.x + img.boundingBox.width / 2;
    const imgCenterY = img.boundingBox.y - img.boundingBox.height / 2;

    // Only consider images that are roughly on the same horizontal level
    if (Math.abs(imgCenterY - atomY) > verticalThreshold) continue;

    const horizontalDistance = imgCenterX - atomX;

    if (horizontalDistance > 0) {
      // Image is to the right
      const edgeDistance = horizontalDistance - imageWidth / 2 - img.boundingBox.width / 2;
      rightSpace = Math.min(rightSpace, edgeDistance);
    } else {
      // Image is to the left
      const edgeDistance = Math.abs(horizontalDistance) - imageWidth / 2 - img.boundingBox.width / 2;
      leftSpace = Math.min(leftSpace, edgeDistance);
    }
  }

  // Check distance to other atoms (non-template atoms that might be part of molecules)
  for (const molKey of mols) {
    const mol = latestData[molKey];
    if (!mol?.atoms) continue;

    for (const atom of mol.atoms) {
      if (!atom?.location) continue;
      // Skip atoms that are part of template images (they have aliases)
      if (ALIAS_PATTERNS.threeParts.test(atom?.alias)) continue;

      const otherX = atom.location[0];
      const otherY = atom.location[1];

      // Only consider atoms that are roughly on the same horizontal level
      if (Math.abs(otherY - atomY) > verticalThreshold) continue;

      const horizontalDistance = otherX - atomX;
      const atomRadius = 0.5; // Approximate radius of an atom

      if (horizontalDistance > 0) {
        // Atom is to the right
        const edgeDistance = horizontalDistance - imageWidth / 2 - atomRadius;
        rightSpace = Math.min(rightSpace, edgeDistance);
      } else if (horizontalDistance < 0) {
        // Atom is to the left
        const edgeDistance = Math.abs(horizontalDistance) - imageWidth / 2 - atomRadius;
        leftSpace = Math.min(leftSpace, edgeDistance);
      }
    }
  }

  // Check other text labels as obstacles.
  // findByKeyAndUpdateTextNodePosition mutates textList entries in place, so labels
  // processed earlier in this placeTextOnAtoms pass already have their new positions.
  for (const textNode of textList) {
    if (!textNode?.data?.position) continue;
    const block = parseDraftBlock(textNode.data?.content);
    if (!block) continue;
    if (currentTextKey && block.key === currentTextKey) continue; // skip self

    const textStartX = textNode.data.position.x;
    const textY = textNode.data.position.y;
    if (Math.abs(textY - atomY) > verticalThreshold) continue;

    const otherTextWidth = Math.max(1.0, (block.text || '').length * 0.15);
    const textEndX = textStartX + otherTextWidth;
    const textCenterX = (textStartX + textEndX) / 2;

    if (textCenterX > atomX) {
      // Other label is to the right — gap from current image's right edge to text start
      const edgeDistance = textStartX - (atomX + imageWidth / 2);
      rightSpace = Math.min(rightSpace, edgeDistance);
    } else {
      // Other label is to the left — gap from text end to current image's left edge
      const edgeDistance = (atomX - imageWidth / 2) - textEndX;
      leftSpace = Math.min(leftSpace, edgeDistance);
    }
  }

  return { left: leftSpace, right: rightSpace };
};

// Determine which side (left or right) has more space for text placement
// Returns 'left' or 'right'
const determineBestSide = (atomLocation, imageWidth, currentImageIndex, textWidth = 1.0, currentTextKey = null) => {
  const { left, right } = calculateAvailableSpace(atomLocation, imageWidth, currentImageIndex, currentTextKey);

  // Right side has enough space for the text (with a small bias toward right)
  if (right >= textWidth + 0.3) {
    return 'right';
  }

  // Left side has enough space for the text
  if (left >= textWidth) {
    return 'left';
  }

  // Neither side has sufficient space — pick whichever has more room
  return right >= left ? 'right' : 'left';
};
// for text component (smaller font for labels attached to shapes)
// Convert KET 2.0 paragraphs array → Draft.js JSON string.
// Handles bold, italic, superscript, subscript, font size from part attributes.
const ket2ParagraphsToDraftContent = (paragraphs, key) => {
  const blocks = (Array.isArray(paragraphs) ? paragraphs : []).map((para, i) => {
    const parts = para.parts || [];
    const text = parts.map((p) => p.text || '').join('');
    const inlineStyleRanges = [];
    let offset = 0;
    for (const part of parts) {
      const length = (part.text || '').length;
      if (part.superscript) inlineStyleRanges.push({ style: 'SUPERSCRIPT', offset, length });
      if (part.subscript) inlineStyleRanges.push({ style: 'SUBSCRIPT', offset, length });
      if (part.bold) inlineStyleRanges.push({ style: 'BOLD', offset, length });
      if (part.italic) inlineStyleRanges.push({ style: 'ITALIC', offset, length });
      if (part.font?.size) inlineStyleRanges.push({ style: `fontsize-${part.font.size}`, offset, length });
      offset += length;
    }
    return {
      key: i === 0 ? key : `${key}_${i}`,
      text,
      type: 'unstyled',
      depth: para.indent || 0,
      inlineStyleRanges,
      entityRanges: [],
      data: {},
    };
  });
  const safeBlocks = blocks.length
    ? blocks
    : [{ key, text: '', type: 'unstyled', depth: 0, inlineStyleRanges: [], entityRanges: [], data: {} }];
  return JSON.stringify({ blocks: safeBlocks, entityMap: {} });
};

// Build Draft.js JSON content from a TextNode line description.
// Handles three cases in priority order:
//   1. KET 2.0 JSON  ({ paragraphs: [...] }) — from Ketcher >= 3.18 saves
//   2. Draft.js JSON ({ blocks: [...] })       — from pre-fix ELN saves (pass-through)
//   3. Plain text string                        — legacy molfiles predating KET 2.0
const forTextNodeHeader = (key, description) => {
  try {
    const parsed = JSON.parse(description);
    // Case 1: KET 2.0 paragraphs format
    if (Array.isArray(parsed?.paragraphs)) {
      return ket2ParagraphsToDraftContent(parsed.paragraphs, key);
    }
    // Case 2: already Draft.js — pass through (backward compat with pre-fix saves)
    if (Array.isArray(parsed?.blocks) && parsed.blocks.length > 0) {
      return description;
    }
  } catch (_e) { /* plain text — fall through */ }
  // Case 3: legacy plain text — wrap in a simple Draft.js block
  const text = description || '';
  const fontSize = KET_TAGS.textNodeFontSize;
  return JSON.stringify({
    blocks: [{
      key,
      text,
      type: 'unstyled',
      depth: 0,
      inlineStyleRanges: text.length > 0 ? [{ style: `fontsize-${fontSize}`, offset: 0, length: text.length }] : [],
      entityRanges: [],
      data: { fontSize },
    }],
    entityMap: {}
  });
};

// Build ordered list of atom aliases (matches PolymersList index 0,1,2...)
// ketData: optional structure to use when latestData is null (e.g. during initial load)
const getAtomsWithAliasInOrder = (ketData) => {
  const data = ketData || latestData;
  if (!data) return [];
  const molRefs = (data.root?.nodes || []).filter((n) => n?.$ref).map((n) => n.$ref);
  const aliases = [];
  for (const molKey of molRefs) {
    const mol = data[molKey];
    if (!mol?.atoms) continue;
    for (const atom of mol.atoms) {
      if (atom?.alias && ALIAS_PATTERNS.threeParts.test(atom.alias)) {
        aliases.push(atom.alias);
      }
    }
  }
  return aliases;
};

// Parse template id from alias (e.g. t_19_1 -> 19)
const getTemplateIdFromAlias = (alias) => {
  if (!alias || !ALIAS_PATTERNS.threeParts.test(alias)) return null;
  const parts = alias.split('_');
  const id = parseInt(parts[1], 10);
  return Number.isNaN(id) ? null : id;
};

// Find alias in list that matches template id (e.g. template 19 -> t_19_2)
const findAliasByTemplateId = (aliasesByIndex, templateId) => {
  for (const a of aliasesByIndex) {
    if (getTemplateIdFromAlias(a) === templateId) return a;
  }
  return null;
};

// generating images for ket2 format from molfile polymers list
// Resolve correct alias: prefer polymer index (canonical, handles duplicate templates),
// then template id (for legacy/wrong-index files), then file alias.
// ketData: optional structure for alias resolution when latestData is null (initial load)
//
// TextNode line formats (split by textIdentifier '#'):
//   KET 2.0 (Ketcher >= 3.18): polymerIndex # alias # {"paragraphs":[...],"indent":0}
//     — parts[1] matches t_N_N alias pattern
//   Legacy Draft.js (pre-fix / Ketcher < 3.18): polymerIndex # draftKey # alias # {Draft.js JSON or plain text}
//     — parts[1] is a Draft.js key (random alphanumeric, does NOT match t_N_N)
const addTextNodes = async (textNodes, textNodeMeta, ketData) => {
  const aliasesByIndex = getAtomsWithAliasInOrder(ketData);
  return textNodes.map((item) => {
    const parts = item.split(KET_TAGS.textIdentifier);
    if (parts.length < 3) return null;

    // Detect format by checking whether parts[1] is a t_N_N alias (new) or a Draft.js key (old)
    const isKet2Format = ALIAS_PATTERNS.threeParts.test(parts[1]);

    let polymerIndexStr, key, fileAlias, description;
    if (isKet2Format) {
      // New format: polymerIndex#alias#ket2json
      const [pi, fa, ...rest] = parts;
      polymerIndexStr = pi;
      fileAlias = fa;
      description = rest.join(KET_TAGS.textIdentifier);
      key = fileAlias; // alias serves as the unique key in KET 2.0 format
    } else {
      // Legacy format: polymerIndex#draftKey#alias#content
      if (parts.length < 4) return null;
      const [pi, k, fa, ...rest] = parts;
      polymerIndexStr = pi;
      key = k;
      fileAlias = fa;
      description = rest.join(KET_TAGS.textIdentifier);
    }

    if (!key) return null;
    const polymerIndex = parseInt(polymerIndexStr, 10);
    const templateId = getTemplateIdFromAlias(fileAlias);
    let alias = null;
    if (!Number.isNaN(polymerIndex) && polymerIndex >= 0 && polymerIndex < aliasesByIndex.length) {
      alias = aliasesByIndex[polymerIndex];
    }
    if (!alias && templateId != null) {
      alias = findAliasByTemplateId(aliasesByIndex, templateId);
    }
    if (!alias) alias = fileAlias;
    if (alias) {
      textNodeStruct[alias] = key;
      // KET 2.0: forTextNodeHeader detects paragraphs JSON and converts to Draft.js.
      // Legacy: prefer TextNodeMeta (rich Draft.js JSON) over forTextNodeHeader plain-text fallback.
      const content = isKet2Format
        ? forTextNodeHeader(key, description)
        : (textNodeMeta && textNodeMeta[key]) || forTextNodeHeader(key, description);
      const defaultX = 10.325000000000001;
      const defaultY = -11.325000000000001;
      return {
        type: 'text',
        data: {
          content,
          position: { x: defaultX, y: defaultY, z: 0 },
          pos: [
            { x: defaultX, y: defaultY, z: 0 },
            { x: defaultX, y: defaultY - 0.375, z: 0 },
            { x: defaultX + 0.71724853515625, y: defaultY - 0.375, z: 0 },
            { x: defaultX + 0.71724853515625, y: defaultY, z: 0 }
          ]
        }
      };
    }
    return null;
  });
};

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

// find by key and update text node position from alias matching atoms
// Now with dynamic side selection - places text on left or right based on available space
const findByKeyAndUpdateTextNodePosition = async (textNodeKey, atom) => {
  for (let textIdx = 0; textIdx < textList.length; textIdx++) {
    const text = textList[textIdx];
    const block = parseDraftBlock(text.data?.content);
    if (!block) continue; // eslint-disable-line no-continue
    const content = { blocks: [block] };
    if (content.blocks[0].key === textNodeKey) {
      const split = atom.alias.split('_')[2];
      const img = imagesList?.[split];
      const imageWidth = img?.boundingBox?.width ?? 1;

      // Estimate text width based on content length (rough approximation)
      const textContent = content.blocks[0].text || '';
      const estimatedTextWidth = Math.max(1.0, textContent.length * 0.15);

      // Determine best side for text placement (pass key so its own label is not an obstacle)
      const bestSide = determineBestSide(atom.location, imageWidth, split, estimatedTextWidth, textNodeKey);

      let positionX;
      if (bestSide === 'right') {
        // Place text on right side (original behavior)
        positionX = (atom.location[0] + imageWidth / 2) + 0.1;
      } else {
        // Place text on left side - need to offset by text width (with extra spacing)
        positionX = (atom.location[0] - imageWidth / 2) - estimatedTextWidth - 0.17;
      }

      text.data.position = {
        x: positionX,
        y: atom.location[1],
        z: atom.location[2]
      };
      // Update pos array to match new position
      text.data.pos = [
        { x: positionX, y: atom.location[1], z: atom.location[2] },
        { x: positionX, y: atom.location[1] - 0.375, z: atom.location[2] },
        { x: positionX + 0.71724853515625, y: atom.location[1] - 0.375, z: atom.location[2] },
        { x: positionX + 0.71724853515625, y: atom.location[1], z: atom.location[2] }
      ];
      return text;
    }
  }
  return null;
};

// compare 2 array and fetch index content
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

// filter text nodes by key, key as in text key
const filterTextList = async (_aliasDifferences, data) => {
  const activeKeys = new Set(Object.values(textNodeStruct));
  if (!activeKeys.size) {
    return removeTextFromData(data);
  }

  const retainedTextNodes = textList.filter((item) => {
    const block = parseDraftBlock(item.data?.content);
    return block ? activeKeys.has(block.key) : false;
  });

  return [...removeTextFromData(data), ...retainedTextNodes];
};

export {
  parseDraftBlock,
  forTextNodeHeader,
  addTextNodes,
  isAliasConsistent,
  findByKeyAndUpdateTextNodePosition,
  deepCompare,
  deepCompareNumbers,
  deepCompareContent,
  filterTextList,
  calculateAvailableSpace,
  determineBestSide
};
