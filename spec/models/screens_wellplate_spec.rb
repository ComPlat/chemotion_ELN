# frozen_string_literal: true

# == Schema Information
#
# Table name: screens_wellplates
#
#  id           :integer          not null, primary key
#  screen_id    :integer
#  wellplate_id :integer
#  deleted_at   :datetime
#
# Indexes
#
#  index_screens_wellplates_on_deleted_at    (deleted_at)
#  index_screens_wellplates_on_screen_id     (screen_id)
#  index_screens_wellplates_on_wellplate_id  (wellplate_id)
#
require 'rails_helper'

RSpec.describe ScreensWellplate do
  describe 'associations' do
    it { is_expected.to belong_to(:screen) }
    it { is_expected.to belong_to(:wellplate) }
  end

  describe '.get_wellplates' do
    let(:screen_a) { create(:screen) }
    let(:screen_b) { create(:screen) }
    let(:shared_plate) { create(:wellplate) }
    let(:single_plate) { create(:wellplate) }
    let(:unlinked_plate) { create(:wellplate) }

    before do
      described_class.create!(screen: screen_a, wellplate: shared_plate)
      described_class.create!(screen: screen_b, wellplate: shared_plate)
      described_class.create!(screen: screen_b, wellplate: single_plate)
      described_class.create!(screen: screen_b, wellplate: unlinked_plate).destroy
      described_class.create!(screen: create(:screen), wellplate: create(:wellplate))
    end

    it 'returns the unique wellplate ids linked to the screens' do
      expect(described_class.get_wellplates([screen_a.id, screen_b.id]))
        .to contain_exactly(shared_plate.id, single_plate.id)
    end

    it 'ignores soft-deleted links' do
      expect(described_class.get_wellplates(screen_b.id)).not_to include(unlinked_plate.id)
    end

    it 'returns an empty list for unknown screens' do
      expect(described_class.get_wellplates([0])).to eq []
    end
  end
end
