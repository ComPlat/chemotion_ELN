# frozen_string_literal: true

# == Schema Information
#
# Table name: provenances
#
#  id                  :uuid             not null, primary key
#  city                :string
#  doi                 :string
#  email               :string
#  name                :string
#  orcid               :string
#  organization        :string
#  patent              :string
#  publication_url     :string
#  starts_at           :datetime
#  username            :string
#  created_at          :datetime         not null
#  updated_at          :datetime         not null
#  reaction_process_id :uuid
#
require 'rails_helper'

RSpec.describe ReactionProcessEditor::Provenance do
  subject(:provenance) { create(:provenance, starts_at: starts_at) }

  let(:starts_at) { '' }

  it { is_expected.to belong_to(:reaction_process) }

  describe 'attributes' do
    subject(:persisted_provenance) { create(:provenance) }

    it 'persists provenance metadata' do
      expect(persisted_provenance).to have_attributes(
        city: 'Karlsruhe',
        doi: '10.1109/5.771073',
        patent: 'Creative Commons',
        publication_url: 'https://github.com/comPlat/chemotion_ELN',
        username: 'User1 Complat',
        name: 'Middle Of A Chain Reaction',
        orcid: '0000-0002-1825-0097',
        organization: 'KIT IOC',
        email: 'complat.user1@eln.edu',
      )
    end

    it 'belongs to a reaction process' do
      expect(persisted_provenance.reaction_process).to be_a(ReactionProcessEditor::ReactionProcess)
    end
  end

  describe '#initialize' do
    it 'sets starts_at rounded to the current minute' do
      travel_to Time.zone.local(2026, 6, 16, 12, 34, 56) do
        expect(described_class.new.starts_at).to eq(Time.zone.local(2026, 6, 16, 12, 34))
      end
    end

    context 'with starts_at' do
      let(:starts_at) { '2026-06-16 11:22:33' }

      it 'keeps provided starts_at' do
        expect(described_class.new(starts_at: starts_at).starts_at).to eq(Time.zone.parse(starts_at))
      end
    end
  end

  describe '#starts_at=' do
    let(:starts_at) { Time.zone.local(2026, 6, 16, 10, 20, 30) }
    let(:starts_at_iso8601) { '2026-06-16T10:20:30Z' }

    it 'keeps time values' do
      provenance.starts_at = starts_at_iso8601

      expect(provenance.starts_at).to eq(starts_at)
    end

    it 'parses ISO8601 string values' do
      provenance.starts_at = starts_at_iso8601

      expect(provenance.starts_at).to eq(Time.zone.parse(starts_at_iso8601))
    end

    it 'parses string values' do
      provenance.starts_at = '2026-06-16 10:20:35'

      expect(provenance.starts_at).to eq(Time.zone.parse('2026-06-16 10:20:35'))
    end

    it 'falls back to beginning_of_minute for invalid starts_at' do
      travel_to Time.zone.local(2026, 6, 16, 12, 34, 56) do
        provenance.starts_at = '32.13.1999'

        expect(provenance.starts_at).to eq(Time.zone.local(2026, 6, 16, 12, 34))
      end
    end
  end
end
