# frozen_string_literal: true

# == Schema Information
#
# Table name: literal_groups
#
#  element_type       :string(40)
#  element_id         :integer
#  literature_id      :integer
#  category           :string(40)
#  count              :bigint
#  title              :string
#  doi                :string
#  url                :string
#  refs               :jsonb
#  short_label        :string
#  name               :string
#  external_label     :string
#  element_updated_at :datetime
#
require 'rails_helper'

# LiteralGroup is backed by the literal_groups SQL view (db/views/literal_groups_v01.sql), which
# counts literals per element, literature and category.
RSpec.describe LiteralGroup do
  let(:literature) { create(:literature) }
  let(:sample) { create(:sample) }
  let(:reaction) { create(:reaction) }

  before do
    create_list(:literal, 2, literature: literature, element: sample, category: 'detail')
    create(:literal, literature: literature, element: sample, category: 'other')
    create(:literal, literature: literature, element: reaction, category: 'detail')
  end

  def keys(relation)
    relation.pluck(:element_type, :element_id, :category)
  end

  describe 'the view' do
    it 'aggregates literals per element, literature and category' do
      row = described_class.find_by(element_type: 'Sample', element_id: sample.id, category: 'detail')

      expect(row).to have_attributes(count: 2, title: literature.title, short_label: sample.short_label)
    end
  end

  describe '.by_element_ids_and_cat' do
    it 'returns groups of the given samples and reactions in the given categories' do
      groups = described_class.by_element_ids_and_cat([sample.id], [reaction.id], ['detail'])

      expect(keys(groups)).to contain_exactly(['Sample', sample.id, 'detail'], ['Reaction', reaction.id, 'detail'])
    end

    it 'works with sample ids only' do
      groups = described_class.by_element_ids_and_cat([sample.id], [], %w[detail other])

      expect(keys(groups)).to contain_exactly(['Sample', sample.id, 'detail'], ['Sample', sample.id, 'other'])
    end

    it 'works with reaction ids only' do
      groups = described_class.by_element_ids_and_cat(nil, [reaction.id], ['detail'])

      expect(keys(groups)).to contain_exactly(['Reaction', reaction.id, 'detail'])
    end

    it 'returns nothing without any ids' do
      expect(described_class.by_element_ids_and_cat([], [], ['detail'])).to be_empty
    end
  end

  describe '#readonly?' do
    it 'refuses to save' do
      row = described_class.first

      expect { row.save }.to raise_error(ActiveRecord::ReadOnlyRecord)
    end
  end
end
