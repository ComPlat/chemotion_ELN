class Wellplate < ActiveRecord::Base
  include ElementUIStateScopes
  include PgSearch
  include Collectable

  multisearchable against: :name

  pg_search_scope :search_by_wellplate_name, against: :name

  pg_search_scope :search_by_sample_name, associated_against: {
    samples: :name
  }

  pg_search_scope :search_by_iupac_name, associated_against: {
    molecules: :iupac_name
  }

  pg_search_scope :search_by_substring, against: :name,
                                        associated_against: {
                                          samples: :name,
                                          molecules: :iupac_name
                                        },
                                        using: {trigram: {threshold:  0.0001}}

  scope :by_name, ->(query) { where('name ILIKE ?', "%#{query}%") }
  scope :by_sample_ids, -> (ids) { joins(:samples).where('samples.id in (?)', ids) }
  scope :by_screen_ids, -> (ids) { joins(:screens).where('screens.id in (?)', ids) }

  has_many :collections_wellplates
  has_many :collections, through: :collections_wellplates

  has_many :wells
  has_many :samples, through: :wells
  has_many :molecules, through: :samples

  has_many :screens_wellplates, dependent: :destroy
  has_many :screens, through: :screens_wellplates

  before_destroy :destroy_associations

  def self.associated_by_user_id_and_screen_ids(user_id, screen_ids)
    for_user(user_id).by_screen_ids(screen_ids)
  end

  def destroy_associations
    # WARNING: Using delete_all instead of destroy_all due to PG Error
    # TODO: Check this error and consider another solution
    Well.where(wellplate_id: id).delete_all
    CollectionsWellplate.where(wellplate_id: id).delete_all
  end
end
