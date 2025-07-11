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

    expect(described_class.all.pluck(:source, :source_id)).to match_array [
      ['sample', sample.id],
      ['reaction', reaction.id],
      ['screen', screen.id],
      ['wellplate', wellplate.id],
      ['container', reaction.container.children.first.children.first.id],
    ]
  end
end
# rubocop:enable RSpec/MatchArray
