class ResearchPlan < ActiveRecord::Base
  acts_as_paranoid
  include ElementUIStateScopes
  include Collectable
  include Taggable

  serialize :description, Hash

  belongs_to :creator, foreign_key: :created_by, class_name: 'User'
  validates :creator, :name, presence: true

  scope :by_name, ->(query) { where('name ILIKE ?', "%#{query}%") }

  has_many :collections_research_plans, inverse_of: :research_plan, dependent: :destroy
  has_many :collections, through: :collections_research_plans
  has_many :attachments, as: :attachable

  before_destroy :delete_attachment

  unless Dir.exists?(path = Rails.root.to_s + '/public/images/research_plans')
    Dir.mkdir path
  end

  def attachments
    Attachment.where(attachable_id: self.id, attachable_type: 'ResearchPlan')
  end

  private
  def delete_attachment
    if Rails.env.production?
      attachments.each { |attachment|
        attachment.delay(run_at: 96.hours.from_now, queue: 'attachment_deletion').destroy!
      }
    else
      attachments.each(&:destroy!)
    end
  end

end
