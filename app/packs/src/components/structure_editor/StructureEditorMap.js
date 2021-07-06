import StructureEditor from '../models/StructureEditor';

const EditorListParams = [
  {
    id: 'ifkecther', // iframe id attribute
    value: 'ketcher', // editor dropdown value
    label: 'ketcher-rails', // displayed name in editor dropdown selector
    src: '/ketcher', // iframe src attribute
    title: 'ketcher-rails structure editor', // iframe title attribute
    path: 'ketcher', // path to editor in frame.contentWindow
    setMolfileInFrame: false, // false or var name: molfile can be saved in a document var until the edito is loaded
    setMfFuncName: 'setMolecule',
    getMfFuncName: 'getMolfile',
    getMfWithCallback: false,
    // getSmiFuncName: 'getSmiles',
    // getSmiWithCallback: false,
    getSVGFuncName: 'getSVG',
    getSVGWithCallback: false,
  },
  // TODO mv additional editor configs to user profile
  // {
  //   id: 'ifChemDraw',
  //   value: 'chemdraw',
  //   label: 'ChemDrawJS',
  //   src: 'cdjs/sample/index0.html',
  //   title: 'ChemDrawJS editor',
  //   path: 'cddInstance',
  //   setMolfileInFrame: 'molfileInput',
  //   // setMfFuncName: 'loadMOL',
  //   getMfFuncName: 'getMOL',
  //   getMfWithCallback: true,
  //   getSmiFuncName: 'getSMILES',
  //   getSmiWithCallback: true,
  //   getSVGFuncName: 'getSVG',
  //   getSVGWithCallback: true,
  // }
];

const EditorList = EditorListParams.reduce((acc, args) => {
  acc[args.value] = new StructureEditor(args);
  return acc;
}, new Map());

export { EditorListParams, EditorList };
