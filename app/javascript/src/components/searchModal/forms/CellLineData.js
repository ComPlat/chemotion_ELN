export default {
  cell_lines: [
    {
      value: {
        type: 'headline',
        label: 'Common Properties',
      },
      label: 'Common Properties',
    },
    {
      value: {
        column: 'name',
        label: 'Cell line name',
        type: 'text',
        table: 'cellline_materials',
        advanced: true,
      },
      label: 'Cell line name'
    },
    {
      value: {
        column: 'source',
        label: 'Source',
        type: 'text',
        table: 'cellline_materials',
        advanced: false,
      },
      label: 'Source'
    },
    {
      value: {
        column: 'disease',
        label: 'Disease',
        type: 'text',
        table: 'cellline_materials',
        advanced: false,
      },
      label: 'Disease'
    },
    {
      value: {
        column: 'organism',
        label: 'Organism',
        type: 'text',
        table: 'cellline_materials',
        advanced: false,
      },
      label: 'Organism'
    },
    {
      value: {
        column: 'mutation',
        label: 'Mutation',
        type: 'text',
        table: 'cellline_materials',
        advanced: false,
      },
      label: 'Mutation'
    },
    {
      value: {
        column: 'variant',
        label: 'Variant',
        type: 'text',
        table: 'cellline_materials',
        advanced: false,
      },
      label: 'Variant'
    },
    {
      value: {
        column: 'tissue',
        label: 'Tissue',
        type: 'text',
        table: 'cellline_materials',
        advanced: false,
      },
      label: 'Tissue'
    },
    {
      value: {
        column: 'growth_medium',
        label: 'Growth medium',
        type: 'text',
        table: 'cellline_materials',
        advanced: false,
      },
      label: 'Growth medium'
    },
    {
      value: {
        column: 'biosafety_level',
        label: 'Biosafety level',
        type: 'select',
        option_layers: 'BiosafetyLevelOptions',
        table: 'cellline_materials',
        advanced: false,
      },
      label: 'Biosafety level'
    },
    {
      value: {
        column: 'cryo_pres_medium',
        label: 'Cryopreservation medium',
        type: 'text',
        table: 'cellline_materials',
        advanced: false,
      },
      label: 'Cryopreservation medium'
    },
    {
      value: {
        column: 'optimal_growth_temp',
        label: 'Opt. growth temperature',
        type: 'text',
        table: 'cellline_materials',
        advanced: false,
      },
      label: 'Opt. growth temperature'
    },
    {
      value: {
        column: 'gender',
        label: 'Gender',
        type: 'text',
        table: 'cellline_materials',
        advanced: false,
      },
      label: 'Gender'
    },
    {
      value: {
        column: 'cell_type',
        label: 'Cell type',
        type: 'text',
        table: 'cellline_materials',
        advanced: false,
      },
      label: 'Cell type'
    },
    {
      value: {
        column: 'description',
        label: 'Material Description',
        type: 'text',
        table: 'cellline_materials',
        advanced: false,
      },
      label: 'Material Description'
    },
    {
      value: {
        type: 'headline',
        label: 'Sample specific properties',
      },
      label: 'Sample specific properties',
    },
    {
      value: {
        column: 'amount',
        label: 'Amount',
        type: 'system-defined',
        option_layers: 'cell_line_amount_unit',
        table: 'cellline_samples',
        advanced: false,
      },
      label: 'Amount'
    },
    {
      value: {
        column: 'passage',
        label: 'Passage',
        type: 'text',
        table: 'cellline_samples',
        advanced: false,
      },
      label: 'Passage'
    },
    {
      value: {
        column: 'name',
        label: 'Name of specific sample',
        type: 'text',
        table: 'cellline_samples',
        advanced: true,
      },
      label: 'Name of specific sample'
    },
    {
      value: {
        column: 'contamination',
        label: 'Contamination',
        type: 'text',
        table: 'cellline_samples',
        advanced: false,
      },
      label: 'Contamination'
    },
    {
      value: {
        column: 'description',
        label: 'Sample Description',
        type: 'text',
        table: 'cellline_samples',
        advanced: false,
      },
      label: 'Sample Description'
    },
  ],
}
