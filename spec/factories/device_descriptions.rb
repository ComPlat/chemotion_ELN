# frozen_string_literal: true

FactoryBot.define do
  factory :device_description do
    sequence(:name) { |i| "Device description #{i}" }
    sequence(:short_label) { |i| "CU1-Dev#{i}" }
    serial_number { '123abc456def' }
    collection_id { 1 }
    created_by { 1 }

    trait :with_ontologies do
      ontologies do
        [
          {
            data:
            {
              id: 'chmo:class:http://purl.obolibrary.org/obo/CHMO_0001000',
              iri: 'http://purl.obolibrary.org/obo/CHMO_0001000',
              type: 'class',
              label: 'chromatography',
              obo_id: 'CHMO:0001000',
              short_form: 'CHMO_0001000',
              description:
                [
                  'A separation method where the components are distributed between two phases, one of which is
                  stationary, while the other moves in a definite direction.',
                ],
              segment_ids:
                [
                  9,
                ],
              ontology_name: 'chmo',
              ontology_prefix: 'CHMO',
            },
            index: 0,
            paths:
            [],
            segments:
            [
              {
                show: true,
                segment_klass_id: 9,
              },
            ],
          },
          {
            data:
            {
              id: 'chmo:class:http://purl.obolibrary.org/obo/CHMO_0002589',
              iri: 'http://purl.obolibrary.org/obo/CHMO_0002589',
              type: 'class',
              label: 'cryogenic scanning electron microscopy',
              obo_id: 'CHMO:0002589',
              short_form: 'CHMO_0002589',
              description:
                [
                  'Microscopy where a finely focused (<10 nm diameter) electron beam with an acceleration voltage
                  50–150 kV is scanned across an electron transparent specimen under vacuum and the intensities of
                  the transmitted electrons are measured. Microscopy where a finely focused (<10 nm diameter) electron
                  beam with an acceleration voltage 50–150 kV is scanned across the specimen, which is cooled in liquid
                  ethane to 180 °C, under vacuum and the interaction of the electrons with the specimen is determined.',
                ],
              segment_ids:
                [
                  5,
                  7,
                ],
              ontology_name: 'chmo',
              ontology_prefix: 'CHMO',
            },
            index: 1,
            paths:
              [],
            segments:
              [
                {
                  show: true,
                  segment_klass_id: 5,
                },
                {
                  show: true,
                  segment_klass_id: 7,
                },
              ],
          },
        ]
      end
    end

    callback(:before_create) do |device_description|
      device_description.created_by = FactoryBot.build(:user) unless device_description.created_by
      device_description.collections << FactoryBot.build(:collection, user_id: device_description.created_by)
      device_description.container = FactoryBot.create(:container, :with_analysis) unless device_description.container
    end
  end
end
