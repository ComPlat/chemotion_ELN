# frozen_string_literal: true

require 'rails_helper'

describe Usecases::Reactions::NormalizeVariations do
  let(:row_id) { SecureRandom.uuid }

  it 'reads nothing, an empty string and an empty object as no variations' do
    expect([nil, '', {}].map { |value| described_class.call(value) }).to all(eq([]))
  end

  it 'keeps a list row as it is and fills in what it lacks' do
    rows = described_class.call([{ 'id' => row_id, 'idx' => 4, 'data' => { 'id' => 'x' } }, { 'notes' => '' }])

    expect(rows.first).to eq('id' => row_id, 'idx' => 4, 'data' => { 'id' => 'x' })
    expect(rows.second).to include('idx' => 1, 'data' => {})
    expect(rows.second['id']).to be_present
  end

  it 'reads JSON text' do
    rows = described_class.call([{ 'id' => row_id, 'idx' => 1, 'data' => {} }].to_json)

    expect(rows).to eq([{ 'id' => row_id, 'idx' => 1, 'data' => {} }])
  end

  it 'drops entries that are not rows' do
    expect(described_class.call(['text', 3, nil])).to eq([])
  end

  # The column's shape before 20260731120000_convert_reaction_variations_to_diff_list.
  it 'converts the old object keyed by variation UUID the way the migration does' do
    other_id = SecureRandom.uuid
    body = {
      'id' => 2,
      'uuid' => row_id,
      'startingMaterials' => { '42' => { 'mass' => { 'value' => 1, 'unit' => 'g' } } },
      'metadata' => { 'notes' => 'note', 'analyses' => [7], 'group' => { 'group' => 1, 'subgroup' => 2 } },
    }
    rows = described_class.call(
      other_id => { 'id' => 3, 'uuid' => other_id, 'metadata' => {} },
      row_id => body,
    )

    expect(rows.map { |row| row['idx'] }).to eq([2, 3])
    expect(rows.first).to eq(
      'id' => row_id,
      'idx' => 2,
      'group' => [1, 2],
      'analyses' => [7],
      'notes' => 'note',
      'data' => { 'id' => row_id },
      'legacy_data' => body,
    )
  end
end
