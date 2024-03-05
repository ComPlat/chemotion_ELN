# frozen_string_literal: true

# == Schema Information
#
# Table name: elements
#
#  id               :integer          not null, primary key
#  name             :string
#  element_klass_id :integer
#  properties       :jsonb
#  created_by       :integer
#  created_at       :datetime
#  updated_at       :datetime
#  deleted_at       :datetime
#  short_label      :string
#  uuid             :string
#  klass_uuid       :string
#

# Generic Element
class Element < ApplicationRecord
  acts_as_paranoid
  include PgSearch
  include ElementUIStateScopes
  include Collectable
  include AnalysisCodes
  include Taggable
  include Segmentable
  include GenericRevisions

  multisearchable against: %i[name short_label]

  pg_search_scope :search_by_substring, against: %i[name short_label], using: { trigram: { threshold: 0.0001 } }

  attr_accessor :can_copy

  scope :by_name, ->(query) { where('name ILIKE ?', "%#{sanitize_sql_like(query)}%") }
  scope :by_short_label, ->(query) { where('short_label ILIKE ?', "%#{sanitize_sql_like(query)}%") }
  scope :by_klass_id_short_label, ->(klass_id, short_label) { where('element_klass_id = ? and short_label ILIKE ?', klass_id, "%#{sanitize_sql_like(short_label)}%") }
  scope :by_sample_ids, ->(ids) { joins(:elements_samples).where('sample_id IN (?)', ids) }
  scope :by_klass_id, ->(klass_id) { where('element_klass_id = ? ', klass_id) }

  belongs_to :element_klass

  has_many :collections_elements,  inverse_of: :element, dependent: :destroy
  has_many :collections, through: :collections_elements
  has_many :attachments, as: :attachable
  has_many :elements_samples, dependent: :destroy
  has_many :samples, through: :elements_samples, source: :sample
  has_one :container, :as => :containable
  has_many :elements_revisions, dependent: :destroy

  accepts_nested_attributes_for :collections_elements

  belongs_to :creator, foreign_key: :created_by, class_name: 'User'
  validates :creator, presence: true

  before_create :auto_set_short_label
  after_create :update_counter
  before_destroy :delete_attachment

  def attachments
    Attachment.where(attachable_id: self.id, attachable_type: 'Element')
  end


  def self.get_associated_samples(element_ids)
    ElementsSample.where(element_id: element_ids).pluck(:sample_id)
  end

  def analyses
    container ? container.analyses : []
  end

  def auto_set_short_label
    prefix = element_klass.klass_prefix
    if creator.counters[element_klass.name].nil?
      creator.counters[element_klass.name] = '0'
      creator.update_columns(counters: creator.counters)
      creator.reload
    end
    counter = creator.counters[element_klass.name].to_i.succ
    self.short_label = "#{creator.initials}-#{prefix}#{counter}"
  end

  def update_counter
    creator.increment_counter element_klass.name
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
