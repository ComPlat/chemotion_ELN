# frozen_string_literal: true

require 'spec_helper'

RSpec.describe Usecases::Samples::FindByShortLabel do
  describe '#result' do
    let(:user) { create(:person) }
    let(:user_collection) { create(:collection, user: user) }
    let(:other_user) { create(:person) }
    let(:other_user_collection) { create(:collection, user: other_user) }
    let(:sample) { create(:sample, short_label: 'FOOBAR', creator: user, collections: [user_collection]) }
    let(:other_sample) { create(:sample, short_label: 'BARFOO', creator: other_user, collections: [other_user_collection]) }

    let(:current_user) { user }
    let(:finder) { described_class.new(short_label, current_user) }

    before do
      user && user_collection
      other_user && other_user_collection
      sample && other_sample
    end

    context 'when sample can not be found by given short_label' do
      let(:short_label) { 'SOMETHING_NOT_EXISTING' }

      it 'returns an empty result' do
        expect(finder.result).to eq({ sample_id: nil, collection_id: nil})
      end
    end

    context 'when sample can be found but is not in current_users collections' do
      let(:short_label) { 'BARFOO' }

      it 'returns an empty result' do
        expect(finder.result).to eq({ sample_id: nil, collection_id: nil})
      end
    end

    context 'when sample can be found in current_users collections' do
      let(:short_label) { 'FOOBAR' }

      it 'returns the sample_id and the collection_id' do
        expect(finder.result).to eq({ sample_id: sample.id, collection_id: user_collection.id})
      end
    end
  end
end
