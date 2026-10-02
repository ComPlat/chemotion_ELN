# frozen_string_literal: true

require 'rails_helper'

RSpec.describe 'Imported reaction concentration settings' do
  let(:user) { create(:person) }
  let(:collection) { create(:collection, user: user) }
  let(:uuid) { SecureRandom.uuid }

  shared_examples 'preserves concentration settings' do
    [
      [{ 'use_reaction_volume' => true }, 'reaction_volume'],
      [{ 'use_reaction_volume' => false }, 'solvents_only'],
      [{}, 'solvents_only'],
      [{ 'concentration_mode' => 'combined', 'use_reaction_volume' => true }, 'combined'],
      [{ 'concentration_mode' => 'reaction_volume', 'use_reaction_volume' => false }, 'reaction_volume'],
      [{ 'concentration_mode' => 'solvents_only', 'use_reaction_volume' => true }, 'solvents_only'],
    ].each do |settings, expected_mode|
      it "imports #{settings.inspect} as #{expected_mode}" do
        reaction = import_reaction(settings.merge('volume' => 12.3456))

        expect(reaction.reload.concentration_mode).to eq(expected_mode)
        expect(reaction[:use_reaction_volume]).to eq(expected_mode == 'reaction_volume')
        expect(reaction.volume).to eq(BigDecimal('12.3456'))
      end
    end
  end

  context 'through the gate JSON importer' do
    def import_reaction(settings)
      importer = Import::ImportJson.new(
        data: { 'reactions' => { uuid => settings.merge('uuid' => uuid) } },
        user_id: user.id,
        collection_id: collection.id,
      )
      importer.import
      Reaction.find(importer.new_data.fetch(uuid).fetch('id'))
    end

    include_examples 'preserves concentration settings'
  end

  context 'through the collection ZIP reaction importer' do
    let(:importer) { Import::ImportCollections.new(nil, user.id) }

    after do
      FileUtils.remove_entry(importer.instance_variable_get(:@tmp_dir))
    end

    def import_reaction(settings)
      importer.instance_variable_set(:@data, {
        'Reaction' => { uuid => settings.merge('reaction_svg_file' => '') },
      })
      importer.send(:import_reactions)
      importer.instance_variable_get(:@instances).fetch('Reaction').fetch(uuid)
    end

    include_examples 'preserves concentration settings'

    %w[combined reaction_volume].each do |mode|
      it "retains #{mode} and volume from exported reaction attributes" do
        source = create(:reaction, created_by: user.id, concentration_mode: mode, volume: 9.8765)

        reaction = import_reaction(source.as_json)

        expect(reaction.reload.concentration_mode).to eq(mode)
        expect(reaction.volume).to eq(source.volume)
      end
    end
  end
end
