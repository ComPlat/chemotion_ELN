export default {
  references: [
    {
      value: {
        column: 'doi',
        label: 'DOI',
        type: 'text',
        table: 'literatures',
      },
      label: 'DOI',
    },
    {
      value: {
        column: 'litype',
        label: 'Type',
        type: 'select',
        option_layers: "CitationTypeMap",
        table: 'literals',
      },
      label: 'Type',
    },
    {
      value: {
        column: 'title',
        label: 'Title',
        type: 'text',
        table: 'literatures',
      },
      label: 'Title',
    },
    {
      value: {
        column: 'url',
        label: 'URL',
        type: 'text',
        table: 'literatures',
      },
      label: 'URL',
    },
  ]
}
