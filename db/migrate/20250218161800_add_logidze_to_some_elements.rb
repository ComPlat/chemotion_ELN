# frozen_string_literal: true

class AddLogidzeToSomeElements < ActiveRecord::Migration[6.1]
  MODELS = %w[
    Sample
    Residue
    ElementalComposition
    Reaction
    ReactionsSample
    ResearchPlan
    ResearchPlansWellplate
    ResearchPlanMetadata
    Screen
    Well
    Wellplate
    Attachment
    Container
  ].freeze

  # AR models might not be fully loaded and table_name is not necessarily available
  # TABLES = MODELS.map(&:constantize).map(&:table_name).map(&:to_sym).freeze

  TABLES = %i[
    samples
    residues
    elemental_compositions
    reactions
    reactions_samples
    research_plans
    research_plans_wellplates
    research_plan_metadata
    screens
    wells
    wellplates
    attachments
    containers
  ].freeze

  def change
    TABLES.each do |table|
      add_column table, :log_data, :jsonb

      reversible do |dir|
        dir.up do
          execute <<~SQL.squish
            SELECT logidze_create_trigger_on_table('#{table}', 'logidze_on_#{table}', 'updated_at');
          SQL

          execute <<~SQL.squish
            UPDATE #{table} as t
            SET log_data = logidze_snapshot(to_jsonb(t), 'updated_at');
          SQL
        end

        dir.down do
          execute "DROP TRIGGER IF EXISTS logidze_on_#{table} on #{table};"
        end
      end
    end
  end
end
