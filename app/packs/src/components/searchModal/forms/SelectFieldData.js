export default {
  fields: {
    samples: [
      {
        value: {
          column: 'name',
          label: 'Name',
          type: 'text',
          advanced: true,
        },
        label: 'Name'
      },
      {
        value: {
          column: 'short_label',
          label: 'Short Label',
          type: 'text',
          advanced: true,
        },
        label: 'Short Label'
      },
      {
        value: {
          column: 'is_top_secret',
          label: 'Top secret',
          type: 'checkbox',
          advanced: false,
        },
        label: 'Top secret'
      },
      {
        value: {
          column: 'decoupled',
          label: 'Decoupled',
          type: 'checkbox',
          advanced: false,
        },
        label: 'Decoupled'
      },
      {
        value: {
          column: 'external_label',
          label: 'External Label',
          type: 'text',
          advanced: true,
        },
        label: 'External Label'
      },
      {
        value: {
          column: 'xref',
          opt: 'cas',
          label: 'CAS',
          type: 'text',
          advanced: true,
        },
        label: 'CAS'
      },
      {
        value: {
          column: 'stereo',
          opt: 'abs',
          label: 'Stereo Abs',
          type: 'select',
          option_layers: "stereoAbsOptions",
          advanced: false,
        },
        label: 'Stereo Abs'
      },
      {
        value: {
          column: 'stereo',
          opt: 'rel',
          label: 'Stereo Rel',
          type: 'select',
          option_layers: "stereoRelOptions",
          advanced: false,
        },
        label: 'Stereo Rel'
      },
      {
        value: {
          column: 'boiling_point',
          label: 'Boiling point',
          type: 'textWithAddOn',
          addon: '°C',
          advanced: false,
        },
        label: 'Boiling point'
      },
      {
        value: {
          column: 'melting_point',
          label: 'Melting point',
          type: 'textWithAddOn',
          addon: '°C',
          advanced: false,
        },
        label: 'Melting point'
      },
      {
        value: {
          column: 'target_amount_value',
          label: 'Amount',
          type: 'system-defined',
          option_layers: 'mass',
          advanced: false,
        },
        label: 'Amount'
      },
      {
        value: {
          column: 'density',
          label: 'Density',
          type: 'textWithAddOn',
          addon: 'g/ml',
          advanced: false,
        },
        label: 'Density'
      },
      {
        value: {
          column: 'molarity_value',
          label: 'Molarity',
          type: 'textWithAddOn',
          addon: 'M',
          advanced: false,
        },
        label: 'Molarity'
      },
      {
        value: {
          column: 'purity',
          label: 'Purity / Concentration',
          type: 'text',
          advanced: false,
        },
        label: 'Purity / Concentration'
      },
      {
        value: {
          column: 'description',
          label: 'Description',
          type: 'text',
          advanced: false,
        },
        label: 'Description'
      },
      {
        value: {
          column: 'location',
          label: 'Location',
          type: 'text',
          advanced: false,
        },
        label: 'Location'
      },
      {
        value: {
          column: 'content',
          label: 'Private Note',
          type: 'text',
          advanced: true,
        },
        label: 'Private Note'
      },
    ],
    reactions: [
      {
        value: {
          column: 'name',
          label: 'Name',
          type: 'text',
          advanced: true,
        },
        label: 'Name'
      },
      {
        value: {
          column: 'short_label',
          label: 'Short Label',
          type: 'text',
          advanced: true,
        },
        label: 'Short Label'
      },
      {
        value: {
          column: 'status',
          label: 'Status',
          type: 'select',
          option_layers: 'statusOptions',
          advanced: true,
        },
        label: 'Status'
      },
      {
        value: {
          column: 'conditions',
          label: 'Conditions',
          type: 'text',
          advanced: true,
        },
        label: 'Conditions'
      },
      {
        value: {
          column: 'temperature',
          label: 'Temperature',
          type: 'system-defined',
          option_layers: 'temperature',
          advanced: true,
        },
        label: 'Temperature'
      },
      {
        value: {
          column: 'duration',
          label: 'Duration',
          type: 'system-defined',
          option_layers: 'duration',
          advanced: true,
        },
        label: 'Duration'
      },
      {
        value: {
          column: 'rxno',
          label: 'Type',
          type: 'rxnos',
          advanced: true,
        },
        label: 'Type'
      },
      {
        value: {
          column: 'role',
          label: 'Role',
          type: 'select',
          option_layers: 'rolesOptions',
          advanced: false,
        },
        label: 'Role'
      },
      {
        value: {
          column: 'purification',
          label: 'Purification',
          type: 'select',
          option_layers: 'purificationOptions',
          advanced: false,
        },
        label: 'Purification'
      },
      {
        value: {
          column: 'dangerous_products',
          label: 'Dangerous Products',
          type: 'select',
          option_layers: 'dangerousProductsOptions',
          advanced: false,
        },
        label: 'Dangerous Products'
      },
      {
        value: {
          column: 'tlc_solvents',
          label: 'TLC Solvents (parts)',
          type: 'text',
          advanced: false,
        },
        label: 'TLC Solvents (parts)'
      },
      {
        value: {
          column: 'rf_value',
          label: 'Rf-Value',
          type: 'text',
          advanced: false,
        },
        label: 'Rf-Value'
      },
      {
        value: {
          column: 'tlc_description',
          label: 'TLC-Description',
          type: 'text',
          advanced: false,
        },
        label: 'TLC-Description'
      },
      {
        value: {
          column: 'content',
          label: 'Private Note',
          type: 'text',
          advanced: true,
        },
        label: 'Private Note'
      },
    ],
    wellplates: [
      {
        value: {
          column: 'name',
          label: 'Name',
          type: 'text',
          advanced: true,
        },
        label: 'Name'
      },
      {
        value: {
          column: 'short_label',
          label: 'Short Label',
          type: 'text',
          advanced: true,
        },
        label: 'Short Label'
      },
      {
        value: {
          column: 'readout_titles',
          label: 'Readout Titles',
          type: 'text',
          advanced: true,
        },
        label: 'Readout Titles'
      },
      {
        value: {
          column: 'content',
          label: 'Private Note',
          type: 'text',
          advanced: true,
        },
        label: 'Private Note'
      },
    ],
    screens: [
      {
        value: {
          column: 'name',
          label: 'Name',
          type: 'text',
          advanced: true,
        },
        label: 'Name'
      },
      {
        value: {
          column: 'collaborator',
          label: 'Collaborator',
          type: 'text',
          advanced: true,
        },
        label: 'Collaborator'
      },
      {
        value: {
          column: 'requirements',
          label: 'Requirements',
          type: 'text',
          advanced: true,
        },
        label: 'Requirements'
      },
      {
        value: {
          column: 'conditions',
          label: 'Conditions',
          type: 'text',
          advanced: true,
        },
        label: 'Conditions'
      },
      {
        value: {
          column: 'result',
          label: 'Result',
          type: 'text',
          advanced: true,
        },
        label: 'Result'
      },
      {
        value: {
          column: 'content',
          label: 'Private Note',
          type: 'text',
          advanced: true,
        },
        label: 'Private Note'
      },
    ],
    research_plans: [
      {
        value: {
          column: 'name',
          label: 'Name',
          type: 'text',
          advanced: true,
        },
        label: 'Name'
      },
      {
        value: {
          column: 'body',
          label: 'Text',
          type: 'text',
          advanced: true,
        },
        label: 'Text'
      },
      {
        value: {
          column: 'content',
          label: 'Private Note',
          type: 'text',
          advanced: true,
        },
        label: 'Private Note'
      },
    ],
    elements: [
      {
        value: {
          column: 'name',
          label: 'Name',
          type: 'text',
          advanced: true,
        },
        label: 'Name'
      },
      {
        value: {
          column: 'short_label',
          label: 'Short Label',
          type: 'text',
          advanced: true,
        },
        label: 'Short Label'
      },
    ],
  }
}
