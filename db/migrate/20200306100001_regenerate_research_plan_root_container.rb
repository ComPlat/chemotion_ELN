class RegenerateResearchPlanRootContainer < ActiveRecord::Migration[4.2]
  def change
    ResearchPlan.all.each do |rp|
      rp.create_root_container
    end
  end
end
