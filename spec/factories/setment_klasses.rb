# frozen_string_literal: true

FactoryBot.define do
  factory :segment_klass, class: 'Labimotion::SegmentKlass' do
    label { 'segment' }
    element_klass { FactoryBot.build(:element_klass) }

    trait :with_ontology_properties_template do
      is_active { true }
      properties_release do
        {
          pkg: {
            eln: {
              version: '2.1.0',
            },
            name: 'chem-generic-ui',
            version: '1.1.1',
            labimotion: '2.1.0',
          },
          klass: 'SegmentKlass',
          layers: {
            ontology_fields: {
              wf: false,
              key: 'ontology',
              cols: 3,
              color: 'default',
              label: 'Ontology',
              style: 'panel_generic_heading',
              fields: [
                {
                  type: 'text',
                  field: 'ontology_one',
                  label: 'Ontology term one',
                  default: '',
                  ontology: {
                    id: 'chmo:class:http://purl.obolibrary.org/obo/CHMO_0001000',
                    iri: 'http://purl.obolibrary.org/obo/CHMO_0001000',
                    type: 'class',
                    label: 'chromatography',
                    obo_id: 'CHMO:0001000',
                    short_form: 'CHMO_0001000',
                    description: [
                      'A separation method where the components are distributed between two phases, one of which is
                      stationary, while the other moves in a definite direction.'
                    ],
                    ontology_name: 'chmo',
                    ontology_prefix: 'CHMO'
                  },
                  position: 1,
                  readonly: false,
                  sub_fields: [],
                  placeholder: 'Ontology assignment one',
                  text_sub_fields: []
                },
                {
                  type: 'text',
                  field: 'ontology_two',
                  label: 'Ontology term two',
                  default: '',
                  ontology: {
                    id: 'chmo:class:http://purl.obolibrary.org/obo/CHMO_0002876',
                    iri: 'http://purl.obolibrary.org/obo/CHMO_0002876',
                    type: 'class',
                    label: 'high performance liquid chromatography-tandem mass spectrometry',
                    obo_id: 'CHMO:0002876',
                    short_form: 'CHMO_0002876',
                    ontology_name: 'chmo',
                    ontology_prefix: 'CHMO'
                  },
                  position: 2,
                  sub_fields: [],
                  text_sub_fields: []
                },
              ],
              position: 130,
              timeRecord: '',
              wf_position: 0
            },
          }
        }
      end
    end
  end
end
