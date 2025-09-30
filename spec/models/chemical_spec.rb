# frozen_string_literal: true

# == Schema Information
#
# Table name: chemicals
#
#  id            :bigint           not null, primary key
#  cas           :text
#  chemical_data :jsonb
#  deleted_at    :datetime
#  updated_at    :datetime
#  sample_id     :integer
#
require 'rails_helper'

RSpec.describe Chemical do
  describe 'creation' do
    let(:sample) { create(:sample) }
    let!(:chemical) { create(:chemical, sample_id: sample.id) }

    it 'is possible to create a valid chemical entry' do
      expect(chemical.valid?).to be(true)
    end
  end
end
