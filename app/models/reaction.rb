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
#  conditions         :string
#
# Indexes
#
#  index_reactions_on_deleted_at      (deleted_at)
#  index_reactions_on_rinchi_web_key  (rinchi_web_key)
#  index_reactions_on_role            (role)
#

class Reaction < ApplicationRecord
  acts_as_paranoid
  include ElementUIStateScopes
  include PgSearch::Model
  include Collectable
  include ElementCodes
  include Taggable
  include ReactionRinchi
  include Labimotion::Segmentable

  serialize :description, Hash
  serialize :observation, Hash

  multisearchable against: %i[name short_label rinchi_string]

  attr_accessor :can_copy

  # search scopes for exact matching
  pg_search_scope :search_by_reaction_name, against: :name
  pg_search_scope :search_by_reaction_short_label, against: :short_label
  pg_search_scope :search_by_reaction_rinchi_string, against: :rinchi_string

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
  }, using: { trigram: { threshold: 0.0001 } }

  # scopes for suggestions
  scope :by_name, ->(query) { where('name ILIKE ?', "%#{sanitize_sql_like(query)}%") }
  scope :by_short_label, ->(query) { where('short_label ILIKE ?', "%#{sanitize_sql_like(query)}%") }
  scope :by_rinchi_string, ->(query) { where('rinchi_string ILIKE ?', "%#{sanitize_sql_like(query)}%") }
  scope :by_material_ids, ->(ids) { joins(:starting_materials).where('samples.id IN (?)', ids) }
  scope :by_solvent_ids, ->(ids) { joins(:solvents).where('samples.id IN (?)', ids) }
  scope :by_reactant_ids, ->(ids) { joins(:reactants).where('samples.id IN (?)', ids) }
  scope :by_product_ids,  ->(ids) { joins(:products).where('samples.id IN (?)', ids) }
  scope :by_sample_ids, ->(ids) { joins(:reactions_samples).where(reactions_samples: { sample_id: ids }) }
  scope :by_status, ->(query) { where('reactions.status ILIKE ?', "%#{sanitize_sql_like(query)}%") }
  scope :search_by_reaction_status, ->(query) { where(status: query) }
  scope :search_by_reaction_rinchi_string, ->(query) { where(rinchi_string: query) }
  scope :includes_for_list_display, -> { includes(:tag, :comments) }

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

  has_many :private_notes, as: :noteable, dependent: :destroy
  has_many :comments, as: :commentable, dependent: :destroy

  belongs_to :creator, foreign_key: :created_by, class_name: 'User'
  validates :creator, presence: true

  before_save :update_svg_file!
  before_save :cleanup_array_fields
  before_save :scrub
  before_save :auto_format_temperature!
  before_create :auto_set_short_label

  after_create :update_counter

  has_one :container, as: :containable

  def self.get_associated_samples(reaction_ids)
    ReactionsSample.where(reaction_id: reaction_ids).pluck(:sample_id)
  end

  def analyses
    container ? container.analyses : []
  end

  def auto_format_temperature!
    valueUnitCheck = (temperature['valueUnit'] =~ /^(°C|°F|K)$/).present?
    temperature['valueUnit'] = '°C' unless valueUnitCheck

    temperature['data'].each do |t|
      valid_time = (t['time'] =~ /^((?:\d\d):[0-5]\d:[0-5]\d$)/i).present?
      t['time'] = '00:00:00' unless valid_time
      t['value'] = t['value'].gsub(/[^0-9.-]/, '')
    end
  end

  def temperature_display
    userText = temperature['userText']
    return userText if userText != ''

    return '' if temperature['data'].empty?

    arrayData = temperature['data']
    maxTemp = (arrayData.max_by { |x| x['value'] })['value']
    minTemp = (arrayData.min_by { |x| x['value'] })['value']

    return '' if minTemp.nil? || maxTemp.nil?

    minTemp + ' ~ ' + maxTemp
  end

  def temperature_display_with_unit
    tp = temperature_display
    !tp.empty? ? tp + ' ' + temperature['valueUnit'] : ''
  end

  def description_contents
    description['ops'].map { |s| s['insert'] }.join
  end

  def observation_contents
    observation['ops'].map { |s| s['insert'] }.join
  end

  def update_svg_file!
    svg = reaction_svg_file
    if svg.present? && svg.end_with?('</svg>')
      svg_file_name = "#{SecureRandom.hex(64)}.svg"
      svg_path = Rails.public_path.join('images', 'reactions', svg_file_name)
      svg_file = File.new(svg_path, 'w+')
      svg_file.write(svg)
      svg_file.close
      self.reaction_svg_file = svg_file_name
    else
      paths = {}
      {
        starting_materials: :reactions_starting_material_samples,
        reactants: :reactions_reactant_samples,
        products: :reactions_product_samples
      }.each do |prop, resource|
        collection = public_send(resource).includes(sample: :molecule)
        paths[prop] = collection.map do |reactions_sample|
          sample = reactions_sample.sample
          params = [ sample.get_svg_path ]
          params[0] = sample.svg_text_path if reactions_sample.show_label
          params.append(yield_amount(sample.id)) if prop == :products
          params
        end
      end
      begin
        composer = SVG::ReactionComposer.new(paths, temperature: temperature_display_with_unit,
                                                    duration: duration,
                                                    solvents: solvents_in_svg,
                                                    conditions: conditions,
                                                    show_yield: true)
        self.reaction_svg_file = composer.compose_reaction_svg_and_save
      rescue StandardError => _e
        Rails.logger.info('**** SVG::ReactionComposer failed ***')
      end
    end
    if reaction_svg_file_changed? && reaction_svg_file_was.present?
      file_was = File.join(Rails.public_path, 'images', 'reactions', reaction_svg_file_was)
      File.delete(file_was) if Reaction.where(reaction_svg_file: reaction_svg_file_was).length < 2 && File.exist?(file_was)
    end
    reaction_svg_file
  end

  # return the full path of the svg file if it exists in the public folder otherwise nil.
  def current_svg_full_path
    file_path = Rails.public_path.join('images', 'reactions', reaction_svg_file)
    File.file?(file_path) ? file_path : nil
  end

  def yield_amount(sample_id)
    ReactionsProductSample.find_by(reaction_id: id, sample_id: sample_id).try(:equivalent)
  end

  def solvents_in_svg
    names = solvents.map(&:preferred_label)
    names && !names.empty? ? names : [solvent]
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
    creator.increment_counter 'reactions'
  end

  def scrub
    if temperature&.fetch('userText', nil).present?
      self.temperature = temperature.merge('userText' => scrubber(temperature['userText']))
    end
    if conditions.present?
      self.conditions = scrubber(conditions)
    end
  end

  private

  def scrubber(value)
    Loofah::HTML5::SafeList::ALLOWED_ATTRIBUTES.add('overflow')
    Loofah.scrub_fragment(value, :strip).to_s
  end
end
