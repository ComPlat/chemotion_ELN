class AddSearchTextToResearchPlan < ActiveRecord::Migration[6.1]
  def change
    add_column :research_plans, :search_text, :text
  end
end
