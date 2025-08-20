export default {
  maintenance: [
    {
      label: 'Maintenance',
      value: [
        {
          label: '',
          value: [
            {
              type: 'segment-headline',
              label: 'Planned maintenance',
            },
            {
              column: 'planned_maintenance',
              opt: 'date',
              label: 'Date',
              type: 'date',
              table: 'device_descriptions',
            },
            {
              column: 'planned_maintenance',
              opt: 'type',
              label: 'Type',
              type: 'select',
              option_layers: 'maintenance_type',
              table: 'device_descriptions',
            },
            {
              column: 'planned_maintenance',
              opt: 'details',
              label: 'Details',
              type: 'text',
              table: 'device_descriptions',
            },
            {
              column: 'planned_maintenance',
              opt: 'status',
              label: 'Status',
              type: 'select',
              option_layers: 'maintenance_status',
              table: 'device_descriptions',
            },
            {
              column: 'planned_maintenance',
              opt: 'costs',
              label: 'Costs',
              type: 'text',
              table: 'device_descriptions',
            },
            {
              column: 'planned_maintenance',
              opt: 'time',
              label: 'Time',
              type: 'text',
              table: 'device_descriptions',
            },
            {
              column: 'planned_maintenance',
              opt: 'changes',
              label: 'Changes',
              type: 'text',
              table: 'device_descriptions',
            },
            {
              type: 'segment-headline',
              label: 'Unexpected maintenance and repair',
            },
            {
              column: 'unexpected_maintenance',
              opt: 'date',
              label: 'Date',
              type: 'date',
              table: 'device_descriptions',
            },
            {
              column: 'unexpected_maintenance',
              opt: 'type',
              label: 'Type',
              type: 'select',
              option_layers: 'maintenance_type',
              table: 'device_descriptions',
            },
            {
              column: 'unexpected_maintenance',
              opt: 'details',
              label: 'Details',
              type: 'text',
              table: 'device_descriptions',
            },
            {
              column: 'unexpected_maintenance',
              opt: 'status',
              label: 'Status',
              type: 'select',
              option_layers: 'maintenance_status',
              table: 'device_descriptions',
            },
            {
              column: 'unexpected_maintenance',
              opt: 'costs',
              label: 'Costs',
              type: 'text',
              table: 'device_descriptions',
            },
            {
              column: 'unexpected_maintenance',
              opt: 'time',
              label: 'Time',
              type: 'text',
              table: 'device_descriptions',
            },
            {
              column: 'unexpected_maintenance',
              opt: 'changes',
              label: 'Changes',
              type: 'text',
              table: 'device_descriptions',
            },
          ],
        },
      ],
    },
  ]
}
