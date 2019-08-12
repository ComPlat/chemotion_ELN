class ResearchPlanTableSchema < ActiveRecord::Base
  acts_as_paranoid

  belongs_to :creator, foreign_key: :created_by, class_name: 'User'
  validates :creator, :name, presence: true

end
