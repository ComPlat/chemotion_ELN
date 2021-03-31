class AddToScreenToResearchPlan < ActiveRecord::Migration
  def change
    add_reference :research_plans, :screen, index: true, foreign_key: true
  end
end
