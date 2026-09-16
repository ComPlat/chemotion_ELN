# frozen_string_literal: true

# Environmental conditions recorded alongside the reaction scheme: temperature (with a
# selectable unit), relative humidity, and air pressure. Stored as a single jsonb column
# (like vessel_size) so each value keeps its unit together and the shape can grow without
# further migrations.
class AddEnvironmentToReactions < ActiveRecord::Migration[6.1]
  DEFAULT = {
    'temperature' => { 'value' => '', 'unit' => '°C' },
    'humidity' => { 'value' => '', 'unit' => '%' },
    'air_pressure' => { 'value' => '', 'unit' => 'mbar' }
  }.freeze

  def change
    add_column :reactions, :environment, :jsonb, default: DEFAULT
  end
end
