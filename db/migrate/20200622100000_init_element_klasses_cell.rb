class InitElementKlassesCell < ActiveRecord::Migration
  def change
    ee = ElementKlass.find_by(name: 'cell')
    pp =
    { layers:
      { general_layer: {
        key: 'general_layer',
        cols: 3,
        position: 20,
        label: 'General Information',
        fields:
          [
            {field: 'organism', label: 'Organism', required: false, position: 100, type: 'text', placeholder: ''},
            {field: 'tissue', label: 'Tissue', required: false, position: 110, type: 'text', placeholder: ''},
            {field: 'product_format', label: 'Product Format', required: false, position: 120, type: 'text', placeholder: ''},
            {field: 'morphology', label: 'Morphology', required: false, position: 130, type: 'text', placeholder: ''},
            {field: 'culture_properties', label: 'Culture Properties', required: false, position: 140, type: 'text', placeholder: ''},
            {field: 'biosafety_level', label: 'Biosafety Level', required: false, position: 150, type: 'text', placeholder: ''},
            {field: 'age', label: 'Age', required: false, position: 160, type: 'text', placeholder: ''},
            {field: 'applications', label: 'Applications', required: false, position: 170, type: 'text', placeholder: ''},
            {field: 'storage_conditions', label: 'Storage Conditions', required: false, position: 180, type: 'text', placeholder: ''},
          ]
        },
        character_layer: {
        key: 'character_layer',
        cols: 3,
        position: 20,
        label: 'Characteristics',
        fields:
          [
            {field: 'karyotype', label: 'Karyotype', required: false, position: 100, type: 'text', placeholder: ''},
            {field: 'images', label: 'Images', required: false, position: 110, type: 'text', placeholder: ''},
            {field: 'receptor_expression', label: 'Receptor Expression', required: false, position: 120, type: 'text', placeholder: ''},
            {field: 'tumorigenic', label: 'Tumorigenic', required: false, position: 130, type: 'text', placeholder: ''},
            {field: 'effects', label: 'Effects', required: false, position: 140, type: 'text', placeholder: ''},
            {field: 'comments', label: 'Comments', required: false, position: 150, type: 'text', placeholder: ''},
          ]
        },
        culture_method_layer: {
        key: 'culture_method_layer',
        cols: 3,
        position: 20,
        label: 'Culture Method',
        fields:
          [
            {field: 'complete_growth_medium	', label: 'Complete Growth Medium	', required: false, position: 100, type: 'text', placeholder: ''},
            {field: 'subculturing', label: 'Subculturing', required: false, position: 110, type: 'text', placeholder: ''},
            {field: 'cryopreservation', label: 'Cryopreservation', required: false, position: 120, type: 'text', placeholder: ''},
            {field: 'culture_conditions', label: 'Culture Conditions', required: false, position: 130, type: 'text', placeholder: ''},
          ]
        },
      },
      select_options: {
        options_default: [
          {key: 'option1', label: 'Option 1'},
          {key: 'option2', label: 'Option 2'}
        ],
      }
    }

    if ee.nil?
      ElementKlass.create!(name: 'cell', label: 'cell lines', desc: 'cell lines', icon_name: 'fa fa-bullseye', properties_template: pp)
    else
      ee.update!(properties_template: pp)
    end
  end
end
