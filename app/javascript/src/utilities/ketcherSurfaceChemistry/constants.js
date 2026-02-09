// Constants
const ALIAS_PATTERNS = Object.freeze({
  threeParts: /t_\d{1,3}_\d{1,3}/,
  twoParts: /^t_\d{1,3}$/,
});

const LAYERING_FLAGS = Object.freeze({
  skipTemplateName: false,
  skipImageLayering: false,
});

const KET_TAGS = Object.freeze({
  inspiredLabel: 'A',
  RGroupTag: 'R#',
  templateSurface: 96,
  templateBead: 95,
  polymerIdentifier: '> <PolymersList>',
  textNodeIdentifier: '> <TextNode>',
  textNodeIdentifierClose: '> </TextNode>',
  fileEndIdentifier: '$$$$',
  molfileHeaderLinenumber: 4,
  rgLabel: 'rg-label',
  shapes: ['Bead', 'Surface'],
  moleculeIdentifier: '> <MoleculesList>',
  textIdentifier: '#',
  templateEditProps: {
    text: 'You are adding a text description to the selected template',
    id: 'templateSelectedInfo',
  },
});

// Button actions
// These actions are used in the Ketcher UI for various functionalities
const ButtonSelectors = {
  CLEAN_UP: 'Clean Up (Ctrl+Shift+L)',
  CALCULATE_CIP: 'Calculate CIP (Ctrl+P)',
  LAYOUT: 'Layout (Ctrl+L)',
  EXPLICIT_HYDROGENS: 'Add/Remove explicit hydrogens',
  AROMATIZE: 'Aromatize (Alt+A)',
  DEAROMATIZE: 'Dearomatize (Ctrl+Alt+A)',
  VIEWER_3D: '3D Viewer',
  OPEN: 'Open... (Ctrl+O)',
  SAVE: 'Save as... (Ctrl+S)',
  UNDO: 'Undo (Ctrl+Z)',
  REDO: 'Redo (Ctrl+Shift+Z)',
  POLYMER_LIST: 'Solid Surface Templates',
  ADD_LABEL: 'Add Label',
  CLEAR_CANVAS: 'Clear Canvas (Ctrl+Del)',
  TEXT_NODE_SPECIAL_CHAR: 'Text Node Special Char',
};

// Function to get the button selector based on the label
const getButtonSelector = (label) => `[title='${label.replace(/[()]/g, (match) => `\\${match}`)}']`;

// These event names are used to track user interactions in the Ketcher application
export const EventNames = {
  MOVE_IMAGE: 'Move image',
  MOVE_ATOM: 'Move atom',
  ADD_ATOM: 'Add atom',
  DELETE_ATOM: 'Delete atom',
  ADD_TEXT: 'Add text',
  DELETE_TEXT: 'Delete text',
  UPSERT_IMAGE: 'Upsert image',
  DELETE_IMAGE: 'Delete image',
  LOAD_CANVAS: 'Load canvas',
  ADD_BOND: 'Add bond',
};

// DOM element handlers
export const KET_DOM_TAG = Object.freeze({
  textBehindImg: 'A',
  tagCompBehindImg: ['text', 'span'],
  imageTag: 'image',
});

export { ALIAS_PATTERNS, KET_TAGS, LAYERING_FLAGS, ButtonSelectors, getButtonSelector };
