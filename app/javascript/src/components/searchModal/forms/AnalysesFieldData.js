export default {
  containers: [
    {
      label: 'Analyses',
      value: [
        {
          label: '',
          value: [
            {
              column: 'name',
              label: 'Name',
              key: 'analyses',
              table: 'containers',
              type: 'text',
            },
            {
              column: 'status',
              label: 'Status',
              key: 'analyses',
              table: 'containers',
              type: 'select',
              option_layers: 'confirmOptions',
            },
            {
              column: 'kind',
              label: 'Type (Chemical Methods Ontology)',
              key: 'analyses',
              table: 'containers',
              type: 'chmos',
            },
            {
              column: 'plain_text_content',
              label: 'Content',
              key: 'analyses',
              table: 'containers',
              type: 'text',
            },
            {
              column: 'instrument',
              label: 'Instrument',
              key: 'analyses',
              table: 'containers',
              type: 'text',
            },
            {
              column: 'description',
              label: 'Description',
              key: 'analyses',
              table: 'containers',
              type: 'text',
            },
          ],
        },
      ],
    },
  ]
}
