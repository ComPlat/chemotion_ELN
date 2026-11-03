# frozen_string_literal: true

require 'rails_helper'

RSpec.describe Versioning::Serializers::ReactionVariationsSerializer do
  let(:user) { create(:user) }
  let(:first_id) { '00000000-0000-4000-8000-00000000000a' }
  let(:second_id) { '00000000-0000-4000-8000-00000000000b' }

  def entries(reaction)
    described_class.call(Reaction.with_log_data.find(reaction.id))
  end

  def field_changes(reaction)
    entries(reaction).filter_map { |entry| entry[:changes]['variations'] }
  end

  # The table VersionsTableFields.js renders: a list of sections, each a list of parts.
  def rows(value)
    value.dig(0, 0, :content, :rows)
  end

  # Variations are a list of rows that each hold what they change about the reaction under `data`
  # (db/schemas/reaction_variations.schema.json).
  def variation_row(id, idx, data, **attributes)
    { 'id' => id, 'idx' => idx, 'data' => data }.merge(attributes.stringify_keys)
  end

  it 'is an entry of its own' do
    reaction = create(:reaction)
    as_request { reaction.update!(variations: [variation_row(first_id, 0, '_duration' => '2 h')]) }

    expect(entries(reaction).last[:name]).to eq(['Variations'])
  end

  it 'shows what each variation changes as a table row' do
    material = create(:sample, name: 'Benzene')
    reaction = create(:reaction, temperature: { 'valueUnit' => '°C', 'userText' => '20', 'data' => [] })
    ReactionsStartingMaterialSample.create!(reaction: reaction, sample: material, position: 0)
    data = {
      'id' => SecureRandom.uuid,
      '_temperature' => { 'userText' => '-78' },
      '_starting_materials' => [
        { '_real_amount_value' => 0.042, '_real_amount_unit' => 'g', 'equivalent' => 1.2 },
        { 'name' => 'Extra', '_target_amount_value' => 0.5, '_target_amount_unit' => 'g' },
      ],
      '_products' => [{ 'equivalent' => 0.85 }],
    }
    as_request do
      reaction.update!(variations: [variation_row(first_id, 1, data, group: [1, 0], notes: 'colder')])
    end

    value = field_changes(reaction).last[:new_value]
    expect(value.dig(0, 0, :content, :columns).pluck(:headerName)).to eq(%w[ID Group Notes Changes])
    expect(rows(value).first).to include(idx: 1, group: '1.0', notes: 'colder')
    expect(rows(value).first[:changes].split("\n")).to eq(
      [
        'Temperature: -78 °C',
        "Starting material 1 (#{material.short_label}): equivalent: 1.2, real amount: 0.042 g",
        'Starting material 2 (Extra): target amount: 0.5 g',
        'Product 1: yield: 85 %',
      ],
    )
  end

  it 'reverts to the stored list, not to the table' do
    first = variation_row(first_id, 0, '_duration' => '1 h')
    reaction = create(:reaction, variations: [first])
    as_request { reaction.update!(variations: [first.deep_merge('data' => { '_duration' => '2 h' })]) }

    expect(field_changes(reaction).last[:revertible_value]).to eq([first])
  end

  it 'shows no change between two empty lists' do
    reaction = create(:reaction, variations: [])
    as_request { reaction.update!(name: 'renamed') }

    expect(field_changes(reaction)).to be_empty
  end

  it 'marks a row still in the old format' do
    reaction = create(:reaction)
    legacy = variation_row(first_id, 0, {}, legacy_data: { 'startingMaterials' => {} }, notes: 'old')
    reaction.update_columns(variations: [legacy]) # rubocop:disable Rails/SkipsModelValidations
    as_request { reaction.update!(variations: [variation_row(first_id, 0, '_duration' => '2 h')]) }

    old_row = rows(field_changes(reaction).last[:old_value]).first
    expect(old_row).to include(notes: 'old', changes: '(old format)')
  end

  it 'does not share its cache entry with the reaction properties' do
    reaction = create(:reaction)
    as_request { reaction.update!(name: 'renamed', variations: [variation_row(first_id, 0, '_duration' => '2 h')]) }
    with_log_data = Reaction.with_log_data.find(reaction.id)

    Versioning::Serializers::ReactionSerializer.call(with_log_data)
    expect(described_class.call(with_log_data).flat_map { |entry| entry[:changes].keys }.uniq).to eq(['variations'])
  end

  # The merging of the versions of one request is BaseSerializer's; these check it still yields complete lists.
  it 'keeps a nested removal when the same request edited that value first' do
    temperature = { 'value' => 20, 'unit' => '°C' }
    variation = variation_row(first_id, 0, 'temperature' => temperature, 'duration' => { 'value' => 1 })
    without_temperature = variation_row(first_id, 0, 'duration' => { 'value' => 1 })
    reaction = create(:reaction, variations: [variation])
    as_request do
      reaction.update!(variations: [variation.deep_merge('data' => { 'temperature' => { 'value' => 25 } })])
      reaction.update!(variations: [without_temperature])
    end

    change = field_changes(reaction).last
    expect(change[:revertible_value]).to eq([variation])
    expect(rows(change[:new_value]).first[:changes]).to eq('Duration: 1')
  end

  it 'applies a removal inside a variation that the same request added' do
    first = variation_row(first_id, 0, 'duration' => { 'value' => 1 })
    added = variation_row(second_id, 1, 'duration' => { 'value' => 2 })
    reaction = create(:reaction, variations: [first])
    as_request do
      reaction.update!(variations: [first, added.deep_merge('data' => { 'temperature' => { 'value' => 20 } })])
      reaction.update!(variations: [first, added])
    end

    expect(rows(field_changes(reaction).last[:new_value]).pluck(:changes)).to eq(['Duration: 1', 'Duration: 2'])
  end

  it 'returns complete previous and updated variations when one is edited and another deleted' do
    first = variation_row(first_id, 0, 'temperature' => { 'value' => 20, 'unit' => '°C' })
    second = variation_row(second_id, 1, 'temperature' => { 'value' => 30, 'unit' => '°C' })
    edited = first.deep_merge('data' => { 'temperature' => { 'value' => 25 } })
    reaction = create(:reaction, variations: [first, second])
    as_request { reaction.update!(variations: [edited]) }

    change = field_changes(reaction).last
    expect(change[:revertible_value]).to eq([first, second])
    expect(rows(change[:new_value]).pluck(:idx)).to eq([0])
  end
end
