export default {
  fields: {
    sample: [
      {
        value: {
          table: 'samples',
          column: 'name',
          label: 'Name'
        },
        label: 'Name'
      },
      {
        value: {
          table: 'samples',
          column: 'short_label',
          label: 'Short Label'
        },
        label: 'Short Label'
      },
      {
        value: {
          table: 'samples',
          column: 'external_label',
          label: 'External Label'
        },
        label: 'External Label'
      },
      {
        value: {
          table: 'samples',
          column: 'xref',
          opt: 'cas',
          label: 'CAS'
        },
        label: 'CAS'
      }
    ],
    reaction: [
      {
        value: {
          table: 'reactions',
          column: 'name',
          label: 'Name'
        },
        label: 'Name'
      },
      {
        value: {
          table: 'reactions',
          column: 'short_label',
          label: 'Short Label'
        },
        label: 'Short Label'
      }
    ],
    wellplate: [
      {
        value: {
          table: 'wellplates',
          column: 'name',
          label: 'Name'
        },
        label: 'Name'
      },
      {
        value: {
          table: 'wellplates',
          column: 'short_label',
          label: 'Short Label'
        },
        label: 'Short Label'
      }
    ],
    screen: [
      {
        value: {
          table: 'screens',
          column: 'name',
          label: 'Name'
        },
        label: 'Name'
      },
      {
        value: {
          table: 'screens',
          column: 'short_label',
          label: 'Short Label'
        },
        label: 'Short Label'
      }
    ],
    research_plan: [
      {
        value: {
          table: 'research_plans',
          column: 'name',
          label: 'Name'
        },
        label: 'Name'
      },
      {
        value: {
          table: 'research_plans',
          column: 'short_label',
          label: 'Short Label'
        },
        label: 'Short Label'
      }
    ]
  }
}
