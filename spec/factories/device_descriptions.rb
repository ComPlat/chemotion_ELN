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
            'data' => {
              'id' => 'chmo:class:http://purl.obolibrary.org/obo/CHMO_0002231',
              'iri' => 'http://purl.obolibrary.org/obo/CHMO_0002231',
              'type' => 'class',
              'label' => 'purification',
              'obo_id' => 'CHMO:0002231',
              'short_form' => 'CHMO_0002231',
              'description' => [
                'Any technique used to physically separate an analyte from byproducts,
                reagents or contaminating substances.',
              ],
              'ontology_name' => 'chmo',
              'ontology_prefix' => 'CHMO',
            },
            'paths' => [
              {
                'iri' => 'http://purl.obolibrary.org/obo/OBI_0000094',
                'label' => 'material processing',
                'short_form' => 'OBI_0000094',
              },
              {
                'iri' => 'http://purl.obolibrary.org/obo/CHMO_0000999',
                'label' => 'separation method',
                'short_form' => 'CHMO_0000999',
              },
              {
                'iri' => 'http://purl.obolibrary.org/obo/CHMO_0002231',
                'label' => 'purification',
                'short_form' => 'CHMO_0002231',
              },
            ],
          },
          {
            'data' => {
              'id' => 'chmo:class:http://purl.obolibrary.org/obo/CHMO_0002413',
              'iri' => 'http://purl.obolibrary.org/obo/CHMO_0002413',
              'type' => 'class',
              'label' => 'cryogenic electron microscopy',
              'obo_id' => 'CHMO:0002413',
              'short_form' => 'CHMO_0002413',
              'description' => [
                'Microscopy where the specimen, which is cooled in liquid ethane to 180 °C',
              ],
              'ontology_name' => 'chmo',
              'ontology_prefix' => 'CHMO',
            },
            'paths' => [
              {
                'iri' => 'http://purl.obolibrary.org/obo/OBI_0000070',
                'label' => 'assay',
                'short_form' => 'OBI_0000070',
              },
              {
                'iri' => 'http://purl.obolibrary.org/obo/OBI_0000185',
                'label' => 'imaging assay',
                'short_form' => 'OBI_0000185',
              },
              {
                'iri' => 'http://purl.obolibrary.org/obo/CHMO_0000067',
                'label' => 'microscopy',
                'short_form' => 'CHMO_0000067',
              },
              {
                'iri' => 'http://purl.obolibrary.org/obo/CHMO_0000068',
                'label' => 'electron microscopy',
                'short_form' => 'CHMO_0000068',
              },
              {
                'iri' => 'http://purl.obolibrary.org/obo/CHMO_0002413',
                'label' => 'cryogenic electron microscopy',
                'short_form' => 'CHMO_0002413',
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
