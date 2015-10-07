class Sample < ActiveRecord::Base
  include ElementUIStateScopes
  include PgSearch
  include Collectable

  # search related
  pg_search_scope :search_by_sum_formula, associated_against: {
    molecule: :sum_formular
  }

  pg_search_scope :search_by_sample_name, against: :name

  scope :by_name, ->(query) { where('name ILIKE ?', "%#{query}%") }


  has_many :collections_samples
  has_many :collections, through: :collections_samples

  has_many :reactions_starting_material_samples
  has_many :reactions_reactant_samples
  has_many :reactions_product_samples

  has_many :reactions_as_starting_material, through: :reactions_starting_material_samples, source: :reaction
  has_many :reactions_as_reactant, through: :reactions_reactant_samples, source: :reaction
  has_many :reactions_as_product, through: :reactions_product_samples, source: :reaction

  belongs_to :molecule

  has_one :well

  composed_of :amount, mapping: %w(amount_value, amount_unit)

  before_save :auto_set_molfile_to_molecules_molfile
  before_save :find_or_create_molecule_based_on_inchikey

  before_destroy :destroy_associations

  has_ancestry

  validates :purity, :numericality => { :greater_than_or_equal_to => 0.0, :less_than_or_equal_to => 1.0, :allow_nil => true }
  accepts_nested_attributes_for :molecule, update_only: true

  def reactions
    reactions_as_starting_material + reactions_as_reactant + reactions_as_product
  end

  #todo: find_or_create_molecule_based_on_inchikey
  def auto_set_molfile_to_molecules_molfile
    if molecule && molecule.molfile
      self.molfile ||= molecule.molfile
    end
  end

  def find_or_create_molecule_based_on_inchikey
    if molfile
      babel_info = Chemotion::OpenBabelService.molecule_info_from_molfile(molfile)
      inchikey = babel_info[:inchikey]
      unless inchikey.blank?
        unless molecule && molecule.inchikey == inchikey
          self.molecule = Molecule.find_or_create_by_molfile(molfile)
        end
      end
    end
  end

  def destroy_associations
    # WARNING: Using delete_all instead of destroy_all due to PG Error
    # TODO: Check this error and consider another solution
    Well.where(sample_id: id).delete_all
    CollectionsSample.where(sample_id: id).delete_all
    ReactionsProductSample.where(sample_id: id).delete_all
    ReactionsReactantSample.where(sample_id: id).delete_all
    ReactionsStartingMaterialSample.where(sample_id: id).delete_all
  end

end
