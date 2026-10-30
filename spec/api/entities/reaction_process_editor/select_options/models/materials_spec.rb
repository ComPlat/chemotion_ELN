# frozen_string_literal: true

require 'rails_helper'

describe Entities::ReactionProcessEditor::SelectOptions::Models::Materials do
  subject(:materials_select_options) { described_class.new }

  let(:user) { create(:person) }
  let(:sample) { create(:valid_sample, creator: user) }
  let(:collection) { create(:collection, user: user) }

  describe '#select_options_for' do
    subject(:select_options) { materials_select_options.select_options_for(reaction_process: reaction_process) }

    let(:reaction_process) { create(:reaction_process) }

    it 'returns select options hash' do
      expect(select_options).to be_a(Hash)
    end

    context 'with an intermediate sample' do
      let(:intermediate_sample) { create(:valid_sample) }

      before do
        create(:reactions_intermediate_sample, reaction: reaction_process.reaction, sample: intermediate_sample)
      end

      it 'includes the intermediate in the sample options' do
        expect(select_options[:SAMPLE]).to include(
          hash_including(value: intermediate_sample.id, acts_as: 'SAMPLE'),
        )
      end

      it 'includes the intermediate in the intermediate options' do
        expect(select_options[:INTERMEDIATE]).to include(
          hash_including(value: intermediate_sample.id, acts_as: 'SAMPLE'),
        )
      end
    end
  end

  describe '#sample_options_for_user' do
    subject(:sample_options) { materials_select_options.sample_options_for_user(user: user) }

    before do
      CollectionsSample.create!(collection: collection, sample: sample)
    end

    it 'maps user samples to options' do
      expect(sample_options).to include(
        hash_including(value: sample.id, acts_as: 'SAMPLE'),
      )
    end

    context 'without a user' do
      subject(:sample_options) { materials_select_options.sample_options_for_user(user: nil) }

      it 'returns an empty array' do
        expect(sample_options).to eq([])
      end
    end
  end
end
