# frozen_string_literal: true

require 'rails_helper'

load Rails.root.join('db/migrate/20260526140000_matrice_ai_gates.rb').to_s

# rubocop:disable-next RSpec/DescribeClass
RSpec.describe 'migration 20260526140000: MatriceAiGates' do
  let(:migration) { MatriceAiGates.new }
  let(:admin_pick) { create(:person) }

  def gate(name)
    Matrice.find_by(name: name)
  end

  describe '#up' do
    it 'leaves a gate that already exists as it was' do
      Matrice.create!(name: 'aiGlobalProvider', enabled: false, include_ids: [admin_pick.id], exclude_ids: [])

      migration.up

      expect(gate('aiGlobalProvider')).to have_attributes(enabled: false, include_ids: [admin_pick.id])
    end
  end

  describe '#down' do
    before { migration.up }

    it 'removes the gates still as #up seeded them, for good' do
      migration.down

      expect(Matrice.with_deleted.where(name: MatriceAiGates::GATES.keys)).to be_empty
    end

    it 'leaves nothing behind that stops #up from running again' do
      migration.down

      expect { migration.up }.not_to raise_error
      expect(gate('aiUserApiKey')).to be_present
    end

    it 'keeps a gate an admin has since configured' do
      gate('aiUserApiKey').update!(include_ids: [admin_pick.id])

      migration.down

      expect(gate('aiUserApiKey').include_ids).to eq([admin_pick.id])
      expect(gate('aiFeatures')).to be_nil
    end
  end
end
