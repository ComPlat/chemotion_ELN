# frozen_string_literal: true

# == Schema Information
#
# Table name: user_labels
#
#  id           :integer          not null, primary key
#  user_id      :integer
#  title        :string           not null
#  description  :string
#  color        :string           not null
#  access_level :integer          default(0)
#  position     :integer          default(10)
#  created_at   :datetime
#  updated_at   :datetime
#  deleted_at   :datetime
#
require 'rails_helper'

RSpec.describe UserLabel do
  let(:user) { create(:person) }
  let(:other_user) { create(:person) }

  def label(owner, access_level, title, position: 10)
    described_class.create!(user_id: owner.id, access_level: access_level, title: title, color: '#fff',
                            position: position)
  end

  describe '.my_labels' do
    subject(:labels) { described_class.my_labels(user) }

    let!(:own_private) { label(user, 0, 'own private') }
    let!(:foreign_shared) { label(other_user, 1, 'foreign shared') }
    let!(:foreign_global) { label(other_user, 2, 'foreign global') }

    before { label(other_user, 0, 'foreign private') }

    it 'includes own private labels and all shared or global labels' do
      expect(labels).to contain_exactly(own_private, foreign_shared, foreign_global)
    end

    it 'orders by access level descending' do
      expect(labels.to_a).to eq [foreign_global, foreign_shared, own_private]
    end

    it 'orders by position, then title within an access level' do
      b = label(user, 0, 'b', position: 1)
      a = label(user, 0, 'a', position: 1)

      expect(labels.where(access_level: 0).to_a).to eq [a, b, own_private]
    end

    it 'excludes soft-deleted labels' do
      own_private.destroy

      expect(labels).not_to include(own_private)
    end
  end
end
