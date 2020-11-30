class UpdateResearchPlanDescriptionToHash < ActiveRecord::Migration[4.2]
  class ResearchPlan < ActiveRecord::Base
    serialize :description
  end

  def up
    ResearchPlan.find_each do |rp|
      desc_hash = {
        "ops" => [
          { "insert" => rp.description }
        ]
      }
      rp.update_column(:description, desc_hash)
    end

    ResearchPlan.reset_column_information
  end

  def down
    ResearchPlan.find_each do |rp|
      desc = rp.description["ops"] ? rp.description["ops"]["insert"] : ""
      rp.update_column(:description, desc)
    end

    ResearchPlan.reset_column_information
  end
end
