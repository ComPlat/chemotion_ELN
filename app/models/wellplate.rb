class Wellplate < ActiveRecord::Base
  acts_as_paranoid
  include ElementUIStateScopes
  include PgSearch
  include Collectable
  include ElementCodes
  include Taggable

  serialize :description, Hash

  multisearchable against: :name

  pg_search_scope :search_by_wellplate_name, against: :name

  pg_search_scope :search_by_sample_name, associated_against: {
    samples: :name
  }

  pg_search_scope :search_by_iupac_name, associated_against: {
    molecules: :iupac_name
  }

  pg_search_scope :search_by_inchistring, associated_against: {
    molecules: :inchistring
  }

  pg_search_scope :search_by_cano_smiles, associated_against: {
    molecules: :cano_smiles
  }

  pg_search_scope :search_by_substring, against: :name,
                                        associated_against: {
                                          samples: :name,
                                          molecules: [
                                            :iupac_name,
                                            :inchistring,
                                            :cano_smiles
                                          ]
                                        },
                                        using: {trigram: {threshold:  0.0001}}

  scope :by_name, ->(query) { where('name ILIKE ?', "%#{query}%") }
  scope :by_sample_ids, -> (ids) { joins(:samples).where('samples.id in (?)', ids) }
  scope :by_screen_ids, -> (ids) { joins(:screens).where('screens.id in (?)', ids) }

  has_many :collections_wellplates, dependent: :destroy
  has_many :collections, through: :collections_wellplates

  has_many :wells
  has_many :samples, through: :wells
  has_many :molecules, through: :samples

  has_many :screens_wellplates, dependent: :destroy
  has_many :screens, through: :screens_wellplates

  has_many :sync_collections_users, through: :collections

  has_one :container, :as => :containable

  def self.associated_by_user_id_and_screen_ids(user_id, screen_ids)
    for_user(user_id).by_screen_ids(screen_ids)
  end
  
  def analyses
    self.container ? self.container.analyses : []
  end

end
