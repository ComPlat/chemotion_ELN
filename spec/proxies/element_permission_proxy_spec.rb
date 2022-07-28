# frozen_string_literal: true

require 'rails_helper'

RSpec.describe ElementPermissionProxy do
  let(:user) { create(:user) }
  let(:c1) { create(:collection, user: user, sample_detail_level: 1, wellplate_detail_level: 2, reaction_detail_level: 3, screen_detail_level: 0) }
  let(:c2) { create(:collection, user: user, sample_detail_level: 3, wellplate_detail_level: 1, reaction_detail_level: 2, screen_detail_level: 1) }

  context 'when element is a sample' do
    let(:sample) { create(:sample) }
    let(:sample_with_associations) { Sample.where(id: sample.id).includes(collections: :sync_collections_users).first }

    before do
      CollectionsSample.create!(sample: sample, collection: c1)
      CollectionsSample.create!(sample: sample, collection: c2)
    end

    subject { described_class.new(user, sample_with_associations, [user.id]) }

    context 'when element is only in shared collections' do
      before do
        c1.update(is_shared: true, sample_detail_level: 1)
        c2.update(is_shared: true, sample_detail_level: 3)
      end

      describe 'detail_level_for_element' do
        it 'returns maximal sample detail level of user collections' do
          expect(subject.send(:detail_level_for_element)).to eq 3
        end
      end
    end

    context 'when element belongs to one or more unshared user collections' do
      before do
        c1.update(is_shared: false)
        c2.update(is_shared: true)
      end

      describe 'detail_level_for_element' do
        it 'returns maximal sample detail level' do
          expect(subject.send(:detail_level_for_element)).to eq 10
        end
      end
    end
  end
end
