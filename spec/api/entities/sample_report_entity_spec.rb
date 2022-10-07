# frozen_string_literal: true

require 'rails_helper'

describe Entities::SampleReportEntity do
  describe '.represent' do
    subject(:entity) do
      described_class.represent(
        sample,
        detail_levels: detail_levels,
      )
    end

    let(:sample) { create(:sample, :with_residues) }
    let(:detail_levels) { { Sample => sample_detail_level } }

    before do
      user = create(:person)
      reaction = create(:reaction, creator: user)
      sample.reactions = [reaction]
      literature = create(:literature)
      create(:literal, literature: literature, element: sample, user: user)
    end

    context 'when detail level for Sample is 10' do
      let(:sample_detail_level) { 10 }

      it 'returns a sample with collections' do
        expect(grape_entity_as_hash[:collections]).not_to be_empty
      end

      it 'returns a sample with analyses' do
        expect(grape_entity_as_hash[:analyses]).not_to be_empty
      end

      it 'returns a sample with reactions' do
        expect(grape_entity_as_hash[:reactions]).not_to be_empty
      end

      it 'returns a sample with a molecule_iupac_name' do
        expect(grape_entity_as_hash[:molecule_iupac_name]).not_to be_empty
      end

      it 'returns a sample with a get_svg_path' do
        expect(grape_entity_as_hash[:get_svg_path]).not_to be_empty
      end

      it 'returns a sample with literatures' do
        expect(grape_entity_as_hash[:literatures]).not_to be_empty
      end
    end

    context 'when detail level for Sample is 2' do
      let(:sample_detail_level) { 2 }

      it 'returns a sample with collections' do
        expect(grape_entity_as_hash[:collections]).not_to be_empty
      end

      it 'returns a sample with analyses' do
        expect(grape_entity_as_hash[:analyses]).not_to be_empty
      end

      it 'returns a sample with reactions' do
        expect(grape_entity_as_hash[:reactions]).to be_empty
      end

      it 'returns a sample with a molecule_iupac_name' do
        expect(grape_entity_as_hash[:molecule_iupac_name]).to eq(nil)
      end

      it 'returns a sample with a get_svg_path' do
        expect(grape_entity_as_hash[:get_svg_path]).to eq(nil)
      end

      it 'returns a sample with literatures' do
        expect(grape_entity_as_hash[:literatures]).to be_empty
      end
    end

    context 'when detail level for Sample is 0' do
      let(:sample_detail_level) { 0 }

      it 'returns a sample with collections' do
        expect(grape_entity_as_hash[:collections]).not_to be_empty
      end

      it 'returns a sample with analyses' do
        expect(grape_entity_as_hash[:analyses]).to be_empty
      end
    end
  end
end
