# frozen_string_literal: true

FactoryBot.define do
  factory :dataset_klass, class: 'Labimotion::DatasetKlass' do
    label { 'dataset' }
    ols_term_id { 'CHMO:0000292' }
    created_by { 0 }
    properties_template do
      {
        'eln' => { 'version' => '1.0.0', 'base_revision' => 0, 'current_revision' => 0 },
        'uuid' => '1df73635-d75b-4840-989a-fcc8e2e93f11',
        'klass' => 'ElementKlass',
        'layers' => {
          'gen' => {
            'wf' => false,
            'key' => 'gen',
            'cols' => 2,
            'color' => 'default',
            'label' => '',
            'style' => 'panel_generic_heading',
            'fields' => [
              {
                'type' => 'select',
                'field' => 'type',
                'label' => 'device setting',
                'default' => '',
                'position' => 1,
                'required' => false,
                'sub_fields' => [],
                'option_layers' => 'classify',
                'text_sub_fields' => [],
              },
              {
                'type' => 'select',
                'field' => 'class',
                'label' => 'classification',
                'default' => '',
                'position' => 2,
                'required' => false,
                'sub_fields' => [],
                'option_layers' => 'class',
                'text_sub_fields' => [],
              },
              {
                'type' => 'select',
                'field' => 'mode',
                'label' => 'operation mode',
                'default' => '',
                'position' => 3,
                'required' => false,
                'sub_fields' => [],
                'option_layers' => 'mode',
                'text_sub_fields' => [],
              },
              {
                'type' => 'textarea',
                'field' => 'description',
                'label' => 'description and comments',
                'default' => '',
                'position' => 4,
                'required' => false,
                'hasOwnRow' => true,
                'sub_fields' => [],
                'text_sub_fields' => [],
              },
            ],
            'position' => 10,
            'wf_position' => 0,
          },
        },
        'released_at' => '',
        'select_options' => {
          'mode' => {
            'options' => [
              { 'key' => 'manual', 'label' => 'manual' },
              { 'key' => 'script', 'label' => 'script' },
            ],
          },
          'type' => {
            'options' => [
              { 'key' => 'Laser sintering', 'label' => 'Laser sintering' },
              { 'key' => 'Lithography', 'label' => 'Lithography' },
              { 'key' => 'Fused Filament Fabrication', 'label' => 'Fused Filament Fabrication' },
            ],
          },
          'class' => {
            'options' => [
              { 'key' => 'manufacturing', 'label' => 'manufacturing' },
              { 'key' => 'processes', 'label' => 'processes' },
              { 'key' => 'sensors', 'label' => 'sensors' },
              { 'key' => 'analysis', 'label' => 'analysis' },
              { 'key' => 'structuring', 'label' => 'structuring' },
            ],
          },
        },
      }
    end
  end
end

