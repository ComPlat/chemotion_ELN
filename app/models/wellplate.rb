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

  has_many :wells, dependent: :destroy
  has_many :samples, through: :wells
  has_many :molecules, through: :samples

  has_many :screens_wellplates, dependent: :destroy
  has_many :screens, through: :screens_wellplates

  has_many :sync_collections_users, through: :collections

  has_one :container, :as => :containable

  accepts_nested_attributes_for :collections_wellplates

  def self.associated_by_user_id_and_screen_ids(user_id, screen_ids)
    for_user(user_id).by_screen_ids(screen_ids)
  end

  def analyses
    self.container ? self.container.analyses : []
  end

  def create_subwellplate user, collection_ids, copy_ea = false
    # Split Wellplate, based on the code from SplitSample
    subwellplate = self.dup
    subwellplate.name = "#{self.name}-Split"
    collections = (
      Collection.where(id: collection_ids) | Collection.where(user_id: user, label: 'All', is_locked: true)
    )
    subwellplate.collections << collections
    subwellplate.container = Container.create_root_container
    subwellplate.save! && subwellplate

    # Split Wells and Samples
    wells = (
      Well.where(wellplate_id: self.id).order('id')
    )
    subwell_ary = Array.new
    wells.each { |w|
      subsample_id = nil;
      if w.sample
        begin
          # Call Sample.create_subsample to perform SampleSplit
          subsample = Sample.find_by(id: w.sample.id).create_subsample user, collection_ids, true
          subsample_id = subsample.id
        end
      end
      subwell = Well.create!(
          wellplate_id: subwellplate.id,
          sample_id: subsample_id,
          readout: w.readout,
          additive: w.additive,
          position_x: w.position_x,
          position_y: w.position_y,
        )
      subwell_ary.push(subwell)
    }
    if subwell_ary.length > 0
      subwellplate.update!(wells: subwell_ary)
    end

    subwellplate
  end
end
