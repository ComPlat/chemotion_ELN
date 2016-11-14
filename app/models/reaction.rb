class Reaction < ActiveRecord::Base
  acts_as_paranoid
  include ElementUIStateScopes
  include PgSearch
  include Collectable

  serialize :temperature, Hash
  serialize :description, Hash

  multisearchable against: :name

  # search scopes for exact matching
  pg_search_scope :search_by_reaction_name, against: :name

  pg_search_scope :search_by_sample_name, associated_against: {
    starting_materials: :name,
    reactants: :name,
    solvents: :name,
    products: :name
  }

  pg_search_scope :search_by_iupac_name, associated_against: {
    starting_material_molecules: :iupac_name,
    reactant_molecules: :iupac_name,
    solvent_molecules: :iupac_name,
    product_molecules: :iupac_name
  }

  pg_search_scope :search_by_inchistring, associated_against: {
    starting_material_molecules: :inchistring,
    reactant_molecules: :inchistring,
    solvent_molecules: :inchistring,
    product_molecules: :inchistring
  }

  pg_search_scope :search_by_cano_smiles, associated_against: {
    starting_material_molecules: :cano_smiles,
    reactant_molecules: :cano_smiles,
    solvent_molecules: :cano_smiles,
    product_molecules: :cano_smiles
  }

  pg_search_scope :search_by_substring, against: :name,
                                        associated_against: {
                                          starting_materials: :name,
                                          reactants: :name,
                                          solvents: :name,
                                          products: :name,
                                          starting_material_molecules: :iupac_name,
                                          reactant_molecules: :iupac_name,
                                          solvent_molecules: :iupac_name,
                                          product_molecules: :iupac_name
                                        },
                                        using: {trigram: {threshold:  0.0001}}

  # scopes for suggestions
  scope :by_name, ->(query) { where('name ILIKE ?', "%#{query}%") }
  scope :by_material_ids, ->(ids) { joins(:starting_materials).where('samples.id IN (?)', ids) }
  scope :by_solvent_ids, ->(ids) { joins(:solvents).where('samples.id IN (?)', ids) }
  scope :by_reactant_ids, ->(ids) { joins(:reactants).where('samples.id IN (?)', ids) }
  scope :by_product_ids,  ->(ids) { joins(:products).where('samples.id IN (?)', ids) }

  has_many :collections_reactions, dependent: :destroy
  has_many :collections, through: :collections_reactions

  has_many :reactions_starting_material_samples, dependent: :destroy
  has_many :starting_materials, through: :reactions_starting_material_samples, source: :sample
  has_many :starting_material_molecules, through: :starting_materials, source: :molecule

  has_many :reactions_solvent_samples, dependent: :destroy
  has_many :solvents, through: :reactions_solvent_samples, source: :sample
  has_many :solvent_molecules, through: :solvents, source: :molecule

  has_many :reactions_reactant_samples, dependent: :destroy
  has_many :reactants, through: :reactions_reactant_samples, source: :sample
  has_many :reactant_molecules, through: :reactants, source: :molecule

  has_many :reactions_product_samples, dependent: :destroy
  has_many :products, through: :reactions_product_samples, source: :sample
  has_many :product_molecules, through: :products, source: :molecule

  has_many :literatures, dependent: :destroy

  has_many :sync_collections_users, through: :collections

  belongs_to :creator, foreign_key: :created_by, class_name: 'User'
  validates :creator, presence: true

  before_save :update_svg_file!
  before_save :cleanup_array_fields
  before_save :auto_format_temperature!
  before_create :auto_set_short_label

  after_create :update_counter

  has_one :container, :as => :element

  def self.get_associated_samples(reaction_ids)
    ( ReactionsProductSample.get_samples(reaction_ids) +
      ReactionsStartingMaterialSample.get_samples(reaction_ids) +
      ReactionsReactantSample.get_samples(reaction_ids)
    ).compact
  end

  def samples
    starting_materials + reactants + products + solvents
  end

  def auto_format_temperature!
    valueUnitCheck = (temperature["valueUnit"] =~ /^(°C|°F|K)$/).present?
    temperature["valueUnit"] = "°C" if (!valueUnitCheck)

    temperature["data"].each do |t|
      valid_time = (t["time"] =~ /^((?:\d\d):[0-5]\d:[0-5]\d$)/i).present?
      t["time"] = "00:00:00" if (!valid_time)
      t["value"] = t["value"].gsub(/[^0-9.-]/, '')
    end
  end

  def temperature_display
    userText = temperature["userText"]
    return userText if (userText != "")

    return "" if (temperature["data"].length == 0)

    arrayData = temperature["data"]
    maxTemp = (arrayData.max_by { |x| x["value"] })["value"]
    minTemp = (arrayData.min_by { |x| x["value"] })["value"]

    return ""  if (minTemp == nil || maxTemp == nil)
    return minTemp + " ~ " + maxTemp
  end

  def temperature_display_with_unit
    tp = temperature_display
    tp.length != 0 ? tp + " " + temperature["valueUnit"] : ""
  end

  def description_contents
    return description["ops"].map{|s| s["insert"]}.join()
  end

  def update_svg_file!
    paths = {}
    %i(starting_materials reactants products).each do |prop|
      d = self.send(prop).includes(:molecule)
      paths[prop]= d.pluck(:id, :sample_svg_file, :'molecules.molecule_svg_file').map do |item|
        prop == :products ? [svg_path(item[1], item[2]), yield_amount(item[0])] : svg_path(item[1], item[2])
      end
    end

    begin
      composer = SVG::ReactionComposer.new(paths, temperature: temperature_display_with_unit,
                                                  solvents: solvents_in_svg)
      self.reaction_svg_file = composer.compose_reaction_svg_and_save
    rescue Exception => e
      Rails.logger.info("**** SVG::ReactionComposer failed ***")
    end
  end

  def svg_path(sample_svg, molecule_svg)
    sample_svg.present? ? "/images/samples/#{sample_svg}" : "/images/molecules/#{molecule_svg}"
  end

  def yield_amount(sample_id)
    ReactionsProductSample.find_by(reaction_id: self.id, sample_id: sample_id).try(:equivalent)
  end

  def solvents_in_svg
    names = solvents.map{ |s| s.preferred_tag }
    return names && names.length > 0 ? names : [solvent]
  end

  def cleanup_array_fields
    self.dangerous_products = dangerous_products.reject(&:blank?)
    self.purification = purification.reject(&:blank?)
  end

  def auto_set_short_label
    prefix = creator.reaction_name_prefix
    counter = creator.counters['reactions'].succ
    self.short_label = "#{creator.initials}-#{prefix}#{counter}"
  end

  def update_counter
    self.creator.increment_counter 'reactions'
  end
end
