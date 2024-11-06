export default {
  measurements: [
    {
      label: 'Measurements',
      value: [
        {
          label: '',
          value: [
            {
              column: 'description',
              label: 'Description',
              key: 'measurement',
              table: 'measurements',
              type: 'text',
            },
            {
              column: 'value',
              label: 'Value',
              key: 'measurement',
              table: 'measurements',
              info: 'Only numbers are allowed',
              type: 'text',
            },
            {
              column: 'unit',
              label: 'Unit',
              key: 'measurement',
              table: 'measurements',
              type: 'text',
            },
          ],
        },
      ],
    },
  ]
}
