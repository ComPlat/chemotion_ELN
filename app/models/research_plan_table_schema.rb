# == Schema Information
#
# Table name: research_plan_table_schemas
#
#  id         :integer          not null, primary key
#  name       :string
#  value      :jsonb
#  created_by :integer          not null
#  deleted_at :datetime
#  created_at :datetime         not null
#  updated_at :datetime         not null
#

class ResearchPlanTableSchema < ApplicationRecord
  acts_as_paranoid

  belongs_to :creator, foreign_key: :created_by, class_name: 'User'
  validates :creator, :name, presence: true

end
