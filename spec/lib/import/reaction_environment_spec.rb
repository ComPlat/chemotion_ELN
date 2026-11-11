# frozen_string_literal: true

require 'rails_helper'

RSpec.describe 'Reaction environment imports' do # rubocop:disable RSpec/DescribeClass
  let(:user) { create(:person) }
  let(:uuid) { SecureRandom.uuid }
  let(:importer) { Import::ImportCollections.new(nil, user.id) }

  after do
    FileUtils.remove_entry(importer.instance_variable_get(:@tmp_dir))
  end

  def import_environment(environment)
    importer.instance_variable_set(:@data, 'Reaction' => {
                                     uuid => { 'environment' => environment, 'reaction_svg_file' => '' },
                                   })
    importer.send(:import_reactions)
    importer.instance_variable_get(:@instances).fetch('Reaction').fetch(uuid)
  end

  it 'normalizes imported decimal commas without interpreting unit labels' do
    reaction = import_environment(
      'temperature' => { 'value' => '-4,5', 'unit' => 'degF' },
      'humidity' => { 'value' => '45,5', 'unit' => '%' },
      'air_pressure' => { 'value' => '14,7', 'unit' => 'mPa' },
    )

    expect(reaction.reload.environment).to eq(
      'temperature' => { 'value' => '-4.5', 'unit' => 'degF' },
      'humidity' => { 'value' => '45.5', 'unit' => '%' },
      'air_pressure' => { 'value' => '14.7', 'unit' => 'mPa' },
    )
  end

  %w[hot 20-22].each do |value|
    it "rejects a new imported nonnumeric reading #{value}" do
      count = Reaction.count

      expect do
        import_environment('temperature' => { 'value' => value, 'unit' => '°C' })
      end.to raise_error(ActiveRecord::RecordInvalid, /environment/i)
      expect(Reaction.count).to eq count
    end
  end

  it 'fills missing readings and units on imported partial environments' do
    reaction = import_environment('temperature' => { 'value' => '20' })

    expect(reaction.reload.environment).to eq(
      Reaction.column_defaults.fetch('environment').deep_merge('temperature' => { 'value' => '20' }),
    )
  end
end
