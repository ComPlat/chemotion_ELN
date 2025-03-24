/* eslint-disable import/no-mutable-exports */
import { KET_TAGS } from 'src/utilities/ketcherSurfaceChemistry/constants';

export let FILOStack = []; // a stack to main a list of event triggered
export const uniqueEvents = new Set(); // list of unique event from the canvas
export let ImagesToBeUpdated = false;
export let imagesList = []; // image list has all nodes matching type === image
export let mols = []; // mols has list of molecules present in ket2 format ['mol0', 'mol1']
export let allNodes = []; // contains a list of latestData.root.nodes list
export let allAtoms = []; // contains list of all atoms present in a ketcher2 format
export let reloadCanvas = false; // flag to re-render canvas
export let canvasSelection = null; // contains list of images, atoms, bonds selected in the canvas
export let deletedAtoms = []; // has a list of deleted atoms on delete "atom event"
export let textList = []; // contains a list of original images when tool bar buttons are called
export let textNodeStruct = {}; // contains a list of original text when tool bar buttons are called
export let imageListCopyContainer = [];
export let textListCopyContainer = [];
export let { editor } = window; // reference to the editor
export let allTemplates = {}; // contains all templates
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
  allTemplates = data;
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

// keep a copy of imageList and textList
export const fetchAndReplace = () => {
  imageListCopyContainerSetter([...imagesList]);
  textListCopyContainerSetter([...textList]);
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
    templates: []
  }
});

export const addNewMol = (tempId, imageNodeCounter) => ({
  type: 'molecule',
  atoms: [
    {
      label: KET_TAGS.inspiredLabel,
      alias: `t_${tempId}_${imageNodeCounter}`,
      location: [
        1,
        -1,
        0
      ]
    },
  ]
});
