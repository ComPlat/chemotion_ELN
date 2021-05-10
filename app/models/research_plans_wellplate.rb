# == Schema Information
#
# Table name: research_plans_wellplates
#
#  research_plan_id :integer
#  wellplate_id     :integer
#  id               :bigint           not null, primary key
#  created_at       :datetime
#  updated_at       :datetime
#  deleted_at       :datetime
#
# Indexes
#
#  index_research_plans_wellplates_on_research_plan_id  (research_plan_id)
#  index_research_plans_wellplates_on_wellplate_id      (wellplate_id)
#

class ResearchPlansWellplate < ApplicationRecord
  acts_as_paranoid
  belongs_to :research_plan
  belongs_to :wellplate

  def self.get_wellplates research_plan_ids
    self.where(research_plan_id: research_plan_ids).pluck(:wellplate_id).compact.uniq
  end

end
