# == Schema Information
#
# Table name: research_plans
#
#  id         :integer          not null, primary key
#  name       :string           not null
#  created_by :integer          not null
#  deleted_at :datetime
#  created_at :datetime         not null
#  updated_at :datetime         not null
#  body       :jsonb
#

class ResearchPlan < ApplicationRecord
  acts_as_paranoid
  include ElementUIStateScopes
  include Collectable
  include Taggable
  include Labimotion::Segmentable

  belongs_to :creator, foreign_key: :created_by, class_name: 'User'
  validates :creator, :name, presence: true

  scope :by_name, ->(query) { where('name ILIKE ?', "%#{sanitize_sql_like(query)}%") }
  scope :includes_for_list_display, -> { includes(:attachments) }
  scope :by_sample_ids, lambda { |ids|
    joins('CROSS JOIN jsonb_array_elements(body) AS element')
      .where("(element -> 'value'->> 'sample_id')::INT = ANY(array[?])", ids)
  }
  scope :by_reaction_ids, lambda { |ids|
    joins('CROSS JOIN jsonb_array_elements(body) AS element')
      .where("(element -> 'value'->> 'reaction_id')::INT = ANY(array[?])", ids)
  }
  scope :sample_ids_by_research_plan_ids, lambda { |ids|
    select("(element -> 'value'->> 'sample_id') AS sample_id")
      .joins('CROSS JOIN jsonb_array_elements(body) AS element')
      .where(id: ids)
      .where("(element -> 'value'->> 'sample_id')::INT IS NOT NULL")
  }
  scope :reaction_ids_by_research_plan_ids, lambda { |ids|
    select("(element -> 'value'->> 'reaction_id') AS reaction_id")
      .joins('CROSS JOIN jsonb_array_elements(body) AS element')
      .where(id: ids)
      .where("(element -> 'value'->> 'reaction_id')::INT IS NOT NULL")
  }
  scope :by_literature_ids, ->(ids) { joins(:literals).where(literals: { literature_id: ids }) }

  after_create :create_root_container

  has_one :container, as: :containable
  has_one :research_plan_metadata, dependent: :destroy, foreign_key: :research_plan_id
  has_many :collections_research_plans, inverse_of: :research_plan, dependent: :destroy
  has_many :collections, through: :collections_research_plans
  has_many :attachments, as: :attachable
  has_many :comments, as: :commentable, dependent: :destroy

  has_many :research_plans_wellplates, dependent: :destroy
  has_many :wellplates, through: :research_plans_wellplates

  has_many :research_plans_screens, dependent: :destroy
  has_many :screens, through: :research_plans_screens

  has_many :literals, as: :element, dependent: :destroy
  has_many :literatures, through: :literals

  before_destroy :delete_attachment
  accepts_nested_attributes_for :collections_research_plans

  attr_accessor :can_copy

  unless Dir.exists?(path = Rails.root.to_s + '/public/images/research_plans')
    Dir.mkdir path
  end

  def thumb_svg
    image_atts = attachments.select(&:type_image?)
    attachment = image_atts[0] || attachments[0]
    preview = attachment&.read_thumbnail
    (preview && Base64.encode64(preview)) || 'not available'
  end

  def create_root_container
    if self.container == nil
      self.container = Container.create_root_container
    end
  end

  def analyses
    self.container ? self.container.analyses : Container.none
  end

  def svg_files
    fields = body.select { |field| field['type'] == 'ketcher' }
    svg_files = []
    fields.each do |field|
      svg_files << field['value']['svg_file']
    end

    svg_files
  end

  def update_body_attachments(original_identifier, copy_identifier)
    attach = body&.detect { |x| x['value']['public_name'] == original_identifier }
    if attach.present?
      attach['id'] = SecureRandom.uuid
      attach['value']['public_name'] = copy_identifier
    end

    save!
  end

  private

  def delete_attachment
    if Rails.env.production?
      attachments.each do |attachment|
        attachment.delay(run_at: 96.hours.from_now, queue: 'attachment_deletion').destroy!
      end
    else
      attachments.each(&:destroy!)
    end
  end
end
