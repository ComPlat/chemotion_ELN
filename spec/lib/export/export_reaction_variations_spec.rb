# frozen_string_literal: true

require 'rails_helper'

# rubocop:disable RSpec/MultipleExpectations

# A variation stores only what it changes about its reaction (db/schemas/reaction_variations.schema.json),
# with the leading underscore the client's models put on the attributes they wrap.
describe Export::ExportReactionVariations do
  let(:user) { create(:user) }
  let(:collection) { create(:collection, user: user) }
  let(:starting_material) do
    create(:sample, name: 'SM', collections: [collection], real_amount_value: 5.0, real_amount_unit: 'g')
  end
  let(:reaction) do
    create(:reaction, short_label: 'R1', duration: '2 Hour(s)', collections: [collection],
                      temperature: { 'valueUnit' => '°C', 'userText' => '20', 'data' => [] })
  end
  let(:variations) do
    [
      {
        'id' => SecureRandom.uuid, 'idx' => 1, 'group' => [1, 0], 'notes' => 'colder',
        'data' => { 'id' => SecureRandom.uuid, '_temperature' => { 'userText' => '-78' } }
      },
      {
        'id' => SecureRandom.uuid, 'idx' => 2, 'group' => [1, 1], 'notes' => '',
        'data' => {
          'id' => SecureRandom.uuid,
          '_starting_materials' => [{ '_real_amount_value' => 0.042, '_real_amount_unit' => 'g' }],
        }
      },
    ]
  end
  let(:export) { described_class.new(user) }

  def sheets
    file = Tempfile.new(%w[variations .xlsx])
    file.binmode
    file.write(export.read)
    file.close
    book = Roo::Spreadsheet.open(file.path, extension: :xlsx)
    book.sheets.index_with { |name| book.sheet(name).to_a }
  end

  before do
    ReactionsStartingMaterialSample.create!(reaction: reaction, sample: starting_material, position: 0)
    reaction.update_columns(variations: variations) # rubocop:disable Rails/SkipsModelValidations
  end

  it 'writes one row per variation, resolved against the reaction' do
    export.add_reaction(reaction.reload)
    header, first, second = sheets.fetch('R1')

    # Materials are labelled the way the docx report labels them, by molecule name first.
    prefix = "Starting materials / #{starting_material.molecule_name_hash[:label]}"
    expect(header.first(5)).to eq(%w[ID Group Notes Temperature Duration])
    expect(header).to include("#{prefix} / Mass (g)", "#{prefix} / Equivalent")
    expect(first.first(5)).to eq([1, '1.0', 'colder', '-78 °C', '2 Hour(s)'])
    expect(second[3]).to eq('20 °C')

    mass = header.index("#{prefix} / Mass (g)")
    expect(first[mass]).to eq(5.0)
    expect(second[mass]).to eq(0.042)
  end

  it 'skips a reaction without variations' do
    reaction.update_columns(variations: []) # rubocop:disable Rails/SkipsModelValidations
    export.add_reaction(reaction.reload)

    expect(export).to be_empty
  end

  it 'gives every sheet a valid, unique name' do
    other = create(:reaction, short_label: 'R1', collections: [collection])
    other.update_columns(variations: variations) # rubocop:disable Rails/SkipsModelValidations
    reaction.update_columns(short_label: "#{'x' * 40}/R1") # rubocop:disable Rails/SkipsModelValidations

    [reaction, other, create(:reaction, short_label: 'R1', collections: [collection])].each do |r|
      r.update_columns(variations: variations) # rubocop:disable Rails/SkipsModelValidations
      export.add_reaction(r.reload)
    end

    expect(sheets.keys).to eq(['x' * 31, 'R1', 'R1 (2)'])
  end
end
# rubocop:enable RSpec/MultipleExpectations
