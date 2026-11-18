# frozen_string_literal: true

require 'rails_helper'

describe Usecases::Reactions::RepairVariationMaterialKeys do
  let(:user) { create(:user) }
  let(:molecule) { create(:molecule) }
  let(:logger) { instance_double(Logger, info: nil, warn: nil) }
  let(:source) { create(:reaction, creator: user) }
  let(:source_sample) { create(:sample, molecule: molecule) }
  let(:copy) { create(:reaction, creator: user, origin: { 'id' => source.id }) }
  let(:copied_sample) { create(:sample, molecule: molecule) }
  let(:uuid) { SecureRandom.uuid }

  def stored_variations(starting_materials)
    { uuid => { 'id' => 1, 'uuid' => uuid, 'startingMaterials' => starting_materials, 'reactants' => {},
                'products' => {}, 'solvents' => {} } }
  end

  def entry(mass)
    { 'mass' => { 'value' => mass, 'unit' => 'g' } }
  end

  before do
    ReactionsStartingMaterialSample.create!(reaction: source, sample: source_sample, position: 0)
    ReactionsStartingMaterialSample.create!(reaction: copy, sample: copied_sample, position: 0)
    # A copy persisted with the source reaction's keys, as a failed create left it.
    copy.update_column(:variations, stored_variations(source_sample.id.to_s => entry(1))) # rubocop:disable Rails/SkipsModelValidations
  end

  it 'only reports in a dry run' do
    result = described_class.new(apply: false, logger: logger).execute!

    expect(result.repaired).to eq([copy.id])
    expect(copy.reload[:variations]).to eq(stored_variations(source_sample.id.to_s => entry(1)))
  end

  it 'remaps the copy and keeps the stored format' do
    described_class.new(apply: true, logger: logger).execute!

    expect(copy.reload[:variations]).to eq(stored_variations(copied_sample.id.to_s => entry(1)))
  end

  it 'is idempotent' do
    described_class.new(apply: true, logger: logger).execute!

    expect(described_class.new(apply: true, logger: logger).execute!.repaired).to eq([])
  end

  it 'logs a reaction that fails and carries on' do
    broken = create(:reaction, creator: user)
    broken.update_column(:variations, stored_variations('1' => entry(1))) # rubocop:disable Rails/SkipsModelValidations
    allow_any_instance_of(Reaction).to receive(:reconcile_variation_material_keys).and_wrap_original do |original, **kw| # rubocop:disable RSpec/AnyInstance
      raise ArgumentError, 'malformed' if original.receiver.id == broken.id

      original.call(**kw)
    end

    result = described_class.new(apply: true, logger: logger).execute!

    expect(result.failed).to eq([broken.id])
    expect(copy.reload[:variations]).to eq(stored_variations(copied_sample.id.to_s => entry(1)))
    expect(logger).to have_received(:warn).with(/Reaction #{broken.id}: variations not repaired/)
  end
end
