# == Schema Information
#
# Table name: research_plans_wellplates
#
#  research_plan_id :bigint           not null
#  wellplate_id     :bigint           not null
#  id               :bigint           not null, primary key
#  created_at       :datetime
#  updated_at       :datetime
#  deleted_at       :datetime
#  log_data         :jsonb
#
# Indexes
#
#  index_research_plans_wellplates_on_research_plan_id  (research_plan_id)
#  index_research_plans_wellplates_on_wellplate_id      (wellplate_id)
#

# frozen_string_literal: true

class ResearchPlansWellplate < ApplicationRecord
  acts_as_paranoid
  belongs_to :research_plan
  belongs_to :wellplate

  scope :get_wellplates, lambda { |research_plan_ids|
    where(research_plan_id: research_plan_ids)
      .pluck(:wellplate_id).compact.uniq
  }

  scope :get_research_plans, lambda { |wellplate_ids|
    where(wellplate_id: wellplate_ids)
      .pluck(:research_plan_id).compact.uniq
  }
end
