# frozen_string_literal: true

class AddLogidzeToSomeElements < ActiveRecord::Migration[6.1]
  MODELS = [
    Sample,
    Residue,
    ElementalComposition,
    ReactionsSample,
    Reaction,
    ResearchPlan,
    ResearchPlanMetadata,
    Screen,
    Well,
    Wellplate,
    Attachment,
    Container,
  ].freeze

  def change
    MODELS.map(&:table_name).map(&:to_sym).each do |table|
      add_column table, :log_data, :jsonb

      reversible do |dir|
        dir.up do
          create_trigger "logidze_on_#{table}", on: table
        end

        dir.down do
          execute "DROP TRIGGER IF EXISTS logidze_on_#{table} on #{table};"
        end
      end

      reversible do |dir|
        dir.up do
          execute <<~SQL.squish
            UPDATE #{table} as t
            SET log_data = logidze_snapshot(to_jsonb(t), 'updated_at');
          SQL
        end
      end
    end
  end
end
