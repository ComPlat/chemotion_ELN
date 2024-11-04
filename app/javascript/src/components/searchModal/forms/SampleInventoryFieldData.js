export default {
  chemicals: [
    {
      label: 'Inventory',
      value: [
        {
          label: 'Inventory Information',
          value: [
            {
              column: 'status',
              label: 'Status',
              key: 'information',
              table: 'chemicals',
              type: 'select',
              option_layers: "chemicalStatusOptions",
            },
            {
              column: 'vendor',
              label: 'Vendor',
              key: 'information',
              table: 'chemicals',
              type: 'text',
            },
            {
              column: 'order_number',
              label: 'Order number',
              key: 'information',
              table: 'chemicals',
              type: 'text',
            },
            {
              column: 'amount',
              label: 'Amount',
              key: 'information',
              table: 'chemicals',
              type: 'system-defined',
              option_layers: "mass",
              info: 'Works only with the correct unit. Only numbers are allowed'
            },
            {
              column: 'price',
              label: 'Price',
              key: 'information',
              table: 'chemicals',
              type: 'text',
            },
            {
              column: 'person',
              label: 'Person',
              key: 'information',
              table: 'chemicals',
              type: 'text',
            },
            {
              column: 'required_date',
              label: 'Required date',
              key: 'information',
              table: 'chemicals',
              type: 'text',
            },
            {
              column: 'ordered_date',
              label: 'Ordered date',
              key: 'information',
              table: 'chemicals',
              type: 'text',
            },
            {
              column: 'required_by',
              label: 'Required by',
              key: 'information',
              table: 'chemicals',
              type: 'text',
            },
          ],
        },
        {
          label: 'Location and Information',
          value: [
            {
              label: 'Host location',
              column: 'host_location',
              key: 'location',
              table: 'chemicals',
              type: 'subGroupWithAddOn',
              sub_fields: [
                {
                  key: 'host_building',
                  type: 'textWithAddOn',
                  addon: 'building',
                  label: 'building',
                },
                {
                  key: 'host_room',
                  type: 'textWithAddOn',
                  addon: 'room',
                  label: 'room',
                },
                {
                  key: 'host_cabinet',
                  type: 'textWithAddOn',
                  addon: 'cabinet',
                  label: 'cabinet',
                },
              ],
            },
            {
              label: 'Host group',
              column: 'host_group',
              key: 'location',
              table: 'chemicals',
              type: 'subGroupWithAddOn',
              sub_fields: [
                {
                  key: 'host_group',
                  type: 'textWithAddOn',
                  addon: 'group',
                  label: 'group',
                },
                {
                  key: 'host_owner',
                  type: 'textWithAddOn',
                  addon: 'owner',
                  label: 'owner',
                },
              ],
            },
            {
              label: 'Current location',
              column: 'current_location',
              key: 'location',
              table: 'chemicals',
              type: 'subGroupWithAddOn',
              sub_fields: [
                {
                  key: 'current_building',
                  type: 'textWithAddOn',
                  addon: 'building',
                  label: 'building',
                },
                {
                  key: 'current_room',
                  type: 'textWithAddOn',
                  addon: 'room',
                  label: 'room',
                },
                {
                  key: 'current_cabinet',
                  type: 'textWithAddOn',
                  addon: 'cabinet',
                  label: 'cabinet',
                },
              ],
            },
            {
              label: 'Current group',
              column: 'current_group',
              key: 'location',
              table: 'chemicals',
              type: 'subGroupWithAddOn',
              sub_fields: [
                {
                  key: 'current_group',
                  type: 'textWithAddOn',
                  addon: 'group',
                  label: 'group',
                },
                {
                  key: 'borrowed_by',
                  type: 'textWithAddOn',
                  addon: 'by',
                  label: 'by',
                },
              ],
            },
            {
              column: 'disposal_info',
              label: 'Disposal information',
              key: 'location',
              type: 'text',
              table: 'chemicals',
            },
            {
              column: 'important_notes',
              label: 'Important notes',
              key: 'location',
              type: 'text',
              table: 'chemicals',
            },
          ],
        }
      ],
    },
  ],
}
