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
  chemdraw:
  {
    structure:
    {
      getMfFuncName: 'getMOL',
      setMfFuncName: 'loadMOL',
      getSVGFuncName: 'getSVG',
      getSmiFuncName: 'getSMILES',
      getMfWithCallback: true,
      setMolfileInFrame: false,
      getMolfileFunction: 'getMOL',
      getSVGWithCallback: true,
      getSmiWithCallback: true
    },
    extConf:
    {
      layout: { orientation: 'Horizontal' },
      features: { enabled: ['WebService'] },
      properties: { StyleSheet: 'ACS Document 1996', chemservice: 'https://chemdrawdirect.perkinelmer.cloud/rest' }
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
