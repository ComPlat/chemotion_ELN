class RegenerateResearchPlanRootContainer < ActiveRecord::Migration
  def change
    ResearchPlan.all.each do |rp|
      rp.create_root_container
    end
  end
end
