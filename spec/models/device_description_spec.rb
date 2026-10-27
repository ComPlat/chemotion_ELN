# frozen_string_literal: true

# == Schema Information
#
# Table name: device_descriptions
#
#  id                                   :bigint           not null, primary key
#  access_comments                      :string
#  access_options                       :string
#  alternative_identifier               :string
#  ancestry                             :string           default("/"), not null
#  application_name                     :string
#  application_version                  :string
#  building                             :string
#  consumables_needed_for_maintenance   :jsonb
#  contact_for_maintenance              :jsonb
#  created_by                           :integer
#  deleted_at                           :datetime
#  description                          :text
#  description_for_methods_part         :text
#  device_class                         :string
#  device_class_detail                  :string
#  device_type_id_type                  :string
#  device_type_name                     :string
#  general_tags                         :string           default([]), not null, is an Array
#  helpers_uploaded                     :boolean          default(FALSE)
#  infrastructure_assignment            :string
#  institute                            :string
#  maintenance_contract_available       :string
#  maintenance_scheduling               :string
#  measures_after_full_shut_down        :text
#  measures_after_short_shut_down       :text
#  measures_to_plan_offline_period      :text
#  name                                 :string
#  ontologies                           :jsonb
#  operation_mode                       :string
#  operators                            :jsonb
#  owner_email                          :string
#  owner_id_type                        :string
#  owner_institution                    :string
#  planned_maintenance                  :jsonb
#  policies_and_user_information        :text
#  restart_after_planned_offline_period :text
#  room                                 :string
#  serial_number                        :string
#  setup_descriptions                   :jsonb
#  short_label                          :string
#  size                                 :string
#  unexpected_maintenance               :jsonb
#  university_campus                    :string
#  vendor_company_name                  :string
#  vendor_device_name                   :string
#  vendor_id_type                       :string
#  vendor_url                           :string
#  version_characterization             :text
#  version_doi                          :string
#  version_doi_url                      :string
#  version_identifier_type              :string
#  version_installation_end_date        :datetime
#  version_installation_start_date      :datetime
#  version_number                       :string
#  weight                               :string
#  weight_unit                          :string
#  created_at                           :datetime         not null
#  updated_at                           :datetime         not null
#  device_id                            :integer
#  device_type_id                       :string
#  inventory_id                         :string
#  owner_id                             :string
#  vendor_device_id                     :string
#  vendor_id                            :string
#
# Indexes
#
#  index_device_descriptions_on_ancestry   (ancestry) WHERE (deleted_at IS NULL)
#  index_device_descriptions_on_device_id  (device_id)
#
require 'rails_helper'

RSpec.describe DeviceDescription do
  let(:user) { create(:person) }
  let(:device_description) { create(:device_description, creator: user) }

  describe 'associations' do
    it { is_expected.to belong_to(:device).optional }
    it { is_expected.to belong_to(:creator).class_name('User') }
    it { is_expected.to have_many(:collections).through(:collections_device_descriptions) }
    it { is_expected.to have_many(:attachments).dependent(:nullify) }
    it { is_expected.to have_many(:comments).dependent(:destroy) }
    it { is_expected.to have_one(:container).dependent(:nullify) }
  end

  describe 'after_create :set_short_label' do
    it 'builds the short label from the creator abbreviation and counter' do
      expect(device_description.short_label).to eq "#{user.name_abbreviation}-Dev1"
    end

    it 'increments the creator counter for every new device description' do
      device_description
      second = create(:device_description, creator: user)

      expect(second.short_label).to eq "#{user.name_abbreviation}-Dev2"
      expect(user.reload.counters['device_descriptions']).to eq '2'
    end
  end

  describe '#set_short_label' do
    it 'keeps the given short label when the record is a split' do
      device_description.is_split = true
      device_description.short_label = 'KEEP'
      device_description.set_short_label

      expect(device_description.short_label).to eq 'KEEP'
    end
  end

  describe '#searchable_general_tags' do
    it 'joins the general tags with spaces' do
      device_description.general_tags = %w[laser optics]

      expect(device_description.searchable_general_tags).to eq 'laser optics'
    end

    it 'returns an empty string without tags' do
      expect(described_class.new.searchable_general_tags).to eq ''
    end
  end

  describe '#searchable_ontology_labels' do
    it 'joins the labels of all ontology entries' do
      dd = build(:device_description, :with_ontologies)

      expect(dd.searchable_ontology_labels).to eq 'chromatography cryogenic scanning electron microscopy'
    end

    it 'skips ontology entries without a label' do
      dd = described_class.new(ontologies: [{ 'data' => { 'label' => 'nmr' } }, { 'data' => {} }, {}])

      expect(dd.searchable_ontology_labels).to eq 'nmr'
    end

    it 'returns an empty string without ontologies' do
      expect(described_class.new(ontologies: nil).searchable_ontology_labels).to eq ''
    end
  end

  describe '#analyses' do
    it 'returns the analyses of the container' do
      analyses = device_description.container.analyses

      expect(device_description.analyses).to eq analyses
      expect(analyses).not_to be_empty
    end

    it 'returns an empty array without container' do
      expect(described_class.new.analyses).to eq []
    end
  end

  describe '.search_text_filter' do
    it 'aggregates the distinct matching values of a column' do
      sql = described_class.search_text_filter('%a%', 'device_descriptions.name')

      expect(sql).to eq(
        'COALESCE(array_agg(DISTINCT device_descriptions.name) ' \
        "FILTER (WHERE device_descriptions.name ILIKE '%a%'), '{}')",
      )
    end
  end

  describe '.search_array_filter' do
    it 'unnests the array column and aggregates the matching values' do
      sql = described_class.search_array_filter('%a%', 'device_descriptions', 'general_tags')

      expect(sql).to include('unnest(s.general_tags) val', "val ILIKE '%a%'")
    end
  end

  describe '.search_jsonb_label_filter' do
    it 'aggregates the matching labels of the jsonb array column' do
      sql = described_class.search_jsonb_label_filter('%a%', 'device_descriptions', 'ontologies')

      expect(sql).to include("jsonb_array_elements(s.ontologies) elem WHERE elem->'data'->>'label' ILIKE '%a%'")
    end
  end

  describe '.by_search_fields' do
    subject(:result) { described_class.by_search_fields(query) }

    before do
      create(
        :device_description, :with_ontologies,
        creator: user, name: 'Spectrometer', vendor_device_name: 'Spectro 3000', vendor_company_name: 'Acme',
        vendor_device_id: 'SPX-1', serial_number: 'spec-serial', general_tags: %w[spectroscopy optics]
      )
      create(:device_description, creator: user, name: 'Balance', serial_number: 'bal-1', general_tags: %w[mass])
    end

    context 'when the query matches text columns' do
      let(:query) { 'spec' }

      it 'returns the matching values per field' do
        expect(result).to include(
          'device_description_name' => ['Spectrometer'],
          'device_description_vendor_device_name' => ['Spectro 3000'],
          'device_description_serial_number' => ['spec-serial'],
        )
      end

      it 'returns the matching general tags' do
        expect(result['device_description_general_tags']).to eq ['spectroscopy']
      end
    end

    context 'when the query matches an ontology label' do
      let(:query) { 'chromato' }

      it 'returns the matching ontology labels' do
        expect(result['device_description_ontologies']).to eq ['chromatography']
      end
    end

    context 'when the query matches nothing' do
      let(:query) { 'nothing-matches' }

      it 'returns empty lists for every field' do
        expect(result.keys).to contain_exactly(
          'device_description_name', 'device_description_short_label', 'device_description_vendor_device_name',
          'device_description_vendor_device_id', 'device_description_serial_number',
          'device_description_vendor_company_name', 'device_description_general_tags',
          'device_description_ontologies'
        )
        expect(result.values).to all(eq([]))
      end
    end

    context 'when the query contains LIKE wildcards' do
      let(:query) { '%' }

      it 'treats them literally' do
        expect(result['device_description_name']).to eq []
      end
    end
  end

  describe '#counter_for_split_short_label' do
    it 'returns 0 without children' do
      expect(device_description.counter_for_split_short_label).to eq 0
    end

    it 'returns the highest counter found in the children short labels' do
      create(:device_description, creator: user, parent: device_description, is_split: true,
                                  short_label: "#{device_description.short_label}-7")

      expect(device_description.counter_for_split_short_label).to eq 7
    end

    it 'counts children whose labels do not follow the split pattern' do
      create_list(:device_description, 2, creator: user, parent: device_description, is_split: true,
                                          short_label: 'other')

      expect(device_description.counter_for_split_short_label).to eq 2
    end

    it 'includes soft-deleted children' do
      create(:device_description, creator: user, parent: device_description, is_split: true,
                                  short_label: "#{device_description.short_label}-3").destroy

      expect(device_description.counter_for_split_short_label).to eq 3
    end
  end

  describe '#all_collections' do
    let(:collection) { create(:collection, user: user) }
    let(:all_collection) { Collection.get_all_collection_for_user(user.id) }

    it 'returns the given collections and the locked All collection of the user' do
      expect(device_description.all_collections(user, [collection.id])).to contain_exactly(collection, all_collection)
    end

    it 'does not duplicate the All collection when it is given explicitly' do
      expect(device_description.all_collections(user, [all_collection.id])).to eq [all_collection]
    end
  end

  describe '#create_sub_device_description' do
    subject(:split) { device_description.create_sub_device_description(user, [collection.id]) }

    let(:collection) { create(:collection, user: user) }
    let(:all_collection) { Collection.get_all_collection_for_user(user.id) }

    it 'creates a persisted child with a split short label' do
      expect(split).to be_persisted
      expect(split.parent).to eq device_description
      expect(split.short_label).to eq "#{device_description.short_label}-1"
    end

    it 'numbers consecutive splits' do
      device_description.create_sub_device_description(user, [collection.id])

      expect(split.short_label).to eq "#{device_description.short_label}-2"
    end

    it 'does not increment the creator counter' do
      device_description

      expect { split }.not_to(change { user.reload.counters['device_descriptions'] })
    end

    it 'copies the attributes and assigns the splitting user as creator' do
      device_description.update!(name: 'Original', serial_number: 'SN-1')

      expect(split).to have_attributes(name: 'Original', serial_number: 'SN-1', created_by: user.id)
    end

    it 'adds the split to the given and the All collections' do
      expect(split.collections).to include(collection, all_collection)
    end

    it 'gives the split its own root container' do
      expect(split.container).to have_attributes(container_type: 'root')
      expect(split.container.id).not_to eq device_description.container.id
    end
  end
end
