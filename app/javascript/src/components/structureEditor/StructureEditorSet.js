const EditorAttrs = {
  ketcher:
  {
    structure:
    {
      path: 'ketcher',
      setMolfileInFrame: false,
      setMfFuncName: 'setMolecule',
      getMfFuncName: 'getMolfile',
      getMfWithCallback: false,
      getRxnFuncName: 'getRxn',
      getSVGFuncName: 'getSVG',
    }
  },
  chemdraw:
  {
    structure:
    {
      getMfFuncName: 'getMOL',
      setMfFuncName: 'loadMOL',
      getSVGFuncName: 'getSVG',
      getMfWithCallback: true,
      setMolfileInFrame: false,
      getMolfileFunction: 'getMOL',
      getSVGWithCallback: true,
    }
  },
  marvinjs:
  {
    structure:
    {
      getMfWithCallback: true,
      getSVGFuncName: 'render',
      getSVGWithCallback: true
    }
  }
};

export default EditorAttrs;
