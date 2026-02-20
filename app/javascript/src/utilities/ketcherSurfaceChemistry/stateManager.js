/* eslint-disable import/no-mutable-exports */
import { KET_TAGS } from 'src/utilities/ketcherSurfaceChemistry/constants';
import { imageNodeCounter } from 'src/components/structureEditor/KetcherEditor';
import { centerPositionCanvas, onTemplateMove } from 'src/utilities/ketcherSurfaceChemistry/canvasOperations';

export let FILOStack = []; // a stack to main a list of event triggered
export const uniqueEvents = new Set(); // list of unique event from the canvas
export let ImagesToBeUpdated = false;
export let imagesList = []; // image list has all nodes matching type === image
export let mols = []; // mols has list of molecules present in ket2 format ['mol0', 'mol1']
export let allNodes = []; // contains a list of latestData.root.nodes list
export let allAtoms = []; // contains list of all atoms present in a ketcher format
export let reloadCanvas = false; // flag to re-render canvas
export let canvasSelection = null; // contains list of images, atoms, bonds selected in the canvas
export let deletedAtoms = []; // has a list of deleted atoms on delete "atom event"
export let textList = []; // contains a list of original images when tool bar buttons are called
export let textNodeStruct = {}; // contains a list of original text when tool bar buttons are called
export let imageListCopyContainer = [];
export let textListCopyContainer = [];
export let { editor } = window; // reference to the editor
export let canvasIframeRef = null;
export let allTemplates = {}; // contains all templates
export let templatesBaseHashWithTemplateId = {}; // contains all templates
export let allowProcessing = true;
export let upsertImageCalled = 0;

export const FILOStackSetter = async (data) => {
  FILOStack = data;
};

export const uniqueEventsClear = async () => {
  uniqueEvents.clear();
};

export const uniqueEventsAddEvent = async (event) => {
  uniqueEvents.add(event);
};

// setter
export const ImagesToBeUpdatedSetter = (status) => {
  ImagesToBeUpdated = status;
};

export const imagesListSetter = (data) => {
  imagesList = data;
};

export const molsSetter = (data) => {
  mols = data;
};

export const allNodesSetter = (data) => {
  allNodes = data;
};

export const allAtomsSetter = (data) => {
  allAtoms = data;
};

export const reloadCanvasSetter = (status) => {
  reloadCanvas = status;
};

export const canvasSelectionsSetter = (data) => {
  canvasSelection = data;
};

export const deletedAtomsSetter = (data) => {
  deletedAtoms = data;
};

export const textListSetter = (data) => {
  textList = data;
};

export const textNodeStructSetter = (data) => {
  textNodeStruct = { ...data };
};

// set templates dataset
export const templateListSetter = async (data) => {
  allTemplates = Object.values(data || {}).flat();
};

// Set base64-encoded SVG templates by template_id
export const setBase64TemplateHashSetter = async (data) => {
  const templateHash = {};
  if (Object.keys(data).length > 0) {
    data?.forEach((group) => {
      group.subTabs.forEach((subTab) => {
        subTab.shapes.forEach((shape) => {
          templateHash[shape.template_id] = shape.iconName;
        });
      });
    });
  }
  templatesBaseHashWithTemplateId = templateHash;
};

export const allowProcessingSetter = (data) => {
  allowProcessing = data;
};

export const imageListCopyContainerSetter = (data) => {
  imageListCopyContainer = data;
};

export const textListCopyContainerSetter = (data) => {
  textListCopyContainer = data;
};

// Helper to get current atom positions hash for comparison
const getAtomPositionsHash = async (editorLoc) => {
  try {
    const data = JSON.parse(await editorLoc.structureDef.editor.getKet());
    const positions = [];
    Object.keys(data).forEach((key) => {
      if (data[key]?.atoms) {
        data[key].atoms.forEach((atom) => {
          if (atom.location) {
            positions.push(atom.location.join(','));
          }
        });
      }
    });
    return positions.join('|');
  } catch {
    return '';
  }
};

// keep a copy of imageList and textList
// After button actions (CLEAN_UP, LAYOUT, etc.), atoms are repositioned by Ketcher
// so images and text nodes should follow the new atom positions
export const fetchAndReplace = async (editorLoc) => {
  // Deep copy imagesList and textList BEFORE Ketcher modifies them
  // This preserves original dimensions (width, height) and data
  const imagesCopy = imagesList.map((img) => ({
    ...img,
    boundingBox: img.boundingBox ? { ...img.boundingBox } : undefined,
  }));
  const textCopy = textList.map((txt) => ({
    ...txt,
    data: txt.data ? { ...txt.data, position: txt.data.position ? { ...txt.data.position } : undefined } : undefined,
  }));

  imageListCopyContainerSetter(imagesCopy);
  textListCopyContainerSetter(textCopy);

  // Get initial atom positions to detect when Ketcher finishes
  const initialHash = await getAtomPositionsHash(editorLoc);

  // Poll until atoms have moved (Ketcher finished) or timeout
  const pollInterval = 50; // Check every 50ms
  const maxWait = 2000; // Maximum 2 seconds
  let elapsed = 0;

  const waitForKetcher = () => new Promise((resolve) => {
    const checkPositions = async () => {
      elapsed += pollInterval;
      const currentHash = await getAtomPositionsHash(editorLoc);

      // If positions changed or max time reached, we're done
      if (currentHash !== initialHash || elapsed >= maxWait) {
        // Small additional delay to ensure Ketcher has fully settled
        setTimeout(resolve, 50);
        return;
      }

      // Keep polling
      setTimeout(checkPositions, pollInterval);
    };

    // Start polling after a brief initial delay
    setTimeout(checkPositions, pollInterval);
  });

  await waitForKetcher();
  await onTemplateMove(editorLoc, null, { syncImagesOnly: true });
};

export const eventUpsertImageDecrement = () => {
  upsertImageCalled--;
};

export const eventUpsertImageSetter = (count) => {
  upsertImageCalled = count;
};

export const setEditor = (ref) => {
  editor = ref;
};

export const canvasIframeRefSetter = (ref) => {
  canvasIframeRef = ref;
};

export const resetKetcherStore = () => {
  FILOStack = [];
  uniqueEvents.clear();
  ImagesToBeUpdated = false;
  imagesList = [];
  mols = [];
  allNodes = [];
  allAtoms = [];
  deletedAtoms = [];
  textList = [];
  reloadCanvas = false;
  canvasSelection = null;
  textNodeStruct = {};
  textList = [];
  allowProcessing = true;
  imageListCopyContainer = [];
  textListCopyContainer = [];
};

export const emptyKetcherStore = () => ({
  root: {
    nodes: [],
    connections: [],
    templates: [],
  },
});

export const addNewMol = (tempId) => ({
  type: 'molecule',
  atoms: [
    {
      label: KET_TAGS.inspiredLabel,
      alias: `t_${tempId}_${imageNodeCounter}`,
      location: [-1.5250001907348631, 1.5250000000000004, 0],
    },
  ],
});
