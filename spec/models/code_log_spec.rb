# frozen_string_literal: true

# rubocop:disable RSpec/MatchArray

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
