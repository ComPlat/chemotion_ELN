# frozen_string_literal: true

require 'rails_helper'

RSpec.describe Versioning::Reverters::ReactionReverter do
  let(:sample) { create(:sample) }
  let(:reaction) { create(:reaction) }
  let(:current) { [{ 'id' => SecureRandom.uuid, 'idx' => 1, 'data' => { 'id' => SecureRandom.uuid } }] }

  def revert(value)
    described_class.call('db_id' => reaction.id, 'fields' => [{ 'name' => 'variations', 'value' => value }])
    reaction.reload.variations
  end

  before do
    ReactionsStartingMaterialSample.create!(reaction: reaction, sample: sample, position: 0)
    reaction.update_columns(variations: current) # rubocop:disable Rails/SkipsModelValidations
  end

  it 'reverts to a version without variations' do
    expect([nil, '', {}, []].map { |value| revert(value) }).to all(eq([]))
  end

  it 'reverts to a version in the list format' do
    version = [{ 'id' => SecureRandom.uuid, 'idx' => 3, 'group' => [1, 0], 'data' => { 'id' => 'x' } }]

    expect(revert(version)).to eq(version)
  end

  # Versions from before the diff-based format hold the object keyed by variation UUID. The values
  # of its rows end up in their diffs, as the migration that introduced the format left them.
  it 'reverts to a version from before the diff-based format, values included' do
    row_id = SecureRandom.uuid
    version = {
      row_id => {
        'id' => 1,
        'uuid' => row_id,
        'startingMaterials' => { sample.id.to_s => { 'mass' => { 'value' => 0.5, 'unit' => 'g' } } },
        'metadata' => { 'notes' => 'old', 'analyses' => [], 'group' => { 'group' => 1, 'subgroup' => 1 } },
      },
    }

    rows = revert(version)

    expect(rows.size).to eq(1)
    expect(rows.first).to include('id' => row_id, 'idx' => 1, 'notes' => 'old', 'group' => [1, 1])
    expect(rows.first['data']['_starting_materials']).to eq(
      [{ '_target_amount_value' => 0.5, '_target_amount_unit' => 'g' }],
    )
  end
end
