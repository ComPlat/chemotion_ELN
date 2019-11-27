class InitElementKlassesMof < ActiveRecord::Migration
  def change
    ee = ElementKlass.find_by(name: 'MOF')
    pp =
    { layers:
      { type_layer: {
        key: 'type_layer',
        cols: 1,
        position: 10,
        label: 'Type Info',
        fields:
          [
            {field: 'mof_type', label: 'MOF-Type', required: true, position: 10, type: 'text', placeholder: 'Mof_Type...'},
            {field: 'mof_method', label: 'Preparation Method', required: false, position: 20, type: 'select', option_layers: 'specific_layer'}
          ]
        },
        general_layer: {
        key: 'general_layer',
        cols: 3,
        position: 20,
        label: 'General Parameters',
        fields:
          [
            {field: 'metal_precursor1', label: 'Metal Precursor 1', required: false, position: 10, type: 'drag_molecule', placeholder: ''},
            {field: 'solvent_mp1', label: 'Solvent MP1', required: false, position: 20, type: 'text', placeholder: ''},
            {field: 'concentration_mp1', label: 'Concentration MP1', required: false, position: 30, type: 'text', placeholder: ''},
            {field: 'metal_precursor2', label: 'Metal Precursor 2', required: false, position: 40, type: 'drag_molecule', placeholder: ''},
            {field: 'solvent_mp2', label: 'Solvent MP2', required: false, position: 50, type: 'text', placeholder: ''},
            {field: 'concentration_mp2', label: 'Concentration MP2', required: false, position: 60, type: 'text', placeholder: ''},
            {field: 'linker_1', label: 'Linker 1', required: false, position: 70, type: 'text', placeholder: ''},
            {field: 'solvent_l1', label: 'Solvent L1', required: false, position: 80, type: 'text', placeholder: ''},
            {field: 'concentration_l1', label: 'Concentration L1', required: false, position: 90, type: 'text', placeholder: ''},
            {field: 'linker_2', label: 'Linker 2', required: false, position: 100, type: 'text', placeholder: ''},
            {field: 'solvent_l2', label: 'Solvent L2', required: false, position: 110, type: 'text', placeholder: ''},
            {field: 'concentration_l2', label: 'Concentration L2', required: false, position: 120, type: 'text', placeholder: ''},
            {field: 'substrate', label: 'Substrate', required: false, position: 130, type: 'text', placeholder: ''},
            {field: 'pretreatment', label: 'Pretreatment', required: false, position: 140, type: 'text', placeholder: ''},
            {field: 'sam', label: 'SAM', required: false, position: 150, type: 'text', placeholder: ''},
            {field: 'sam_molecule', label: 'SAM molecule', required: false, position: 160, type: 'text', placeholder: ''},
            {field: 'sam_solvent', label: 'SAM solvent', required: false, position: 170, type: 'text', placeholder: ''},
            {field: 'rinsing', label: 'Rinsing', required: false, position: 180, type: 'text', placeholder: ''},
          ]
        },
        specific_1_layer: {
        key: 'specific_1_layer',
        cols: 1,
        position: 100,
        condition: 'type_layer,mof_method,specific_1_layer',
        label: 'Specific Parameters 1',
        fields:
          [
            {field: 'duesen_art', label: 'Düsen-Art', required: false, position: 10, type: 'text', placeholder: ''},
            {field: 'distanz_target', label: 'Distanz zum Target', required: false, position: 20, type: 'text', placeholder: ''},
            {field: 'move_target', label: 'Move Target', required: false, position: 30, type: 'text', placeholder: ''},
            {field: 'repeat_spraying', label: 'Repeat Spraying', required: false, position: 40, type: 'text', placeholder: ''},
            {field: 'speed_spraying', label: 'Speed Spraying', required: false, position: 50, type: 'text', placeholder: ''}
          ]
        },
        specific_2_layer: {
        key: 'specific_2_layer',
        cols: 1,
        position: 100,
        condition: 'type_layer,mof_method,specific_2_layer',
        label: 'Specific Parameters 2',
        fields:
          [
            {field: 'druck_ethanol', label: 'Druck Ethanol', required: false, position: 10, type: 'text', placeholder: ''},
            {field: 'druck_metal_precursor_1', label: 'Druck Metal-Precursor 1', required: false, position: 20, type: 'text', placeholder: ''},
            {field: 'druck_metal_precursor_2', label: 'Druck Metal-Precursor 2', required: false, position: 30, type: 'text', placeholder: ''},
            {field: 'druck_linker_1', label: 'Druck Linker 1', required: false, position: 40, type: 'text', placeholder: ''},
            {field: 'druck_linker_2', label: 'Druck Linker 2', required: false, position: 50, type: 'text', placeholder: ''},
            {field: 'number_of_samples', label: 'Number of Samples', required: false, position: 60, type: 'text', placeholder: ''},
            {field: 'sample_size', label: 'Sample Size', required: false, position: 70, type: 'text', placeholder: ''},
            {field: 'druck_zerstaeuber_ethanol', label: 'Druck Zerstäuber_Ethanol', required: false, position: 80, type: 'text', placeholder: ''},
            {field: 'druck_zerstaeuber_metal_precursor_1', label: 'Druck Zerstäuber Metal-Precursor 1', required: false, position: 90, type: 'text', placeholder: ''},
            {field: 'druck_zerstaeuber_metal_precursor_2', label: 'Druck Zerstäuber Metal-Precursor 2', required: false, position: 100, type: 'text', placeholder: ''},
            {field: 'druck_zerstaeuber_linker_1', label: 'Druck Zerstäuber Linker 1', required: false, position: 110, type: 'text', placeholder: ''},
            {field: 'druck_zerstaeuber_linker_2', label: 'Druck Zerstäuber Linker 2', required: false, position: 120, type: 'text', placeholder: ''}
          ]
        }
      },
      select_options: {
        specific_layer: [
          {key: 'specific_1_layer', label: 'Specific Parameters 1'},
          {key: 'specific_2_layer', label: 'Specific Parameters 2'}
        ],
        simulation_methods: [
          {key: 'monte_carlo', label: 'Monte Carlo'},
          {key: 'molecular_dynamics', label: 'Molecular Dynamics'}
        ]
      }
    }

    if ee.nil?
      ElementKlass.create!(name: 'mof', label: 'MOF', desc: 'Metal Organic Framework', icon_name: 'fa fa-braille', properties_template: pp)
    else
      ee.update!(properties_template: pp)
    end
  end
end
