// Constants
const ALIAS_PATTERNS = Object.freeze({
  threeParts: /t_\d{1,3}_\d{1,3}/,
  twoParts: /^t_\d{1,3}$/
});

const LAYERING_FLAGS = Object.freeze({
  skipTemplateName: false,
  skipImageLayering: false
});

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
  moleculeIdentifier: '> <MoleculesList>',
  textIdentifier: '#',
  templateEditProps: {
    text: 'You are adding a text description to the selected template',
    id: 'templateSelectedInfo'
  }
});

export { ALIAS_PATTERNS, KET_TAGS, LAYERING_FLAGS };
