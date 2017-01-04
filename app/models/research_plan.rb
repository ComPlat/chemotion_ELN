class ResearchPlan < ActiveRecord::Base
  acts_as_paranoid
  include ElementUIStateScopes
  include Collectable

  serialize :description, Hash

  belongs_to :creator, foreign_key: :created_by, class_name: 'User'
  validates :creator, :name, presence: true

  scope :by_name, ->(query) { where('name ILIKE ?', "%#{query}%") }

  has_many :collections_research_plans, inverse_of: :research_plan, dependent: :destroy
  has_many :collections, through: :collections_research_plans

  unless Dir.exists?(path = Rails.root.to_s + '/public/images/research_plans')
    Dir.mkdir path
  end
end
