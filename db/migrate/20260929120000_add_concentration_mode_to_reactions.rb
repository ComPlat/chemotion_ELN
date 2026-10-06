# frozen_string_literal: true

class AddConcentrationModeToReactions < ActiveRecord::Migration[6.1]
  def up
    add_column :reactions, :concentration_mode, :string, default: 'solvents_only', null: false

    # Preserve explicit "use the entered reaction volume" choices. All other
    # rows keep the solvents-only default so historical concentrations are
    # restored.
    return unless column_exists?(:reactions, :use_reaction_volume)

    execute <<~SQL.squish
      UPDATE reactions
      SET concentration_mode = 'reaction_volume'
      WHERE use_reaction_volume = TRUE
    SQL

    # Keep the legacy column for one compatibility release. A later migration
    # can drop it after all consumers have moved to concentration_mode.
  end

  def down
    remove_column :reactions, :concentration_mode
  end
end
