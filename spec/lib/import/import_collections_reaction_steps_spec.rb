# frozen_string_literal: true

require 'rails_helper'

RSpec.describe Import::ImportCollections do
  let(:user) { create(:person) }
  let(:collection) { create(:collection, user_id: user.id, label: 'Steps') }
  let(:starting) { create(:sample, created_by: user.id, collections: [collection]) }
  let(:carried) { create(:sample, created_by: user.id, collections: [collection]) }
  let(:final) { create(:sample, created_by: user.id, collections: [collection]) }
  let(:reaction) do
    create(:reaction, collections: [collection], reaction_type: 'multi_step',
                      starting_materials: [starting], products: [carried, final])
  end

  let(:exported_data) do
    export = Export::ExportCollections.new(SecureRandom.uuid, [collection.id], 'zip', false)
    export.prepare_data
    JSON.parse(export.to_json_data)
  end

  let(:import_data) { exported_data }

  let(:imported) do
    importer = described_class.new(nil, user.id)
    importer.instance_variable_set(:@data, import_data)
    importer.import
    Reaction.where.not(id: reaction.id).last
  end

  before do
    first = ReactionStep.create!(reaction: reaction, position: 1, conditions: 'reflux', volume: 0.005)
    second = ReactionStep.create!(reaction: reaction, position: 2, conditions: 'rt')
    reaction.reactions_samples.where(sample_id: [starting.id, carried.id])
            .update_all(reaction_step_id: first.id) # rubocop:disable Rails/SkipsModelValidations
    reaction.reactions_samples.where(sample_id: carried.id).update_all(carry_on: true) # rubocop:disable Rails/SkipsModelValidations
    reaction.reactions_samples.where(sample_id: final.id)
            .update_all(reaction_step_id: second.id) # rubocop:disable Rails/SkipsModelValidations
  end

  it 'keeps the reaction type and steps on import' do
    expect(imported.reaction_type).to eq('multi_step')
    expect(imported.reaction_steps.map { |s| [s.position, s.conditions, s.volume&.to_f] })
      .to eq([[1, 'reflux', 0.005], [2, 'rt', nil]])
  end

  it 'links each material to its imported step and keeps carry-on' do
    first, second = imported.reaction_steps
    links = imported.reactions_samples.map { |rs| [rs.type, rs.reaction_step_id, rs.carry_on] }

    expect(links).to contain_exactly(
      ['ReactionsStartingMaterialSample', first.id, false],
      ['ReactionsProductSample', first.id, true],
      ['ReactionsProductSample', second.id, false],
    )
  end

  context 'with an export made before steps existed' do
    let(:import_data) do
      data = exported_data.except('ReactionStep')
      data['Reaction'].each_value { |fields| fields.delete('reaction_type') }
      data.each do |type, rows|
        rows.each_value { |fields| fields.delete('reaction_step_id') } if type.start_with?('Reactions')
      end
      data
    end

    it 'imports a standard reaction with unlinked materials' do
      expect(imported.reaction_type).to eq('standard')
      expect(imported.reaction_steps).to be_empty
      expect(imported.reactions_samples.map(&:reaction_step_id)).to all(be_nil)
    end
  end
end
