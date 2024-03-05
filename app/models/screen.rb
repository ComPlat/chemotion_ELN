# == Schema Information
#
# Table name: screens
#
#  id           :integer          not null, primary key
#  description  :string
#  name         :string
#  result       :string
#  collaborator :string
#  conditions   :string
#  requirements :string
#  created_at   :datetime         not null
#  updated_at   :datetime         not null
#  deleted_at   :datetime
#
# Indexes
#
#  index_screens_on_deleted_at  (deleted_at)
#

class Screen < ApplicationRecord
  acts_as_paranoid
  include ElementUIStateScopes
  include PgSearch
  include Collectable
  include ElementCodes
  include Taggable
  include Segmentable

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

  has_one :container, :as => :containable

  accepts_nested_attributes_for :collections_screens

  def analyses
    self.container ? self.container.analyses : []
  end

end
