# frozen_string_literal: true

require 'rails_helper'

load Rails.root.join('db/migrate/20260825120000_backfill_pubchem_lcss_sentinels.rb').to_s

# rubocop:disable-next RSpec/DescribeClass
RSpec.describe 'migration 20260825120000: BackfillPubchemLcssSentinels' do
  # Writes taggable_data straight through update_column: the point of each example is the raw JSON
  # shape on the row, which Molecule#pubchem_lcss would normalise away if it were involved.
  def tag_with(lcss_json)
    molecule = create(:molecule)
    molecule.tag.update_column(:taggable_data, JSON.parse(lcss_json)) # rubocop:disable Rails/SkipsModelValidations
    molecule.tag
  end

  def stored_lcss(tag)
    tag.reload.taggable_data['pubchem_lcss']
  end

  describe 'a JSON null, which never leaves PubchemLookupJob pending scope' do
    let!(:tag) { tag_with('{"pubchem_lcss": null, "pubchem_cid": 962}') }

    it 'becomes false, the "asked, PubChem has none" sentinel' do
      described_class_up

      expect(stored_lcss(tag)).to be(false)
    end

    it 'no longer matches the pending predicate the sweep selects on' do
      described_class_up

      expect(pending_lcss_tag_ids).not_to include(tag.id)
    end

    it 'keeps the rest of taggable_data' do
      described_class_up

      expect(tag.reload.taggable_data['pubchem_cid']).to eq(962)
    end
  end

  describe 'a Fault body stored as if it were GHS data' do
    let!(:tag) do
      tag_with('{"pubchem_lcss": {"Fault": {"Code": "PUGVIEW.NotFound", "Message": "No data found"}}}')
    end

    # Deleted rather than set to false: a Fault can be transient, so these get one more real
    # question rather than a permanent "PubChem has none".
    it 'has the key removed so the molecule is asked once more' do
      described_class_up

      expect(tag.reload.taggable_data).not_to have_key('pubchem_lcss')
    end
  end

  describe 'values the migration must not touch' do
    let!(:real_data) { tag_with('{"pubchem_lcss": {"Record": {"Section": []}}}') }
    let!(:already_false) { tag_with('{"pubchem_lcss": false}') }
    let!(:never_asked) { tag_with('{"pubchem_cid": 962}') }

    it 'leaves a real classification alone' do
      described_class_up

      expect(stored_lcss(real_data)).to eq({ 'Record' => { 'Section' => [] } })
    end

    it 'leaves an existing false alone' do
      described_class_up

      expect(stored_lcss(already_false)).to be(false)
    end

    it 'does not invent a value for a molecule that was never asked' do
      described_class_up

      expect(never_asked.reload.taggable_data).not_to have_key('pubchem_lcss')
    end
  end

  describe 'running twice' do
    let!(:null_tag) { tag_with('{"pubchem_lcss": null}') }
    let!(:fault_tag) { tag_with('{"pubchem_lcss": {"Fault": {"Code": "PUGVIEW.NotFound"}}}') }

    it 'is idempotent' do
      described_class_up
      described_class_up

      expect([stored_lcss(null_tag), fault_tag.reload.taggable_data.key?('pubchem_lcss')])
        .to eq([false, false])
    end
  end

  # The predicate PubchemLookupJob#pending_scope selects on. Asserted directly against Postgres so
  # the migration is measured against the same `->>` semantics that caused the stall, not against a
  # Ruby-side reading of the column.
  def pending_lcss_tag_ids
    ElementTag.where(taggable_type: 'Molecule')
              .where("taggable_data->>'pubchem_lcss' is null")
              .pluck(:id)
  end

  def described_class_up
    BackfillPubchemLcssSentinels.new.up
  end
end
