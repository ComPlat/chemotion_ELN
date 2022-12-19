export default FormData = {
  forms: [
    {
      id: 0,
      value: 'advanced',
      label: 'Advanced Search',
      component: 'advanced',
      component_path: './forms/AdvancedSearchForm'
    },
    {
      id: 1,
      value: 'ketcher',
      label: 'ketcher-rails',
      component: 'ketcher',
      component_path: './forms/KetcherRailsForm',
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