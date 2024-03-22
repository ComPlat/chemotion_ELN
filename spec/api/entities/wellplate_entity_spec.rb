# frozen_string_literal: true

require 'rails_helper'

describe Entities::WellplateEntity do
  describe '.represent' do
    subject(:entity) do
      described_class.represent(
        wellplate,
        detail_levels: detail_levels,
        displayed_in_list: displayed_in_list,
      )
    end

    let(:detail_levels) { { Wellplate => detail_level, Well => detail_level, Sample => detail_level } }
    let(:displayed_in_list) { false }
    let(:wellplate) { create(:wellplate) }
    let(:sample) { build(:valid_sample) }

    let(:wells) do
      [].tap do |wells|
        (1..8).each do |pos_y|
          (1..12).each do |pos_x|
            wells << build_stubbed(:well, wellplate: wellplate, position_x: pos_x, position_y: pos_y, sample: sample)
          end
        end
      end
    end

    before do
      allow(wellplate).to receive(:wells).and_return(wells)
      allow(wellplate).to receive(:ordered_wells_with_samples).and_return(wells)
      allow(wellplate).to receive(:container).and_return(build_stubbed(:container))
    end

    context 'when detail level for Well is 10' do
      let(:detail_level) { 10 }

      it 'returns a wellplate with the following attributes' do
        expect(grape_entity_as_hash).to include(
          id: wellplate.id,
          is_restricted: false,
          height: wellplate.height,
          width: wellplate.width,
          type: 'wellplate',
          description: wellplate.description,
          name: wellplate.name,
          readout_titles: wellplate.readout_titles,
          short_label: wellplate.short_label,
          created_at: I18n.l(wellplate.created_at, format: :eln_timestamp),
          updated_at: I18n.l(wellplate.updated_at, format: :eln_timestamp),
        )
      end

      it 'returns a wellplate with a wells' do
        expect(grape_entity_as_hash[:wells]).not_to be_empty
      end

      it 'returns a wellplate with a code_log' do
        expect(grape_entity_as_hash[:code_log]).not_to be_empty
      end

      it 'returns a wellplate with a container' do
        expect(grape_entity_as_hash[:container]).not_to be_empty
      end

      it 'returns a wellplate with segments' do
        pending 'Segments are an empty array because a segments factory is missing'
        raise 'missing segments factory'
        # expect(grape_entity_as_hash[:segments]).not_to be_empty
      end

      it 'returns a wellplate with a tag' do
        expect(grape_entity_as_hash[:tag]).not_to be_empty
      end
    end

    context 'when detail level for Well is 0' do
      let(:detail_level) { 0 }

      it 'returns a wellplate with the following attributes' do
        expect(grape_entity_as_hash).to include(
          id: wellplate.id,
          is_restricted: true,
          height: wellplate.height,
          width: wellplate.width,
          type: 'wellplate',
          description: '***',
          name: '***',
          readout_titles: '***',
          short_label: '***',
          created_at: I18n.l(wellplate.created_at, format: :eln_timestamp),
          updated_at: I18n.l(wellplate.updated_at, format: :eln_timestamp),
        )
      end

      it 'returns a wellplate without a code_log' do
        expect(grape_entity_as_hash[:code_log]).to be_nil
      end

      it 'returns a wellplate without a container' do
        expect(grape_entity_as_hash[:container]).to be_nil
      end

      it 'returns a wellplate with segments' do
        pending 'Segments are an empty array because a segments factory is missing'
        raise 'missing segments factory'
        # expect(grape_entity_as_hash[:segments]).not_to be_empty
      end

      it 'returns a wellplate without a tag' do
        expect(grape_entity_as_hash[:tag]).to be_nil
      end
    end

    context 'when entity is displayed in list' do
      let(:displayed_in_list) { true }
      let(:detail_level) { 10 }

      it 'returns a wellplate without a code_log' do
        expect(grape_entity_as_hash[:code_log]).to be_nil
      end

      it 'returns a wellplate without a container' do
        expect(grape_entity_as_hash[:container]).to be_nil
      end

      it 'returns a wellplate without segments' do
        expect(grape_entity_as_hash[:segments]).to be_empty
      end

      it 'returns a wellplate without wells' do
        expect(grape_entity_as_hash[:wells]).to be_empty
      end
    end
  end
end
