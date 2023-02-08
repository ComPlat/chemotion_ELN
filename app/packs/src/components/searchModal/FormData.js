export default FormData = {
  forms: [
    {
      id: 0,
      value: 'advanced',
      label: 'Advanced Search',
      component: 'advanced'
    },
    {
      id: 1,
      value: 'ketcher',
      label: 'ketcher-rails',
      component: 'ketcher',
      structure: {
        path: 'ketcher',
        setMolfileInFrame: false,
        setMfFuncName: 'setMolecule',
        getMfFuncName: 'getMolfile',
        getMfWithCallback: false,
        getSVGFuncName: 'getSVG',
        getSVGWithCallback: false
      }
    }
  ]
}