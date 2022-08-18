class AddToScreenToResearchPlan < ActiveRecord::Migration[5.2]
  def change
    add_reference :research_plans, :screen, index: true, foreign_key: true
  end
end
