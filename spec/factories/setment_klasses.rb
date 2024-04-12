# frozen_string_literal: true

FactoryBot.define do
  factory :segment_klass, class: 'Labimotion::SegmentKlass' do
    label { 'segment' }
    element_klass { FactoryBot.build(:element_klass) }

    trait :with_ontology_properties_template do
      properties_template do
        {
          'pkg' => {
            'eln' => { 'version' => '1.9.0', 'base_revision' => 'a714b63f6', 'current_revision' => 0 },
            'name' => 'chem-generic-ui',
            'version' => '1.1.1',
            'labimotion' => '1.1.4',
          },
          'uuid' => '1e3aa4fa-bbb1-468a-aab3-505c14bdca12',
          'klass' => 'SegmentKlass',
          'layers' => {
            'fields' => {
              'wf' => false,
              'key' => 'fields',
              'cols' => 2,
              'color' => 'info',
              'label' => 'Fields',
              'style' => 'panel_generic_heading',
              'fields' => [
                {
                  'type' => 'text',
                  'field' => 'material',
                  'label' => 'material',
                  'default' => '',
                  'ontology' => {
                    'id' => 'obi:class:http://purl.obolibrary.org/obo/OBI_0000094',
                    'iri' => 'http://purl.obolibrary.org/obo/OBI_0000094',
                    'type' => 'class',
                    'label' => 'material processing',
                    'obo_id' => 'OBI:0000094',
                    'short_form' => 'OBI_0000094',
                    'description' => [
                      'A planned process which results in physical changes in a specified input material',
                    ],
                    'ontology_name' => 'obi',
                    'ontology_prefix' => 'OBI',
                  },
                  'position' => 1,
                  'sub_fields' => [],
                  'text_sub_fields' => [],
                },
                {
                  'type' => 'text',
                  'field' => 'weight',
                  'label' => 'weight',
                  'default' => '',
                  'position' => 2,
                  'sub_fields' => [],
                  'text_sub_fields' => [],
                },
              ],
              'position' => 10,
              'timeRecord' => '',
              'wf_position' => 0,
            },
          },
          'version' => '2.0',
          'identifier' => '',
          'select_options' => {},
        }
      end
    end
  end
end
