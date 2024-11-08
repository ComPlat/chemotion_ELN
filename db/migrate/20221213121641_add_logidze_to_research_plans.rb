class AddLogidzeToResearchPlans < ActiveRecord::Migration[6.1]
  def change
    add_column :research_plans, :log_data, :jsonb

    reversible do |dir|
      dir.up do
        create_trigger :logidze_on_research_plans, on: :research_plans
      end

      dir.down do
        execute <<~SQL
          DROP TRIGGER IF EXISTS "logidze_on_research_plans" on "research_plans";
        SQL
      end
    end
  end
end
