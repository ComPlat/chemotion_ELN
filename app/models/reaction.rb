# frozen_string_literal: true

# == Schema Information
#
# Table name: reactions
#
#  id                 :integer          not null, primary key
#  name               :string
#  created_at         :datetime         not null
#  updated_at         :datetime         not null
#  description        :text
#  timestamp_start    :string
#  timestamp_stop     :string
#  observation        :text
#  purification       :string           default([]), is an Array
#  dangerous_products :string           default([]), is an Array
#  tlc_solvents       :string
#  tlc_description    :text
#  rf_value           :string
#  temperature        :jsonb
#  status             :string
#  reaction_svg_file  :string
#  solvent            :string
#  deleted_at         :datetime
#  short_label        :string
#  created_by         :integer
#  role               :string
#  origin             :jsonb
#  rinchi_string      :text
#  rinchi_long_key    :text
#  rinchi_short_key   :string
#  rinchi_web_key     :string
#  duration           :string
#  rxno               :string
#
# Indexes
#
#  index_reactions_on_deleted_at      (deleted_at)
#  index_reactions_on_rinchi_web_key  (rinchi_web_key)
#  index_reactions_on_role            (role)
#


class Reaction < ActiveRecord::Base
  acts_as_paranoid
  include ElementUIStateScopes
  include PgSearch
  include Collectable
  include ElementCodes
  include Taggable
  include ReactionRinchi

  serialize :description, Hash
  serialize :observation, Hash

  multisearchable against: :name
  multisearchable against: :short_label

  # search scopes for exact matching
  pg_search_scope :search_by_reaction_name, against: :name
  pg_search_scope :search_by_reaction_short_label, against: :short_label

  pg_search_scope :search_by_sample_name, associated_against: {
    samples: :name
  }

  pg_search_scope :search_by_iupac_name, associated_against: {
    sample_molecules: :iupac_name
  }

  pg_search_scope :search_by_inchistring, associated_against: {
    sample_molecules: :inchistring
  }

  pg_search_scope :search_by_cano_smiles, associated_against: {
    sample_molecules: :cano_smiles
  }

  pg_search_scope :search_by_substring, against: :name, associated_against: {
    samples: :name,
    sample_molecules: :iupac_name
  }, using: { trigram: { threshold:  0.0001 } }

  # scopes for suggestions
  scope :by_name, ->(query) { where('name ILIKE ?', "%#{sanitize_sql_like(query)}%") }
  scope :by_short_label, ->(query) { where('short_label ILIKE ?', "%#{sanitize_sql_like(query)}%") }
  scope :by_material_ids, ->(ids) { joins(:starting_materials).where('samples.id IN (?)', ids) }
  scope :by_solvent_ids, ->(ids) { joins(:solvents).where('samples.id IN (?)', ids) }
  scope :by_reactant_ids, ->(ids) { joins(:reactants).where('samples.id IN (?)', ids) }
  scope :by_product_ids,  ->(ids) { joins(:products).where('samples.id IN (?)', ids) }
  scope :by_sample_ids,  ->(ids) { joins(:reactions_samples).where('samples.id IN (?)', ids) }
  scope :by_status,  ->(query) { where('reactions.status ILIKE ?', "%#{sanitize_sql_like(query)}%") }
  scope :search_by_reaction_status, ->(query) { where(status: query) }

  has_many :collections_reactions, dependent: :destroy
  has_many :collections, through: :collections_reactions
  accepts_nested_attributes_for :collections_reactions

  has_many :reactions_samples, dependent: :destroy
  has_many :samples, through: :reactions_samples, source: :sample
  has_many :sample_molecules, through: :samples, source: :molecule

  has_many :reactions_starting_material_samples, -> { order(position: :asc) }, dependent: :destroy
  has_many :starting_materials, through: :reactions_starting_material_samples, source: :sample
  has_many :starting_material_molecules, through: :starting_materials, source: :molecule

  has_many :reactions_solvent_samples, -> { order(position: :asc) }, dependent: :destroy
  has_many :solvents, through: :reactions_solvent_samples, source: :sample
  has_many :solvent_molecules, through: :solvents, source: :molecule

  has_many :reactions_purification_solvent_samples, -> { order(position: :asc) },
           dependent: :destroy
  has_many :purification_solvents,
           through: :reactions_purification_solvent_samples,
           source: :sample
  has_many :purification_solvents_molecules,
           through: :reactions_purification_solvent_samples,
           source: :sample

  has_many :reactions_reactant_samples, -> { order(position: :asc) }, dependent: :destroy
  has_many :reactants, through: :reactions_reactant_samples, source: :sample
  has_many :reactant_molecules, through: :reactants, source: :molecule

  has_many :reactions_product_samples, -> { order(position: :asc) }, dependent: :destroy
  has_many :products, through: :reactions_product_samples, source: :sample
  has_many :product_molecules, through: :products, source: :molecule

  has_many :literals, as: :element, dependent: :destroy
  has_many :literatures, through: :literals

  has_many :sync_collections_users, through: :collections

  belongs_to :creator, foreign_key: :created_by, class_name: 'User'
  validates :creator, presence: true

  before_save :update_svg_file!
  before_save :cleanup_array_fields
  before_save :auto_format_temperature!
  before_create :auto_set_short_label

  after_create :update_counter

  has_one :container, :as => :containable

  def self.get_associated_samples(reaction_ids)
    ReactionsSample.where(reaction_id: reaction_ids).pluck(:sample_id)
  end

  def analyses
    self.container ? self.container.analyses : []
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

  def observation_contents
    return observation["ops"].map{|s| s["insert"]}.join()
  end

  def update_svg_file!
    svg = self.reaction_svg_file
    if svg.present? && svg.end_with?('</svg>')
        svg_file_name = "#{SecureRandom.hex(64)}.svg"
        svg_path = "#{Rails.root}/public/images/reactions/#{svg_file_name}"

        svg_file = File.new(svg_path, 'w+')
        svg_file.write(svg)
        svg_file.close

        self.reaction_svg_file = svg_file_name
      # end
    else
      paths = {}
      %i(starting_materials reactants products).each do |prop|
        d = self.send(prop).includes(:molecule)
        paths[prop]= d.pluck(:id, :sample_svg_file, :'molecules.molecule_svg_file').map do |item|
          prop == :products ? [svg_path(item[1], item[2]), yield_amount(item[0])] : svg_path(item[1], item[2])
        end
      end

      begin
        composer = SVG::ReactionComposer.new(paths, temperature: temperature_display_with_unit,
                                                    solvents: solvents_in_svg,
                                                    show_yield: true)
        self.reaction_svg_file = composer.compose_reaction_svg_and_save
      rescue Exception => e
        Rails.logger.info("**** SVG::ReactionComposer failed ***")
      end
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
