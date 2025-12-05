const selectOptions = {
  sbmm_type: [
    { label: 'Protein', value: 'protein' },
  ],
  sbmm_sub_type: [
    { label: 'Unmodified', value: 'unmodified' },
    { label: 'Glycoprotein', value: 'glycoprotein' },
  ],
  uniprot_derivation: [
    { label: 'Does not exist', value: 'uniprot_unknown' },
    { label: 'Protein used as described in Uniprot / reference', value: 'uniprot' },
    { label: 'Used modified protein', value: 'uniprot_modified' },
  ],
  sbmm_search_by: [
    { label: 'UniProt ID', value: 'accession' },
    { label: 'Name', value: 'protein_name' },
    { label: 'EC-Number', value: 'ec' },
    { label: 'Sequence (ELN only)', value: 'sequence' }
  ],
  sample_function_or_application: [
    { label: 'Enzyme', value: 'enzyme' },
    { label: 'Hormone', value: 'hormone' },
    { label: 'Structural', value: 'structural' },
    { label: 'Component', value: 'component' },
    { label: 'Energy source', value: 'energy_source' },
  ],
  sample_obtained_by: [
    { label: 'Purchased', value: 'purchased' },
    { label: 'Self Produced', value: 'self_produced' },
  ],
  sample_formulation: [
    { label: 'Dissolved', value: 'dissolved' },
    { label: 'Solid', value: 'solid' },
  ],
  heterologous_expression: [
    { label: 'Yes', value: 'yes' },
    { label: 'No', value: 'no' },
    { label: 'Unknown', value: 'unknown' },
  ],
};

export { selectOptions };
