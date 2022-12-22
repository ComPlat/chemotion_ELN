export default {
  fields: [
    {
      value: {
        table: 'samples',
        column: 'name',
        label: 'Sample Name'
      },
      label: 'Sample Name'
    },
    {
      value: {
        table: 'samples',
        column: 'short_label',
        label: 'Sample Short Label'
      },
      label: 'Sample Short Label'
    },
    {
      value: {
        table: 'samples',
        column: 'external_label',
        label: 'Sample External Label'
      },
      label: 'Sample External Label'
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
  ]
}
