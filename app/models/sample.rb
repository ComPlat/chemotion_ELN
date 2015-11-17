class Sample < ActiveRecord::Base
  include ElementUIStateScopes
  include PgSearch
  include Collectable

  multisearchable against: [:name, :iupac_name, :sum_formular]
  delegate :sum_formular, :iupac_name, to: :molecule, allow_nil: true

  # search scopes for exact matching
  pg_search_scope :search_by_sum_formula, associated_against: {
    molecule: :sum_formular
  }

  pg_search_scope :search_by_iupac_name, associated_against: {
    molecule: :iupac_name
  }

  pg_search_scope :search_by_sample_name, against: :name

  # search scope for substrings
  pg_search_scope :search_by_substring, against: :name,
                                        associated_against: {
                                          molecule: [:sum_formular, :iupac_name]
                                        },
                                        using: {trigram: {threshold:  0.0001}}

  # scopes for suggestions
  scope :by_name, ->(query) { where('name ILIKE ?', "%#{query}%") }
  scope :with_reactions, -> {
    sample_ids = ReactionsProductSample.pluck(:sample_id) + ReactionsReactantSample.pluck(:sample_id) + ReactionsStartingMaterialSample.pluck(:sample_id)
    where(id: sample_ids)
  }
  scope :with_wellplates, -> {
    sample_ids = Wellplate.all.flat_map(&:samples).map(&:id)
    where(id: sample_ids)
  }
  scope :by_wellplate_ids,         ->(ids) { joins(:wellplates).where('wellplates.id in (?)', ids) }
  scope :by_reaction_reactant_ids, ->(ids) { joins(:reactions_as_reactant).where('reactions.id in (?)', ids) }
  scope :by_reaction_product_ids,  ->(ids) { joins(:reactions_as_product).where('reactions.id in (?)', ids) }
  scope :by_reaction_material_ids, ->(ids) { joins(:reactions_as_starting_material).where('reactions.id in (?)', ids) }

  has_many :collections_samples, dependent: :destroy
  has_many :collections, through: :collections_samples

  has_many :reactions_starting_material_samples, dependent: :destroy
  has_many :reactions_reactant_samples, dependent: :destroy
  has_many :reactions_product_samples, dependent: :destroy

  has_many :reactions_as_starting_material, through: :reactions_starting_material_samples, source: :reaction
  has_many :reactions_as_reactant, through: :reactions_reactant_samples, source: :reaction
  has_many :reactions_as_product, through: :reactions_product_samples, source: :reaction

  belongs_to :molecule

  has_one :well, dependent: :destroy
  has_many :wellplates, through: :well

  composed_of :amount, mapping: %w(amount_value, amount_unit)

  before_save :auto_set_molfile_to_molecules_molfile
  before_save :find_or_create_molecule_based_on_inchikey

  has_ancestry

  validates :purity, :numericality => { :greater_than_or_equal_to => 0.0, :less_than_or_equal_to => 1.0, :allow_nil => true }
  accepts_nested_attributes_for :molecule, update_only: true

  belongs_to :creator, foreign_key: :created_by, class_name: 'User', counter_cache: :samples_created_count

  before_save :auto_set_short_label

  def auto_set_short_label
    if parent
      parent.reload
      self.short_label ||= "#{parent.short_label}-#{parent.children.count.to_i + 1}"
    elsif creator
      creator.reload
      self.short_label ||= "#{creator.initials}-#{creator.samples_created_count.to_i + 1}"
    elsif
      self.short_label ||= 'NEW'
    end

  end

  def self.associated_by_user_id_and_reaction_ids(user_id, reaction_ids)
    (for_user(user_id).by_reaction_material_ids(reaction_ids) + for_user(user_id).by_reaction_reactant_ids(reaction_ids) + for_user(user_id).by_reaction_product_ids(reaction_ids)).uniq
  end

  def self.associated_by_user_id_and_wellplate_ids(user_id, wellplate_ids)
    for_user(user_id).by_wellplate_ids(wellplate_ids)
  end

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


  # -- fake analyes

  def analyses
    unless analyses_dump.blank?
      JSON.parse(analyses_dump)
    else
      []
    end
  end

  def analyses= analyses
    json_dump = JSON.dump(analyses)
    self.analyses_dump = json_dump
  end

end
