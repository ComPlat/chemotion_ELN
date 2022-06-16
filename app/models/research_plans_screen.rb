# == Schema Information
#
# Table name: research_plans_screens
#
#  screen_id        :integer
#  research_plan_id :integer
#  id               :bigint           not null, primary key
#  created_at       :datetime
#  updated_at       :datetime
#  deleted_at       :datetime
#
# Indexes
#
#  index_research_plans_screens_on_research_plan_id  (research_plan_id)
#  index_research_plans_screens_on_screen_id         (screen_id)
#
class ResearchPlansScreen < ApplicationRecord
  acts_as_paranoid
  belongs_to :research_plan
  belongs_to :screen
end
