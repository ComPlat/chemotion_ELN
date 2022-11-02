class AddLogidzeToResearchPlanMetadata < ActiveRecord::Migration[6.1]
  def change
    add_column :research_plan_metadata, :log_data, :jsonb

    reversible do |dir|
      dir.up do
        create_trigger :logidze_on_research_plan_metadata, on: :research_plan_metadata
      end

      dir.down do
        execute <<~SQL
          DROP TRIGGER IF EXISTS "logidze_on_research_plan_metadata" on "research_plan_metadata";
        SQL
      end
    end
  end
end
