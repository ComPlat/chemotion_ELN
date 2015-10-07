class Screen < ActiveRecord::Base
  include ElementUIStateScopes
  include PgSearch
  include Collectable

  # search related
  pg_search_scope :search_by_screen_name, against: :name

  scope :by_name, ->(query) { where('name ILIKE ?', "%#{query}%") }


  has_many :collections_screens
  has_many :collections, through: :collections_screens

  has_many :wellplates
end
