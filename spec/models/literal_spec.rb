# frozen_string_literal: true

# == Schema Information
#
# Table name: literals
#
#  id            :integer          not null, primary key
#  literature_id :integer
#  element_id    :integer
#  element_type  :string(40)
#  category      :string(40)
#  user_id       :integer
#  created_at    :datetime         not null
#  updated_at    :datetime         not null
#  litype        :string
#
# Indexes
#
#  index_on_element_literature  (element_type,element_id,literature_id,category)
#  index_on_literature          (literature_id,element_type,element_id)
#
# Foreign Keys
#
#  fk_rails_...  (literature_id => literatures.id)
#
require 'rails_helper'

RSpec.describe Literal do
  let(:literature) { create(:literature) }
  let(:sample) { create(:sample) }
  let(:reaction) { create(:reaction) }
  let!(:sample_detail) { create(:literal, literature: literature, element: sample, category: 'detail') }
  let!(:sample_other) { create(:literal, literature: literature, element: sample, category: 'other') }
  let!(:reaction_detail) { create(:literal, literature: literature, element: reaction, category: 'detail') }

  describe 'associations' do
    it { is_expected.to belong_to(:literature) }
    it { is_expected.to belong_to(:element) }
    it { is_expected.to belong_to(:user) }
  end

  describe '.by_element_attributes' do
    it 'returns the literals of the given element' do
      expect(described_class.by_element_attributes(sample.id, 'Sample')).to contain_exactly(sample_detail, sample_other)
    end

    it 'matches on the element type' do
      expect(described_class.by_element_attributes([sample.id, reaction.id], 'Reaction'))
        .to contain_exactly(reaction_detail)
    end
  end

  describe '.by_element_attributes_and_cat' do
    it 'also filters on the category' do
      expect(described_class.by_element_attributes_and_cat(sample.id, 'Sample', 'detail'))
        .to contain_exactly(sample_detail)
    end

    it 'accepts lists of ids' do
      expect(described_class.by_element_attributes_and_cat([sample.id, reaction.id], %w[Sample Reaction], 'detail'))
        .to contain_exactly(sample_detail, reaction_detail)
    end
  end
end
