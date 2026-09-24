# frozen_string_literal: true

# rubocop:disable RSpec/MatchArray

# == Schema Information
#
# Table name: code_logs
#
#  id         :uuid             not null, primary key
#  deleted_at :datetime
#  source     :string
#  value      :string(40)
#  created_at :datetime         not null
#  updated_at :datetime         not null
#  source_id  :integer
#
# Indexes
#
#  index_code_logs_on_source_and_source_id  (source,source_id)
#
require 'rails_helper'

RSpec.describe CodeLog, type: :model do
  it 'logs creation of bar & qr codes' do
    sample = create(:sample_without_analysis)
    reaction = create(:reaction)
    screen = create(:screen)
    wellplate = create(:wellplate)

    expect(described_class.pluck(:source, :source_id)).to match_array [
      ['sample', sample.id],
      ['reaction', reaction.id],
      ['screen', screen.id],
      ['wellplate', wellplate.id],
      ['container', reaction.container.children.first.children.first.id],
    ]
  end

  describe 'after_create :set_digit_value' do
    let(:code_log) { described_class.create!(source: 'sample', source_id: 1) }

    it 'derives a 40 digit value from the uuid' do
      expect(code_log.value).to match(/\A\d{40}\z/)
      expect(code_log.value).to eq Chemotion::CodeCreator.uuid_to_digit(code_log.id)
    end

    it 'overwrites a given value' do
      log = described_class.create!(source: 'sample', source_id: 1, value: '1' * 40)

      expect(log.reload.value).to eq Chemotion::CodeCreator.uuid_to_digit(log.id)
    end

    it 'can be converted back to the uuid' do
      expect(Chemotion::CodeCreator.digit_to_uuid(code_log.value)).to eq code_log.id
    end
  end

  describe '#value_sm' do
    it 'returns the 2nd to 11th digit of the value' do
      code_log = build(:code_log, value: '0123456789ABCDEF')

      expect(code_log.value_sm).to eq '123456789A'
    end
  end

  describe 'element code logs' do
    let(:sample) { create(:sample_without_analysis) }

    it 'soft-deletes the code logs together with the element' do
      code_log = sample.code_log
      sample.destroy

      expect(described_class.find_by(id: code_log.id)).to be_nil
      expect(described_class.with_deleted.find(code_log.id).deleted_at).to be_present
    end
  end
end
# rubocop:enable RSpec/MatchArray
