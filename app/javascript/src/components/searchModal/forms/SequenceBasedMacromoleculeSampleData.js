export default {
  sequence_based_macromolecule_samples: [
    {
      value: {
        type: 'headline',
        label: 'Sample Characteristics',
      },
      label: 'Sample Characteristics',
    },
    {
      value: {
        type: 'segment-headline',
        label: 'Application',
      },
      label: 'Application',
    },
    {
      value: {
        column: 'name',
        label: 'Name',
        type: 'text',
        table: 'sequence_based_macromolecule_samples',
        advanced: true,
      },
      label: 'Name'
    },
    {
      value: {
        column: 'function_or_application',
        label: 'Function or application',
        type: 'select',
        option_layers: "sample_function_or_application",
        table: 'sequence_based_macromolecule_samples',
        advanced: true,
      },
      label: 'Function or application',
    },
    {
      value: {
        column: 'obtained_by',
        label: 'Obtained by',
        type: 'select',
        option_layers: 'sample_obtained_by',
        table: 'sequence_based_macromolecule_samples',
        advanced: false,
      },
      label: 'Obtained by'
    },
    {
      value: {
        column: 'supplier',
        label: 'Supplier',
        type: 'text',
        table: 'sequence_based_macromolecule_samples',
        advanced: false,
      },
      label: 'Supplier'
    },
    {
      value: {
        type: 'segment-headline',
        label: 'Sample stocks characteristics',
      },
      label: 'Sample stocks characteristics',
    },
    {
      value: {
        column: 'concentration_value',
        label: 'Concentration',
        type: 'system-defined',
        option_layers: 'concentration',
        info: 'Only numbers are allowed',
        table: 'sequence_based_macromolecule_samples',
        advanced: false,
      },
      label: 'Concentration',
    },
    {
      value: {
        column: 'molarity_value',
        label: 'Molarity',
        type: 'system-defined',
        option_layers: 'molarity',
        info: 'Only numbers are allowed',
        table: 'sequence_based_macromolecule_samples',
        advanced: false,
      },
      label: 'Molarity',
    },
    {
      value: {
        column: 'activity_per_volume_value',
        label: 'Activity in U/L',
        type: 'system-defined',
        option_layers: 'activity_per_volume',
        info: 'Only numbers are allowed',
        table: 'sequence_based_macromolecule_samples',
        advanced: false,
      },
      label: 'Activity in U/L',
    },
    {
      value: {
        column: 'activity_per_mass_value',
        label: 'Activity in U/g',
        type: 'system-defined',
        option_layers: 'activity_per_mass',
        info: 'Only numbers are allowed',
        table: 'sequence_based_macromolecule_samples',
        advanced: false,
      },
      label: 'Activity in U/g',
    },
    {
      value: {
        column: 'formulation',
        label: 'Formulation',
        type: 'select',
        option_layers: 'sample_formulation',
        table: 'sequence_based_macromolecule_samples',
        advanced: false,
      },
      label: 'Formulation'
    },
    {
      value: {
        column: 'purity',
        label: 'Purity',
        type: 'textWithAddOn',
        addon: '%',
        table: 'sequence_based_macromolecule_samples',
        info: 'Only numbers are allowed',
        advanced: false,
      },
      label: 'Purity'
    },
    {
      value: {
        column: 'purity_detection',
        label: 'Purity detection',
        type: 'text',
        table: 'sequence_based_macromolecule_samples',
        advanced: false,
      },
      label: 'Purity detection'
    },
    {
      value: {
        column: 'purification_method',
        label: 'Purification method',
        type: 'text',
        table: 'sequence_based_macromolecule_samples',
        advanced: false,
      },
      label: 'Purification method'
    },
    {
      value: {
        type: 'segment-headline',
        label: "Details on Protein's source",
      },
      label: "Details on Protein's source",
    },
    {
      value: {
        column: 'organism',
        label: 'Organism',
        type: 'text',
        table: 'sequence_based_macromolecule_samples',
        advanced: false,
      },
      label: 'Organism'
    },
    {
      value: {
        column: 'taxon_id',
        label: 'Taxon ID',
        type: 'text',
        table: 'sequence_based_macromolecule_samples',
        advanced: false,
      },
      label: 'Taxon ID'
    },
    {
      value: {
        column: 'strain',
        label: 'Strain',
        type: 'text',
        table: 'sequence_based_macromolecule_samples',
        advanced: false,
      },
      label: 'Strain'
    },
    {
      value: {
        column: 'tissue',
        label: 'Tissue',
        type: 'text',
        table: 'sequence_based_macromolecule_samples',
        advanced: false,
      },
      label: 'Tissue'
    },
    {
      value: {
        type: 'headline',
        label: 'SBMM',
      },
      label: 'SBMM',
    },
    {
      value: {
        column: 'other_identifier',
        label: 'Other reference id',
        type: 'text',
        table: 'sequence_based_macromolecules',
        advanced: true,
      },
      label: 'Other reference id'
    },
    {
      value: {
        column: 'own_identifier',
        label: 'Own id',
        type: 'text',
        table: 'sequence_based_macromolecules',
        advanced: true,
      },
      label: 'Own id'
    },
    {
      value: {
        column: 'short_name',
        label: 'Short name',
        type: 'text',
        table: 'sequence_based_macromolecules',
        advanced: true,
      },
      label: 'Short name'
    },
    {
      value: {
        column: 'sequence_length',
        label: 'Sequence length',
        type: 'text',
        table: 'sequence_based_macromolecules',
        info: 'Only numbers are allowed',
        advanced: true,
      },
      label: 'Sequence length'
    },
    {
      value: {
        column: 'molecular_weight',
        label: 'Sequence mass',
        type: 'textWithAddOn',
        addon: 'kg/mol',
        table: 'sequence_based_macromolecules',
        info: 'Only numbers are allowed',
        advanced: false,
      },
      label: 'Sequence mass'
    },
    {
      value: {
        column: 'systematic_name',
        label: 'Full name',
        type: 'text',
        table: 'sequence_based_macromolecules',
        advanced: true,
      },
      label: 'Full name'
    },
    {
      value: {
        column: 'ec_numbers',
        label: 'EC numbers',
        type: 'text',
        table: 'sequence_based_macromolecules',
        advanced: false,
      },
      label: 'EC numbers'
    },
    {
      value: {
        column: 'sequence',
        label: 'Sequence',
        type: 'sequence-textarea',
        table: 'sequence_based_macromolecules',
        advanced: true,
      },
      label: 'Sequence'
    },
    {
      value: {
        type: 'segment-headline',
        label: "Details on Protein's source",
      },
      label: "Details on Protein's source",
    },
    {
      value: {
        column: 'organism',
        label: 'Organism',
        type: 'text',
        table: 'sequence_based_macromolecules',
        advanced: false,
      },
      label: 'Organism'
    },
    {
      value: {
        column: 'taxon_id',
        label: 'Taxon ID',
        type: 'text',
        table: 'sequence_based_macromolecules',
        advanced: false,
      },
      label: 'Taxon ID'
    },
    {
      value: {
        column: 'strain',
        label: 'Strain',
        type: 'text',
        table: 'sequence_based_macromolecules',
        advanced: false,
      },
      label: 'Strain'
    },
    {
      value: {
        column: 'tissue',
        label: 'Tissue',
        type: 'text',
        table: 'sequence_based_macromolecules',
        advanced: false,
      },
      label: 'Tissue'
    },
    {
      value: {
        type: 'segment-headline',
        label: "Sequence modifications",
      },
      label: "Sequence modifications",
    },
    {
      value: {
        column: 'modification_n_terminal_details',
        label: 'Details for N-Terminal modifications',
        type: 'text',
        table: 'protein_sequence_modifications',
        advanced: false,
      },
      label: 'Details for N-Terminal modifications'
    },
    {
      value: {
        column: 'modification_c_terminal_details',
        label: 'Details for C-Terminal modifications',
        type: 'text',
        table: 'protein_sequence_modifications',
        advanced: false,
      },
      label: 'Details for C-Terminal modifications'
    },
    {
      value: {
        column: 'modification_insertion_details',
        label: 'Details for Insertation',
        type: 'text',
        table: 'protein_sequence_modifications',
        advanced: false,
      },
      label: 'Details for Insertation'
    },
    {
      value: {
        column: 'modification_deletion_details',
        label: 'Details for Deletion',
        type: 'text',
        table: 'protein_sequence_modifications',
        advanced: false,
      },
      label: 'Details for Deletion'
    },
    {
      value: {
        column: 'modification_mutation_details',
        label: 'Details for Mutation',
        type: 'text',
        table: 'protein_sequence_modifications',
        advanced: false,
      },
      label: 'Details for Mutation'
    },
    {
      value: {
        column: 'modification_other_details',
        label: 'Details for other modifications',
        type: 'text',
        table: 'protein_sequence_modifications',
        advanced: false,
      },
      label: 'Details for other modifications'
    },
    {
      value: {
        type: 'segment-headline',
        label: "Posttranslational modifications",
      },
      label: "Posttranslational modifications",
    },
    {
      value: {
        column: 'phosphorylation_ser_details',
        label: 'Details for Ser Phosphorylation',
        type: 'text',
        table: 'post_translational_modifications',
        advanced: false,
      },
      label: 'Details for Ser Phosphorylation'
    },
    {
      value: {
        column: 'phosphorylation_thr_details',
        label: 'Details for Thr Phosphorylation',
        type: 'text',
        table: 'post_translational_modifications',
        advanced: false,
      },
      label: 'Details for Thr Phosphorylation'
    },
    {
      value: {
        column: 'phosphorylation_tyr_details',
        label: 'Details for Tyr Phosphorylation',
        type: 'text',
        table: 'post_translational_modifications',
        advanced: false,
      },
      label: 'Details for Tyr Phosphorylation'
    },
    {
      value: {
        type: 'spacer',
        label: '',
      },
      label: '',
    },
    {
      value: {
        column: 'glycosylation_n_linked_asn_details',
        label: 'Details for N-linked Asn Glycosylation',
        type: 'text',
        table: 'post_translational_modifications',
        advanced: false,
      },
      label: 'Details for N-linked Asn Glycosylation'
    },
    {
      value: {
        column: 'glycosylation_o_linked_lys_details',
        label: 'Details for O-linked Lys Glycosylation',
        type: 'text',
        table: 'post_translational_modifications',
        advanced: false,
      },
      label: 'Details for O-linked Lys Glycosylation'
    },
    {
      value: {
        column: 'glycosylation_o_linked_ser_details',
        label: 'Details for O-linked Ser Glycosylation',
        type: 'text',
        table: 'post_translational_modifications',
        advanced: false,
      },
      label: 'Details for O-linked Ser Glycosylation'
    },
    {
      value: {
        column: 'glycosylation_o_linked_thr_details',
        label: 'Details for O-linked Thr Glycosylation',
        type: 'text',
        table: 'post_translational_modifications',
        advanced: false,
      },
      label: 'Details for O-linked Thr Glycosylation'
    },
    {
      value: {
        column: 'acetylation_lysin_number',
        label: 'Details for Acetylation Lysin number',
        type: 'text',
        table: 'post_translational_modifications',
        info: 'Only numbers are allowed',
        advanced: false,
      },
      label: 'Details for Acetylation Lysin number'
    },
    {
      value: {
        column: 'hydroxylation_lys_details',
        label: 'Details for Lys Hydroxylation',
        type: 'text',
        table: 'post_translational_modifications',
        advanced: false,
      },
      label: 'Details for Lys Hydroxylation'
    },
    {
      value: {
        column: 'hydroxylation_pro_details',
        label: 'Details for Pro Hydroxylation',
        type: 'text',
        table: 'post_translational_modifications',
        advanced: false,
      },
      label: 'Details for Pro Hydroxylation'
    },
    {
      value: {
        type: 'spacer',
        label: '',
      },
      label: '',
    },
    {
      value: {
        column: 'methylation_arg_details',
        label: 'Details for Arg Methylation',
        type: 'text',
        table: 'post_translational_modifications',
        advanced: false,
      },
      label: 'Details for Arg Methylation'
    },
    {
      value: {
        column: 'methylation_glu_details',
        label: 'Details for Glu Methylation',
        type: 'text',
        table: 'post_translational_modifications',
        advanced: false,
      },
      label: 'Details for Glu Methylation'
    },
    {
      value: {
        column: 'methylation_lys_details',
        label: 'Details for Lys Methylation',
        type: 'text',
        table: 'post_translational_modifications',
        advanced: false,
      },
      label: 'Details for Lys Methylation'
    },
    {
      value: {
        type: 'spacer',
        label: '',
      },
      label: '',
    },
    {
      value: {
        column: 'other_modifications_details',
        label: 'Details for other modifications',
        type: 'text',
        table: 'post_translational_modifications',
        advanced: false,
      },
      label: 'Details for other modifications'
    },
  ],
};