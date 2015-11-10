class Reaction < ActiveRecord::Base
  include ElementUIStateScopes
  include PgSearch
  include Collectable

  multisearchable against: :name

  # search scopes for exact matching
  pg_search_scope :search_by_reaction_name, against: :name

  pg_search_scope :search_by_sample_name, associated_against: {
    starting_materials: :name,
    reactants: :name,
    products: :name
  }

  pg_search_scope :search_by_iupac_name, associated_against: {
    starting_material_molecules: :iupac_name,
    reactant_molecules: :iupac_name,
    product_molecules: :iupac_name
  }

  pg_search_scope :search_by_substring, against: :name,
                                        associated_against: {
                                          starting_materials: :name,
                                          reactants: :name,
                                          products: :name,
                                          starting_material_molecules: :iupac_name,
                                          reactant_molecules: :iupac_name,
                                          product_molecules: :iupac_name
                                        },
                                        using: {trigram: {threshold:  0.0001}}

  # scopes for suggestions
  scope :by_name, ->(query) { where('name ILIKE ?', "%#{query}%") }
  scope :by_material_ids, ->(ids) { joins(:starting_materials).where('samples.id IN (?)', ids) }
  scope :by_reactant_ids, ->(ids) { joins(:reactants).where('samples.id IN (?)', ids) }
  scope :by_product_ids,  ->(ids) { joins(:products).where('samples.id IN (?)', ids) }

  has_many :collections_reactions, dependent: :destroy
  has_many :collections, through: :collections_reactions

  has_many :reactions_starting_material_samples, dependent: :destroy
  has_many :starting_materials, through: :reactions_starting_material_samples, source: :sample
  has_many :starting_material_molecules, through: :starting_materials, source: :molecule

  has_many :reactions_reactant_samples, dependent: :destroy
  has_many :reactants, through: :reactions_reactant_samples, source: :sample
  has_many :reactant_molecules, through: :reactants, source: :molecule

  has_many :reactions_product_samples, dependent: :destroy
  has_many :products, through: :reactions_product_samples, source: :sample
  has_many :product_molecules, through: :products, source: :molecule

  has_many :literatures, dependent: :destroy

  before_save :update_svg_file!
  before_save :cleanup_array_fields
  before_save :auto_format_temperature!

  def samples
    starting_materials + reactants + products
  end

  def auto_format_temperature!
    valid_input = (temperature =~ /^-?\s*\d*(.\d+)?\s*°?\s*[c|f|k]?\s*$/i).present?
    if (valid_input)
      sign   = (temperature =~ /^-/).present? ? "-" : ""
      number = temperature[ /\d+(.\d+)?/ ].to_f
      unit   = (temperature[ /[c|f|k]/i ] || "C").upcase
      self.temperature = "#{sign}#{number}°#{unit}"
    else
      self.temperature = "0°C"
    end
  end

  def update_svg_file!
    inchikeys = {}
    inchikeys[:starting_materials] = starting_materials.includes(:molecule).pluck(:'molecules.inchikey')
    inchikeys[:reactants] = reactants.includes(:molecule).pluck(:'molecules.inchikey')
    inchikeys[:products] = products.includes(:molecule).pluck(:'molecules.inchikey')
    label = [solvent, temperature].compact.join(', ')
    begin
      composer = SVG::ReactionComposer.new(inchikeys, label: label)
      self.reaction_svg_file = composer.compose_reaction_svg_and_save
    rescue Exception => e
      Rails.logger.info("**** SVG::ReactionComposer failed ***")
    end
  end

  def cleanup_array_fields
    self.dangerous_products = dangerous_products.reject(&:blank?)
    self.purification = purification.reject(&:blank?)
  end

end
