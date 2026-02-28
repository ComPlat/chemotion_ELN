# frozen_string_literal: true

# == Schema Information
#
# Table name: reactions
#
#  id                     :integer          not null, primary key
#  name                   :string
#  observation            :text
#  origin                 :jsonb
#  plain_text_description :text
#  plain_text_observation :text
#  purification           :string           default([]), is an Array
#  reaction_svg_file      :string
#  rf_value               :string
#  rinchi_long_key        :text
#  rinchi_short_key       :string
#  rinchi_string          :text
#  rinchi_web_key         :string
#  role                   :string
#  rxno                   :string
#  short_label            :string
#  solvent                :string
#  status                 :string
#  temperature            :jsonb
#  timestamp_start        :string
#  timestamp_stop         :string
#  tlc_description        :text
#  tlc_solvents           :string
#  use_reaction_volume    :boolean          default(FALSE), not null
#  variations             :jsonb
#  vessel_size            :jsonb
#  volume                 :decimal(10, 4)
#  created_at             :datetime         not null
#  updated_at             :datetime         not null
#  description            :text
#  dangerous_products     :string           default([]), is an Array
#  deleted_at             :datetime
#  created_by             :integer
#  duration               :string
#  conditions             :string
#  gaseous                :boolean          default(FALSE)
#  weight_percentage      :boolean          default(FALSE)
#
# Indexes
#
#  index_reactions_on_deleted_at        (deleted_at)
#  index_reactions_on_rinchi_short_key  (rinchi_short_key)
#  index_reactions_on_rinchi_web_key    (rinchi_web_key)
#  index_reactions_on_role              (role)
#  index_reactions_on_rxno              (rxno)
#

# rubocop:disable Metrics/ClassLength
class Reaction < ApplicationRecord
  has_logidze
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
    samples: :name,
  }

  pg_search_scope :search_by_iupac_name, associated_against: {
    sample_molecules: :iupac_name,
  }

  pg_search_scope :search_by_inchistring, associated_against: {
    sample_molecules: :inchistring,
  }

  pg_search_scope :search_by_cano_smiles, associated_against: {
    sample_molecules: :cano_smiles,
  }

  pg_search_scope :search_by_substring, against: :name, associated_against: {
    samples: :name,
    sample_molecules: :iupac_name,
  }, using: { trigram: { threshold: 0.0001 } }

  # scopes for suggestions
  scope :by_name, ->(query) { where('name ILIKE ?', "%#{sanitize_sql_like(query)}%") }
  scope :by_short_label, ->(query) { where('short_label ILIKE ?', "%#{sanitize_sql_like(query)}%") }
  scope :by_rinchi_string, ->(query) { where('rinchi_string ILIKE ?', "%#{sanitize_sql_like(query)}%") }
  scope :by_material_ids, ->(ids) { joins(:starting_materials).where(samples: { id: ids }) }
  scope :by_solvent_ids, ->(ids) { joins(:solvents).where(samples: { id: ids }) }
  scope :by_reactant_ids, ->(ids) { joins(:reactants).where(samples: { id: ids }) }
  scope :by_product_ids,  ->(ids) { joins(:products).where(samples: { id: ids }) }
  scope :by_sample_ids, ->(ids) { joins(:reactions_samples).where(reactions_samples: { sample_id: ids }) }
  scope :by_literature_ids, ->(ids) { joins(:literals).where(literals: { literature_id: ids }) }
  scope :by_status, ->(query) { where('reactions.status ILIKE ?', "%#{sanitize_sql_like(query)}%") }
  scope :search_by_reaction_status, ->(query) { where(status: query) }
  scope :search_by_reaction_rinchi_string, ->(query) { where(rinchi_string: query) }
  scope :includes_for_list_display, -> { includes(:tag) }

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

  has_many :reactions_reactant_sbmm_samples,
           -> { order(position: :asc) },
           inverse_of: :reaction,
           dependent: :destroy
  has_many :reactant_sbmm_samples,
           through: :reactions_reactant_sbmm_samples,
           source: :sequence_based_macromolecule_sample

  has_many :reactions_product_samples, -> { order(position: :asc) }, dependent: :destroy
  has_many :products, through: :reactions_product_samples, source: :sample
  has_many :product_molecules, through: :products, source: :molecule

  has_many :literals, as: :element, dependent: :destroy
  has_many :literatures, through: :literals

  has_many :sync_collections_users, through: :collections

  has_many :private_notes, as: :noteable, dependent: :destroy
  has_many :comments, as: :commentable, dependent: :destroy

  belongs_to :creator, foreign_key: :created_by, class_name: 'User'

  before_save :update_svg_file!
  before_save :cleanup_array_fields
  before_save :scrub
  before_save :auto_format_temperature!
  before_save :transform_variations
  around_save :update_fields_to_plain_text, if: -> { description_changed? || observation_changed? }
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
    userText = (temperature && temperature['userText']) || ''
    return userText if userText != ''

    return '' if !temperature || !temperature['data'] || temperature['data'].empty?

    arrayData = temperature['data']
    maxTemp = (arrayData.max_by { |x| x['value'] })['value']
    minTemp = (arrayData.min_by { |x| x['value'] })['value']

    return '' if minTemp.nil? || maxTemp.nil?

    "#{minTemp} ~ #{maxTemp}"
  end

  def temperature_display_with_unit
    tp = temperature_display
    tp.empty? ? '' : "#{tp} #{temperature['valueUnit']}"
  end

  def description_contents
    description['ops'].pluck('insert').join
  end

  def observation_contents
    observation['ops'].pluck('insert').join
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
        products: :reactions_product_samples,
      }.each do |prop, resource|
        collection = public_send(resource).includes(sample: :molecule)
        paths[prop] = collection.map do |reactions_sample|
          sample = reactions_sample.sample
          params = [sample.get_svg_path]
          params[0] = sample.svg_text_path if reactions_sample.show_label
          params.append(yield_amount(sample.id)) if prop == :products
          params
        end
      end
      # SBMM reactants are stored in a separate association, so append them explicitly.
      paths[:reactants] += reactant_sbmm_samples.map { |sbmm_sample| [sbmm_sample.svg_text_path] }
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
      file_was = Rails.public_path.join('images', 'reactions', reaction_svg_file_was)
      if Reaction.where(reaction_svg_file: reaction_svg_file_was).length < 2 && File.exist?(file_was)
        File.delete(file_was)
      end
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
    names.presence || [solvent]
  end

  def cleanup_array_fields
    self.dangerous_products = dangerous_products.compact_blank
    self.purification = purification.compact_blank
  end

  def auto_set_short_label
    return if short_label.present?

    prefix = creator.reaction_name_prefix
    counter = creator.counters['reactions'].succ
    self.short_label = "#{creator.initials}-#{prefix}#{counter}"
  end

  def update_counter
    creator.increment_counter 'reactions'
  end

  def scrub
    return if temperature&.fetch('userText', nil).blank?

    self.temperature = temperature.merge('userText' => scrubber(temperature['userText']))

    # Conditions are not scrubbed: plain text may contain "<" or ">" (e.g. "pH < 7");
    # scrub_xml would strip them. Conditions are escaped at display time.
  end

  def variations
    # We need to return raw.values because the frontend expects the variations to be an array of objects.
    raw = self[:variations]
    raw.is_a?(Hash) ? raw.values : raw
  end

  def assign_attachment_to_variation(variation_id, analysis_id)
    return if variation_id.blank?

    variation = variations.find { |v| v['id'].to_s == variation_id.to_s }
    return unless variation

    variation['metadata'] ||= {}
    variation['metadata']['analyses'] ||= []
    variation['metadata']['analyses'] << analysis_id
    update(variations: variations)
  end

  private

  def scrubber(value)
    Chemotion::Sanitizer.scrub_xml(value)
  end

  def transform_variations
    return unless variations.is_a?(Array)

    self.variations = variations.each_with_object({}) do |item, hash|
      item['uuid'] = SecureRandom.uuid if item['uuid'].blank?
      hash[item['uuid']] = item
    end
  end

  def update_fields_to_plain_text
    description_changed = description_changed?
    observation_changed = observation_changed?
    yield
    update_to_plain_text(description_changed, observation_changed)
  end

  # rubocop:disable Rails/SkipsModelValidations
  def update_to_plain_text(description_changed, observation_changed)
    update_columns(
      {
        plain_text_observation: observation_changed.presence && Chemotion::QuillToPlainText.convert(observation),
        plain_text_description: description_changed.presence && Chemotion::QuillToPlainText.convert(description),
      }.compact,
    )
  # NB: we don't want to raise an error if the conversion fails
  rescue StandardError => e
    Rails.logger.error("Error converting quill to plain text: #{e}")
  end
  # rubocop:enable Rails/SkipsModelValidations

  handle_asynchronously :update_to_plain_text, queue: 'plain_text_reaction'

  def full_svg_path(svg_file_name = reaction_svg_file)
    return unless svg_file_name

    Rails.public_path.join('images/reactions', svg_file_name)
  end
end
# rubocop:enable Metrics/ClassLength
