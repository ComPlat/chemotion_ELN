class Screen < ActiveRecord::Base
  include ElementUIStateScopes
  include PgSearch
  include Collectable

  multisearchable against: [:name, :conditions, :requirements]

  # search related
  pg_search_scope :search_by_screen_name, against: :name
  pg_search_scope :search_by_conditions, against: :conditions
  pg_search_scope :search_by_requirements, against: :requirements
  pg_search_scope :search_by_substring, against: [:name, :conditions, :requirements],
                                        using: {trigram: {threshold:  0.0001}}

  scope :by_name, ->(query) { where('name ILIKE ?', "%#{query}%") }
  scope :by_conditions, ->(query) { where('conditions ILIKE ?', "%#{query}%") }
  scope :by_requirements, ->(query) { where('requirements ILIKE ?', "%#{query}%") }
  scope :by_wellplate_ids, ->(ids) { joins(:wellplates).where('wellplates.id in (?)', ids) }

  has_many :collections_screens
  has_many :collections, through: :collections_screens

  has_many :screens_wellplates, dependent: :destroy
  has_many :wellplates, through: :screens_wellplates
end
