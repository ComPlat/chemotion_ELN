import StructureEditor from 'src/models/StructureEditor';

const EditorListParams = [
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
