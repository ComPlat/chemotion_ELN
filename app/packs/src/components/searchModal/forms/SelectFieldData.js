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
          column: 'stereo',
          opt: 'abs',
          label: 'Stereo Abs',
          type: 'select',
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
          advanced: false,
        },
        label: 'Stereo Rel'
      },
      {
        value: {
          column: 'boiling_point',
          label: 'Boiling point',
          type: 'select',
          advanced: false,
        },
        label: 'Boiling point'
      },
      {
        value: {
          column: 'melting_point',
          label: 'Melting point',
          type: 'select',
          advanced: false,
        },
        label: 'Melting point'
      },
      {
        value: {
          column: 'real_amount_value',
          opt: 'real_amount_unit',
          label: 'Amount',
          type: 'system-defined',
          advanced: false,
        },
        label: 'Amount'
      },
      {
        value: {
          column: 'density',
          label: 'Density',
          type: 'text',
          advanced: false,
        },
        label: 'Density'
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
          advanced: true,
        },
        label: 'Temperature'
      },
      {
        value: {
          column: 'duration',
          label: 'Duration',
          type: 'system-defined',
          advanced: true,
        },
        label: 'Duration'
      },
      {
        value: {
          column: 'rxno',
          label: 'Type',
          type: 'select',
          advanced: true,
        },
        label: 'Type'
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
