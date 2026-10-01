# frozen_string_literal: true

# == Schema Information
#
# Table name: cellline_materials
#
#  id                  :bigint           not null, primary key
#  biosafety_level     :string
#  cell_type           :string
#  created_by          :integer
#  cryo_pres_medium    :string
#  deleted_at          :datetime
#  description         :string
#  disease             :jsonb
#  gender              :string
#  growth_medium       :string
#  mutation            :string
#  name                :string
#  optimal_growth_temp :float
#  organism            :jsonb
#  source              :string
#  tissue              :jsonb
#  variant             :string
#  created_at          :datetime         not null
#  updated_at          :datetime         not null
#
# Indexes
#
#  index_cellline_materials_on_name_and_source  (name,source) UNIQUE
#
require 'rails_helper'

RSpec.describe CelllineMaterial do
  let(:material) { create(:cellline_material) }

  describe 'associations' do
    it { is_expected.to have_many(:literals).dependent(:destroy) }
    it { is_expected.to have_many(:literatures).through(:literals) }
  end

  describe 'uniqueness of name and source' do
    it 'rejects a second material with the same name and source at the DB level' do
      duplicate = build(:cellline_material, name: material.name, source: material.source)

      expect { duplicate.save!(validate: false) }.to raise_error(ActiveRecord::RecordNotUnique)
    end

    it 'allows the same name with a different source' do
      other = build(:cellline_material, name: material.name, source: 'other source')

      expect(other.save).to be true
    end
  end

  describe 'soft delete' do
    it 'keeps the record in the table after destroy' do
      material.destroy

      expect(described_class.find_by(id: material.id)).to be_nil
      expect(described_class.with_deleted.find_by(id: material.id)).to be_present
    end
  end

  describe 'multisearch' do
    it 'creates a pg_search document for the name' do
      document = PgSearch::Document.find_by(searchable: material)

      expect(document.content).to eq material.name
    end
  end
end
