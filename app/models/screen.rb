# == Schema Information
#
# Table name: screens
#
#  id                     :integer          not null, primary key
#  collaborator           :string
#  component_graph_data   :jsonb
#  conditions             :string
#  deleted_at             :datetime
#  description            :string
#  name                   :string
#  plain_text_description :text
#  requirements           :string
#  result                 :string
#  created_at             :datetime         not null
#  updated_at             :datetime         not null
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

  has_many :collections_screens, dependent: :destroy
  has_many :collections, through: :collections_screens
  has_many :sync_collections_users, through: :collections

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

  private

  def description_to_plain_text
    return unless description_changed?

    self.plain_text_description = Chemotion::QuillToPlainText.convert(description)
  end
end
