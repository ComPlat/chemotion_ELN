const EditorAttrs =
{
  ketcher:
  {
    label: 'ketcher-rails',
    src: '/ketcher',
    structure:
    {
      path: 'ketcher',
      setMolfileInFrame: false,
      setMfFuncName: 'setMolecule',
      getMfFuncName: 'getMolfile',
      getMfWithCallback: false,
      getSVGFuncName: 'getSVG',
      getSVGWithCallback: false
    }
  },
  ketcher2:
  {
    structure:
    {
      path: 'ketcher',
      setMolfileInFrame: false,
      setMfFuncName: 'setMolecule',
      getMfFuncName: 'getMolfile',
      getMfWithCallback: false,
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
