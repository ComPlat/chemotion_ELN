# frozen_string_literal: true

klass = SegmentKlass.find_by(label: 'demo2')
pp = {
  layers: {
    general_layer: {
      key: 'general_layer',
      cols: 3,
      position: 20,
      label: 'General Information',
      fields:
        [
          { field: 'organism', label: 'Organism', required: false, position: 100, type: 'text', placeholder: '' },
          { field: 'tissue', label: 'Tissue', required: false, position: 110, type: 'text', placeholder: '' },
          { field: 'product_format', label: 'Product Format', required: false, position: 120, type: 'text', placeholder: '' },
          { field: 'options', label: 'Options', required: false, position: 130, type: 'select', option_layers: 'campus' },
          { field: 'storage_conditions', label: 'Storage Conditions', required: false, position: 180, type: 'text', placeholder: '' }
        ]
    },
    character_layer: {
      key: 'character_layer',
      cols: 3,
      position: 20,
      label: 'Characteristics',
      fields:
        [
          { field: 'karyotype', label: 'Karyotype', required: false, position: 100, type: 'text', placeholder: '' },
          { field: 'images', label: 'Images', required: false, position: 110, type: 'text', placeholder: '' },
          { field: 'receptor_expression', label: 'Receptor Expression', required: false, position: 120, type: 'text', placeholder: '' },
          { field: 'tumorigenic', label: 'Tumorigenic', required: false, position: 130, type: 'text', placeholder: '' },
          { field: 'effects', label: 'Effects', required: false, position: 140, type: 'text', placeholder: '' },
          { field: 'comments', label: 'Comments', required: false, position: 150, type: 'text', placeholder: '' }
        ]
    },
    culture_method_layer: {
      key: 'culture_method_layer',
      cols: 3,
      position: 20,
      label: 'Culture Method',
      fields:
        [
          { field: 'complete_growth_medium	', label: 'Complete Growth Medium	', required: false, position: 100, type: 'text', placeholder: '' },
          { field: 'subculturing', label: 'Subculturing', required: false, position: 110, type: 'text', placeholder: '' },
          { field: 'cryopreservation', label: 'Cryopreservation', required: false, position: 120, type: 'text', placeholder: '' },
          { field: 'culture_conditions', label: 'Culture Conditions', required: false, position: 130, type: 'text', placeholder: '' },
        ]
    }
  },
  select_options: {
    options_default: [
      { key: 'option1', label: 'Option 1' },
      { key: 'option2', label: 'Option 2' }
    ]
  }
}
element_klass = ElementKlass.find_by(name: 'sample')
SegmentKlass.create!(element_klass: element_klass, label: 'demo2', desc: 'Demo2', place: 20, properties_template: pp) if klass.nil?
