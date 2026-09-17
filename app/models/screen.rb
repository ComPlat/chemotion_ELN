# frozen_string_literal: true

# == Schema Information
#
# Table name: screens
#
#  id                     :integer          not null, primary key
#  description            :string
#  name                   :string
#  result                 :string
#  collaborator           :string
#  conditions             :string
#  requirements           :string
#  created_at             :datetime         not null
#  updated_at             :datetime         not null
#  deleted_at             :datetime
#  component_graph_data   :jsonb
#  plain_text_description :text
#
# Indexes
#
#  index_screens_on_deleted_at  (deleted_at)
#

class Screen < ApplicationRecord
  has_logidze
  acts_as_paranoid
  include ElementUIStateScopes
  include PgSearch::Model
  include Collectable
  include ElementCodes
  include Taggable
  include Labimotion::Segmentable

  serialize :description, Hash

  multisearchable against: [:name, :conditions, :requirements]

  # search related
  pg_search_scope :search_by_screen_name, against: :name
  pg_search_scope :search_by_conditions, against: :conditions
  pg_search_scope :search_by_requirements, against: :requirements
  pg_search_scope :search_by_substring, against: [:name, :conditions, :requirements],
                                        using: {trigram: {threshold:  0.0001}}

  scope :by_name, ->(query) { where('name ILIKE ?', "%#{sanitize_sql_like(query)}%") }
  scope :by_conditions, ->(query) { where('conditions ILIKE ?', "%#{sanitize_sql_like(query)}%") }
  scope :by_requirements, ->(query) { where('requirements ILIKE ?', "%#{sanitize_sql_like(query)}%") }
  scope :by_wellplate_ids, ->(ids) { joins(:wellplates).where('wellplates.id in (?)', ids) }
  scope :includes_for_list_display, -> { includes(:comments) }

  has_many :collections_screens, dependent: :destroy
  has_many :collections, through: :collections_screens

  has_many :attachments, as: :attachable, dependent: :nullify

  has_many :screens_wellplates, dependent: :destroy
  has_many :wellplates, through: :screens_wellplates

  has_many :research_plans_screens, dependent: :destroy
  has_many :research_plans, through: :research_plans_screens

  has_many :comments, as: :commentable, dependent: :destroy

  has_one :container, :as => :containable

  before_save :description_to_plain_text

  accepts_nested_attributes_for :collections_screens

  def analyses
    self.container ? self.container.analyses : []
  end

  def update_body_attachments(original_identifier, copy_identifier)
    remap_richtext_attachment_identifiers(original_identifier, copy_identifier)
    save!
  end

  def remap_richtext_attachment_identifiers(original_identifier, copy_identifier)
    remap_delta_op_identifiers(description, original_identifier, copy_identifier)
  end

  INLINE_BLOT_KEYS = %w[attachment-image attachment-file].freeze

  private

  def remap_delta_op_identifiers(delta, original_identifier, copy_identifier)
    ops = delta.is_a?(Hash) ? delta['ops'] : nil
    return unless ops.is_a?(Array)

    ops.each do |op|
      insert = op.is_a?(Hash) ? op['insert'] : nil
      remap_insert_blots(insert, original_identifier, copy_identifier) if insert.is_a?(Hash)
    end
  end

  def remap_insert_blots(insert, original_identifier, copy_identifier)
    INLINE_BLOT_KEYS.each do |blot_key|
      payload = insert[blot_key]
      next unless payload.is_a?(Hash) && payload['attachment_identifier'] == original_identifier

      payload['attachment_identifier'] = copy_identifier
    end
  end

  def description_to_plain_text
    return unless description_changed?

    self.plain_text_description = Chemotion::QuillToPlainText.convert(description)
  end
end
