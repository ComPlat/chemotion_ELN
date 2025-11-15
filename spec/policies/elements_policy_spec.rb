# frozen_string_literal: true

require 'rails_helper'

# rubocop:disable RSpec/MultipleMemoizedHelpers, RSpec/IndexedLet, Naming/VariableNumber
RSpec.describe ElementsPolicy do
  # 9 samples
  # 3 aus eigener Collection
  # 3 aus shared collections
  # 3 aus Collections anderer user auf die man keinen Zugriff hat

  let(:user_1) { create(:person) }
  let(:user_2) { create(:person) }
  let(:user_3) { create(:person) }
  let(:user_1_collection) { create(:collection, user: user_1) }
  let(:user_2_collection) { create(:collection, user: user_2) }
  let(:user_3_collection) { create(:collection, user: user_3) }
  let(:sample_1) { create(:sample, name: 'Sample 1', creator: user_1, collections: [user_1_collection]) }
  let(:sample_2) { create(:sample, name: 'Sample 2', creator: user_1, collections: [user_1_collection]) }
  let(:sample_3) { create(:sample, name: 'Sample 3', creator: user_1, collections: [user_1_collection]) }
  let(:sample_4) { create(:sample, name: 'Sample 4', creator: user_2, collections: [user_2_collection]) }
  let(:sample_5) { create(:sample, name: 'Sample 5', creator: user_2, collections: [user_2_collection]) }
  let(:sample_6) { create(:sample, name: 'Sample 6', creator: user_2, collections: [user_2_collection]) }
  let(:sample_7) { create(:sample, name: 'Sample 7', creator: user_3, collections: [user_3_collection]) }
  let(:sample_8) { create(:sample, name: 'Sample 8', creator: user_3, collections: [user_3_collection]) }
  let(:sample_9) { create(:sample, name: 'Sample 9', creator: user_3, collections: [user_3_collection]) }

  let(:permission_level) { 0 }
  let(:collection_share_to_user_1) do
    create(:collection_share, collection: user_2_collection, shared_with: user_1, permission_level: permission_level)
  end
  let(:collection_share_to_user_2) do
    create(:collection_share, collection: user_3_collection, shared_with: user_2, permission_level: 2)
  end

  before do
    sample_1
    sample_2
    sample_3
    sample_4
    sample_5
    sample_6
    sample_7
    sample_8
    sample_9
  end

  describe '#allowed?' do
    it 'returns false if no user is given' do
      policy = described_class.new(nil, Sample.all)

      expect(policy.allowed?(0)).to be false
    end

    it 'returns false if no scope is given' do
      policy = described_class.new(user_1, nil)

      expect(policy.allowed?(0)).to be false
    end

    it 'returns false if scope is not a AR-Relation' do
      policy = described_class.new(user_1, [sample_1, sample_2])

      expect(policy.allowed?(0)).to be false
    end

    it 'returns false if the scope contains inaccessible records' do
      policy = described_class.new(user_1, Sample.all)

      expect(policy.allowed?(0)).to be false
    end

    it 'returns true if all records in scope are from own collections' do
      policy = described_class.new(user_1, Sample.where(id: [sample_1, sample_2, sample_3]))

      expect(policy.allowed?(0)).to be true
    end

    context 'when all records in scope are shared with the correct permission level' do
      let(:permission_level) { 4 }

      it 'returns true' do # rubocop:disable RSpec/MultipleExpectations
        policy = described_class.new(
          user_1,
          Sample.where(id: [sample_1, sample_2, sample_3, sample_4, sample_5, sample_6]),
        )

        expect(policy.allowed?(0)).to be true
        expect(policy.allowed?(1)).to be true
        expect(policy.allowed?(2)).to be true
        expect(policy.allowed?(3)).to be true
        expect(policy.allowed?(4)).to be true
        expect(policy.allowed?(5)).to be false
      end
    end
  end
end
# rubocop:enable RSpec/MultipleMemoizedHelpers, RSpec/IndexedLet, Naming/VariableNumber
