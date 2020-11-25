# frozen_string_literal: true

klass = SegmentKlass.find_by(label: 'demo')

pp =
  {
    layers:
    { first_layer:
      {
        key: 'first_layer',
        cols: 2,
        position: 10,
        label: 'Info',
        fields:
          [
            { field: 'department', label: 'Department', required: false, position: 10, type: 'text', placeholder: 'Department...' },
            { field: 'campus', label: 'Campus', required: false, position: 20, type: 'select', option_layers: 'campus' },
            { field: 'building', label: 'Building', required: false, position: 30, type: 'text', placeholder: 'Building...' },
            { field: 'ext', label: 'Ext.', required: false, position: 40, type: 'text', placeholder: 'Type...' }
          ]
      },
      second_layer: {
        key: 'second_layer',
        cols: 3,
        position: 20,
        label: 'Personal Info',
        fields:
          [
            { field: 'first_name', label: 'First Name', required: false, position: 20, type: 'text', placeholder: '' },
            { field: 'last_name', label: 'Last Name', required: false, position: 30, type: 'text', placeholder: '' },
            { field: 'address', label: 'Address', required: false, position: 50, type: 'text', placeholder: '' }
          ]
      }
    },
    select_options: {
      campus: [
        { key: 'south', label: 'Campus South' },
        { key: 'nord', label: 'Campus Nord' }
      ]
    }
  }
element_klass = ElementKlass.find_by(name: 'sample')
SegmentKlass.create!(element_klass: element_klass, label: 'demo', desc: 'Sample demo segment',place: 10, properties_template: pp) if klass.nil?
