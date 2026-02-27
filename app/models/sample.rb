# frozen_string_literal: true

# == Schema Information
#
# Table name: samples
#
#  id                  :integer          not null, primary key
#  ancestry            :string           default("/"), not null
#  boiling_point       :numrange
#  created_by          :integer
#  decoupled           :boolean          default(FALSE), not null
#  deleted_at          :datetime
#  density             :float            default(0.0)
#  deprecated_solvent  :string           default("")
#  description         :text             default("")
#  dry_solvent         :boolean          default(FALSE)
#  external_label      :string           default("")
#  identifier          :string
#  imported_readout    :string
#  impurities          :string           default("")
#  inventory_sample    :boolean          default(FALSE)
#  is_top_secret       :boolean          default(FALSE)
#  location            :string           default("")
#  melting_point       :numrange
#  metrics             :string           default("mmm")
#  molarity_unit       :string           default("M")
#  molarity_value      :float            default(0.0)
#  molecular_mass      :float
#  molfile             :binary
#  molfile_version     :string(20)
#  name                :string
#  purity              :float            default(1.0)
#  real_amount_unit    :string
#  real_amount_value   :float
#  sample_details      :jsonb
#  sample_svg_file     :string
#  sample_type         :string           default("Micromolecule")
#  short_label         :string
#  solvent             :jsonb
#  stereo              :jsonb
#  sum_formula         :string
#  target_amount_unit  :string           default("g")
#  target_amount_value :float            default(0.0)
#  xref                :jsonb
#  created_at          :datetime         not null
#  updated_at          :datetime         not null
#  fingerprint_id      :integer
#  molecule_id         :integer
#  molecule_name_id    :integer
#  user_id             :integer
#
# Indexes
#
#  index_samples_on_ancestry          (ancestry) WHERE (deleted_at IS NULL)
#  index_samples_on_deleted_at        (deleted_at)
#  index_samples_on_identifier        (identifier)
#  index_samples_on_inventory_sample  (inventory_sample)
#  index_samples_on_molecule_name_id  (molecule_name_id)
#  index_samples_on_sample_id         (molecule_id)
#  index_samples_on_user_id           (user_id)
#

# rubocop:disable Metrics/ClassLength
class Sample < ApplicationRecord
  attr_accessor :skip_inventory_label_update

  has_logidze
  acts_as_paranoid
  include ElementUIStateScopes
  include PgSearch::Model
  include Collectable
  include ElementCodes
  include AnalysisCodes
  include UnitConvertable
  include Taggable
  include Labimotion::Segmentable

  STEREO_ABS = ['any', 'rac', 'meso', 'delta', 'lambda', '(S)', '(R)', '(Sp)', '(Rp)', '(Sa)', '(Ra)'].freeze
  STEREO_REL = %w[any syn anti p-geminal p-ortho p-meta p-para cis trans fac mer].freeze
  STEREO_DEF = { 'abs' => 'any', 'rel' => 'any' }.freeze

  SAMPLE_TYPE_MIXTURE = 'Mixture'
  SAMPLE_TYPE_MICROMOLECULE = 'Micromolecule'

  SAMPLE_TYPES = [
    SAMPLE_TYPE_MICROMOLECULE,
    SAMPLE_TYPE_MIXTURE,
  ].freeze

  multisearchable against: %i[
    name short_label external_label molecule_sum_formular
    molecule_iupac_name molecule_inchistring molecule_inchikey molecule_cano_smiles
    sample_xref_cas
  ]

  # search scopes for exact matching
  pg_search_scope :search_by_sum_formula, against: :sum_formula, associated_against: {
    molecule: :sum_formular,
  }

  pg_search_scope :search_by_iupac_name, associated_against: {
    molecule: :iupac_name,
  }

  pg_search_scope :search_by_inchistring, associated_against: {
    molecule: :inchistring,
  }

  pg_search_scope :search_by_inchikey, associated_against: {
    molecule: :inchikey,
  }

  pg_search_scope :search_by_cano_smiles, associated_against: {
    molecule: :cano_smiles,
  }

  pg_search_scope :search_by_substring, against: %i[
    name short_label external_label
  ], associated_against: {
    molecule: %i[sum_formular iupac_name inchistring inchikey cano_smiles],
  }, using: { trigram: { threshold: 0.0001 } }

  pg_search_scope :search_by_sample_name, against: :name
  pg_search_scope :search_by_sample_short_label, against: :short_label
  pg_search_scope :search_by_sample_external_label, against: :external_label
  pg_search_scope :search_by_cas, against: { xref: 'cas' }
  pg_search_scope :search_by_molecule_name, associated_against: {
    molecule_name: :name,
  }

  # scopes for suggestions
  scope :by_residues_custom_info, lambda { |info, val|
                                    joins(:residues).where("residues.custom_info -> '#{info}' ILIKE ?",
                                                           "%#{sanitize_sql_like(val)}%")
                                  }
  scope :by_name, ->(query) { where('name ILIKE ?', "%#{sanitize_sql_like(query)}%") }
  scope :by_sample_xref_cas,
        ->(query) { where("xref ? 'cas'").where("xref ->> 'cas' ILIKE ?", "%#{sanitize_sql_like(query)}%") }
  scope :by_molecule_name, lambda { |query|
    joins(:molecule_name)
      .where('molecule_names.name ILIKE ?', "%#{sanitize_sql_like(query)}%")
  }
  scope :by_exact_name, lambda { |query|
                          sanitized_query = "^([a-zA-Z0-9]+-)?#{sanitize_sql_like(query)}(-?[a-zA-Z])$"
                          where('lower(samples.name) ~* lower(?) or lower(samples.external_label) ~* lower(?)',
                                sanitized_query, sanitized_query)
                        }
  scope :by_short_label, ->(query) { where('short_label ILIKE ?', "%#{sanitize_sql_like(query)}%") }
  scope :by_external_label, ->(query) { where('external_label ILIKE ?', "%#{sanitize_sql_like(query)}%") }
  scope :by_molecule_sum_formular, lambda { |query|
    decoupled_collection = where(decoupled: true).where('sum_formula ILIKE ?', "%#{sanitize_sql_like(query)}%")
    coupled_collection = where(decoupled: false).joins(:molecule).where('molecules.sum_formular ILIKE ?',
                                                                        "%#{sanitize_sql_like(query)}%")
    where(id: decoupled_collection + coupled_collection)
  }
  scope :with_reactions, lambda {
    joins(:reactions_samples)
  }
  scope :with_wellplates, lambda {
    joins(:well)
  }
  scope :by_wellplate_ids,         ->(ids) { joins(:wellplates).where(wellplates: { id: ids }) }
  scope :by_reaction_reactant_ids, lambda { |ids|
                                     joins(:reactions_reactant_samples).where(reactions_samples: { reaction_id: ids })
                                   }
  scope :by_reaction_product_ids,  lambda { |ids|
                                     joins(:reactions_product_samples).where(reactions_samples: { reaction_id: ids })
                                   }
  scope :by_reaction_material_ids, lambda { |ids|
                                     joins(:reactions_starting_material_samples)
                                       .where(reactions_samples: { reaction_id: ids })
                                   }
  scope :by_reaction_solvent_ids,  lambda { |ids|
                                     joins(:reactions_solvent_samples).where(reactions_samples: { reaction_id: ids })
                                   }
  scope :by_reaction_ids,          lambda { |ids|
                                     joins(:reactions_samples).where(reactions_samples: { reaction_id: ids })
                                   }
  scope :by_literature_ids,        ->(ids) { joins(:literals).where(literals: { literature_id: ids }) }
  scope :includes_for_list_display, -> { includes(:molecule_name, :tag, :comments, molecule: :tag) }

  scope :product_only, -> { joins(:reactions_samples).where("reactions_samples.type = 'ReactionsProductSample'") }
  scope :sample_or_startmat_or_products, lambda {
    joins('left join reactions_samples rs on rs.sample_id = samples.id')
      .where("rs.id isnull or rs.\"type\" in ('ReactionsProductSample', 'ReactionsStartingMaterialSample')")
  }

  scope :search_by_fingerprint_sim, lambda { |molfile, threshold = 0.01|
    joins(:fingerprint).merge(
      Fingerprint.search_similar(nil, threshold, false, molfile),
    ).order('tanimoto desc')
  }

  scope :search_by_fingerprint_sub, lambda { |molfile, as_array = false|
    if Chemotion::Application.config.pg_cartridge == 'rdkit'
      where("samples.id in (select id from rdkit.mols
        where m operator(@>) qmol_from_ctab(encode('#{molfile}', 'escape')::cstring) )")
    else
      fp_vector = Chemotion::OpenBabelService.bin_fingerprint_from_molfile(molfile)
      smarts_query = Chemotion::OpenBabelService.get_smiles_from_molfile(molfile)
      samples = joins(:fingerprint).merge(Fingerprint.screen_sub(fp_vector))
      samples = samples.select do |sample|
        Chemotion::OpenBabelService.substructure_match(smarts_query, sample.molfile)
      end
      return samples if as_array

      Sample.where(id: samples.map(&:id))
    end
  }

  before_save :auto_set_molfile_to_molecules_molfile
  before_save :find_or_create_molecule_based_on_inchikey
  before_save :update_molecule_name
  before_save :check_molfile_polymer_section
  before_save :find_or_create_fingerprint
  before_save :attach_svg, :init_elemental_compositions,
              :set_loading_from_ea
  before_save :auto_set_short_label
  before_create :check_molecule_name
  before_create :set_boiling_melting_points
  after_create :create_root_container
  after_save :update_counter
  after_save :update_equivalent_for_reactions
  after_save :update_gas_material
  after_save :update_svg_for_reactions, unless: :skip_reaction_svg_update?

  has_many :collections_samples, inverse_of: :sample, dependent: :destroy
  has_many :collections, through: :collections_samples

  has_many :reactions_samples, dependent: :destroy
  has_many :reactions_starting_material_samples, dependent: :destroy
  has_many :reactions_reactant_samples, dependent: :destroy
  has_many :reactions_solvent_samples, dependent: :destroy
  has_many :reactions_product_samples, dependent: :destroy
  has_many :elements_samples, dependent: :destroy, class_name: 'Labimotion::ElementsSample'

  has_many :reactions, through: :reactions_samples
  has_many :reactions_as_starting_material, through: :reactions_starting_material_samples, source: :reaction
  has_many :reactions_as_reactant, through: :reactions_reactant_samples, source: :reaction
  has_many :reactions_as_solvent, through: :reactions_solvent_samples, source: :reaction
  has_many :reactions_as_product, through: :reactions_product_samples, source: :reaction

  has_many :literals, as: :element, dependent: :destroy
  has_many :literatures, through: :literals

  has_many :devices_samples
  has_many :analyses_experiments
  has_many :private_notes, as: :noteable, dependent: :destroy
  has_many :comments, as: :commentable, dependent: :destroy

  has_many :components, dependent: :destroy

  belongs_to :fingerprint, optional: true
  belongs_to :user, optional: true
  belongs_to :molecule_name, optional: true

  has_one :container, as: :containable
  has_one :chemical, dependent: :destroy

  has_many :wells
  has_many :wellplates, through: :wells
  has_many :residues, dependent: :destroy
  has_many :elemental_compositions, dependent: :destroy

  composed_of :amount, mapping: %w[amount_value amount_unit]

  has_ancestry orphan_strategy: :adopt

  belongs_to :creator, foreign_key: :created_by, class_name: 'User'
  belongs_to :molecule, optional: true

  accepts_nested_attributes_for :molecule_name
  accepts_nested_attributes_for :collections_samples
  accepts_nested_attributes_for :molecule, update_only: true
  accepts_nested_attributes_for :residues, :elemental_compositions, :container,
                                :tag, allow_destroy: true

  validates :purity,
            numericality: { greater_than_or_equal_to: 0.0, less_than_or_equal_to: 1.0, allow_nil: true }
  validate :has_collections

  delegate :computed_props, to: :molecule, prefix: true
  delegate :inchikey, to: :molecule, prefix: true, allow_nil: true

  attr_writer :skip_reaction_svg_update

  def self.rebuild_pg_search_documents
    find_each(&:update_pg_search_document)
  end

  def skip_reaction_svg_update?
    @skip_reaction_svg_update.present?
  end

  def molecule_sum_formular
    (decoupled? ? sum_formula : molecule&.sum_formular) || ''
  end

  def molecule_iupac_name
    molecule ? molecule.iupac_name : ''
  end

  def molecule_molecular_weight
    molecule ? molecule.molecular_weight : ''
  end

  def molecule_inchistring
    molecule ? molecule.inchistring : ''
  end

  def sample_xref_cas
    xref&.fetch('cas', '')
  end

  def molecule_inchikey
    molecule ? molecule.inchikey : ''
  end

  def molecule_cano_smiles
    molecule ? molecule.cano_smiles : ''
  end

  def analyses
    container ? container.analyses : Container.none
  end

  def self.associated_by_user_id_and_reaction_ids(user_id, reaction_ids)
    for_user(user_id).by_reaction_ids(reaction_ids).distinct
  end

  def self.associated_by_user_id_and_wellplate_ids(user_id, wellplate_ids)
    for_user(user_id).by_wellplate_ids(wellplate_ids)
  end

  def extract_product_info(chemical_data, safety_sheet_path, chemical_data_output)
    return unless safety_sheet_path.any? { |s| s.key?('alfa_link') }

    alfa_product_info = chemical_data[0]['alfaProductInfo']
    chemical_data_output['alfaProductInfo'] = alfa_product_info if alfa_product_info

    return unless safety_sheet_path.any? { |s| s.key?('merck_link') }

    merck_product_info = chemical_data[0]['merckProductInfo']
    chemical_data_output['merckProductInfo'] = merck_product_info if merck_product_info
  end

  def chemical_data_for_entry(chemical_data)
    if chemical_data[0] && chemical_data[0]['safetySheetPath']
      safety_sheet_path = chemical_data[0]['safetySheetPath']
      safety_phrases = chemical_data[0]['safetyPhrases'] || []

      chemical_data_output = {
        'safetySheetPath' => safety_sheet_path,
      }
      chemical_data_output['safetyPhrases'] = safety_phrases unless safety_phrases.empty?

      # Extract alfaProductInfo or merckProductInfo based on safety_sheet_path
      extract_product_info(chemical_data, safety_sheet_path, chemical_data_output)
      [chemical_data_output]
    else
      []
    end
  end

  def create_chemical_entry_for_subsample(sample_id, subsample_id, type)
    chemical_entry = Chemical.find_by(sample_id: sample_id) || Chemical.new
    chemical_data = chemical_entry.chemical_data || []
    cas = chemical_entry.cas.presence ? chemical_entry.cas : nil

    case type
    when 'sample'
      attributes = {
        cas: cas,
        chemical_data: chemical_data,
        sample_id: subsample_id,
      }
      chemical = Chemical.new(attributes)
      chemical.save!
    # create chemical entry for subsample in a reaction
    when 'reaction'
      update_chemical_data = chemical_data_for_entry(chemical_data)
      unless update_chemical_data.empty?
        attributes = {
          cas: cas,
          chemical_data: update_chemical_data,
          sample_id: subsample_id,
        }
        chemical = Chemical.new(attributes)
        chemical.save!
      end
    end
  end

  def create_components_for_mixture_subsample(subsample)
    return if components.blank?

    components.each do |component|
      subsample.components.create!(
        name: component.name,
        position: component.position,
        component_properties: component.component_properties,
      )
    end
  end

  # rubocop:disable Metrics/AbcSize
  # rubocop:disable Metrics/CyclomaticComplexity
  # rubocop:disable Metrics/PerceivedComplexity
  # rubocop:disable Style/MethodDefParentheses
  # rubocop:disable Style/OptionalBooleanParameter
  def create_subsample user, collection_ids, copy_ea = false, type = nil
    subsample = dup
    subsample.xref['inventory_label'] = nil
    subsample.skip_inventory_label_update = true
    subsample.name = name if name.present?
    subsample.external_label = external_label if external_label.present?

    # Ex(p|t)ensive method to get a proper counter:
    # take into consideration sample children that have been hard/soft deleted
    children_count = children.with_deleted.count
    last_child_label = children.with_deleted.order('created_at')
                               .where('short_label LIKE ?', "#{short_label}-%").last&.short_label
    last_child_counter = (last_child_label&.match(/^#{short_label}-(\d+)/) && ::Regexp.last_match(1).to_i) || 0

    counter = [last_child_counter, children_count].max
    subsample.short_label = "#{short_label}-#{counter + 1}"

    subsample.parent = self
    subsample.created_by = user.id
    subsample.residues_attributes = residues.select(:custom_info, :residue_type).as_json
    if copy_ea
      subsample.elemental_compositions_attributes = elemental_compositions.select(
        :composition_type, :data, :loading
      ).as_json
    end

    # associate to arg collections and creator's All collection
    collections = (
      Collection.where(id: collection_ids) | Collection.where(user_id: user, label: 'All', is_locked: true)
    )
    subsample.collections << collections

    subsample.container = Container.create_root_container
    subsample.save!

    create_components_for_mixture_subsample(subsample)
    create_chemical_entry_for_subsample(id, subsample.id, type) unless type.nil?

    subsample
  end

  # rubocop:enable Metrics/AbcSize
  # rubocop:enable Metrics/CyclomaticComplexity
  # rubocop:enable Metrics/PerceivedComplexity
  # rubocop:enable Style/MethodDefParentheses
  # rubocop:enable Style/OptionalBooleanParameter
  def reaction_description
    reactions.first.try(:description)
  end

  def auto_set_molfile_to_molecules_molfile
    self.molfile = molfile.presence || molecule&.molfile
  end

  def validate_stereo(_stereo = {})
    self.stereo ||= Sample::STEREO_DEF
    self.stereo.merge!(_stereo.slice('abs', 'rel'))
    self.stereo['abs'] = 'any' unless Sample::STEREO_ABS.include?(self.stereo['abs'])
    self.stereo['rel'] = 'any' unless Sample::STEREO_REL.include?(self.stereo['rel'])
    self.stereo
  end

  def find_or_create_molecule_based_on_inchikey
    return if molfile.blank?

    return if molecule.present?

    babel_info = Chemotion::OpenBabelService.molecule_info_from_molfile(molfile)
    inchikey = babel_info[:inchikey]
    return if inchikey.blank?

    is_partial = babel_info[:is_partial]
    self.molfile_version = babel_info[:version]
    return unless molecule&.inchikey != inchikey || molecule.is_partial != is_partial

    self.molecule = Molecule.find_or_create_by_molfile(molfile, babel_info)
  end

  def find_or_create_fingerprint
    return unless molecule_id_changed? || molfile_changed? || fingerprint_id.nil?

    self.fingerprint_id = Fingerprint.find_or_create_by_molfile(molfile.clone)&.id
  end

  def get_svg_path
    if sample_svg_file.present?
      "/images/samples/#{sample_svg_file}"
    elsif molecule&.molecule_svg_file&.present?
      "/images/molecules/#{molecule.molecule_svg_file}"
    end
  end

  # return the full path of the svg file (molecule svg if no sample svg) if it or nil.
  def current_svg_full_path
    file_path = full_svg_path
    file_path&.file? ? file_path : molecule&.current_svg_full_path
  end

  def svg_text_path
    text = name.presence || molecule_sum_formular.presence || molecule.iupac_name
    "svg_text/#{text}"
  end

  def loading
    residues[0] && residues[0].custom_info['loading'].to_f
  end

  def attach_svg(svg = sample_svg_file)
    return if svg.blank?

    svg = File.basename(svg) if svg.include?('/')
    svg_file_name = "#{SecureRandom.hex(64)}.svg"

    if /\ATMPFILE[0-9a-f]{64}.svg\z/.match?(svg)
      src = full_svg_path(svg.to_s)
      return unless File.file?(src)

      svg = File.read(src)
      FileUtils.remove(src)
    end
    if svg.start_with?(/\s*<\?xml/, /\s*<svg/)
      File.write(full_svg_path(svg_file_name), Chemotion::Sanitizer.scrub_svg(svg, remap_glyph_ids: true))
      self.sample_svg_file = svg_file_name
    end
    return if /\A[0-9a-f]{128}.svg\z/.match?(sample_svg_file)

    self.sample_svg_file = nil
  end

  def init_elemental_compositions
    residue = residues[0]
    return if molecule_sum_formular.blank?

    if residue.present? && molfile.include?(' R# ') # case when residue will be deleted
      p_formula = residue.custom_info['formula']
      p_loading = residue.custom_info['loading'].try(:to_d)

      if (loading_full = residue.custom_info['loading_full_conv'])
        d = Chemotion::Calculations.get_composition(molecule_sum_formular, p_formula, loading_full.to_f)
        set_elem_composition_data 'full_conv', d, loading_full
      end

      if p_formula.present?
        d = Chemotion::Calculations.get_composition(molecule_sum_formular, p_formula, p_loading || 0.0)
        # if it is reaction product then loading has been calculated
        l_type = if residue['custom_info']['loading_type'] == 'mass_diff'
                   'mass_diff'
                 else
                   'loading'
                 end

        set_elem_composition_data l_type, d, p_loading unless p_loading.to_f == 0.0
      else
        {}
      end
    else
      d = Chemotion::Calculations.get_composition(molecule_sum_formular)

      set_elem_composition_data 'formula', d
    end

    # init empty object keys for user-calculated composition input
    return if elemental_compositions.find { |i| i.composition_type == 'found' }

    clone_data = (d || {}).keys.index_with do |_key|
      nil
    end

    set_elem_composition_data 'found', clone_data, 0.0
  end

  def contains_residues
    residues.any?
  end

  def preferred_label
    external_label.presence || molecule_name_hash[:label].presence ||
      molecule.iupac_name
  end

  def preferred_tag
    if (tag = preferred_label) && tag && tag.length > 20
      "#{tag[0, 20]}..."
    else
      tag
    end
  end

  def molecule_name_hash
    mn = molecule_name
    return {} unless mn

    { label: mn.name, value: mn.id, desc: mn.description, mid: mn.molecule_id }
  end

  def molecule_molfile
    return if molecule.blank?

    molecule.molfile
  end

  def showed_name
    mn = molecule_name
    mnl = mn&.name
    mnd = mn&.description
    is_sum_form = mnd&.include?('sum_formula')
    mnl && !is_sum_form ? mnl : molecule_iupac_name
  end

  def detect_amount_type
    target_amount_condition = target_amount_value.nil? || target_amount_value.zero? || target_amount_unit.nil?
    real_amount_condition = real_amount_value.nil? || real_amount_value.zero? || real_amount_unit.nil?

    return { 'value' => target_amount_value, 'unit' => target_amount_unit } if real_amount_condition && !target_amount_condition

    { 'value' => real_amount_value, 'unit' => real_amount_unit }
  end

  def amount_mol
    amount_value = detect_amount_type['value']
    unit = detect_amount_type['unit']
    convert_amount_to_mol(amount_value, unit)
  end

  def update_inventory_label(inventory_label, collection_id = nil)
    return if collection_id.blank? || skip_inventory_label_update
    return unless (inventory = Inventory.by_collection_id(collection_id).first)
    return if inventory_label.present? && !inventory.match_inventory_counter(inventory_label)

    self['xref']['inventory_label'] = inventory.label if inventory.update_incremented_counter
  end

  # Compute number of moles from given amount and unit
  # Supports units: 'l', 'mol', 'g'
  # - 'l': if `has_molarity` uses molarity, otherwise uses density and molecular weight
  # - 'mol': returns amount_value
  # - 'g': converts mass to moles using molecular weight and purity
  def convert_amount_to_mol(amount_value, unit)
    amount = coerce_amount(amount_value)
    return nil if amount.nil?

    case unit
    when 'l'
      return convert_liters_to_moles(amount)
    when 'mol'
      return amount
    when 'g'
      return convert_grams_to_moles(amount)
    end
    nil
  end

  # Refreshes SVG from molfile and overwrites the file at svg_path.
  # @param svg_path [String] Filename or path for the SVG (e.g. "TMPFILEabc.svg")
  # @param molfile [String] The molfile to generate SVG from
  # @return [Hash] { success:, filename:, error:, status: }
  def self.refresh_smaple_svg(svg_path, molfile)
    if molfile.blank? || svg_path.blank?
      return { success: false, error: 'molfile and svg_path are required.', status: 400 }
    end

    filename = File.basename(svg_path)
    return { success: false, error: 'Invalid filename', status: 400 } if filename.match?(%r{\.\.|/|\\})

    target_path = Rails.public_path.join('images', 'samples', filename)
    if File.file?(target_path)
      existing_svg = File.read(target_path)
      if existing_svg.include?('<image') || existing_svg.include?('epam-ketcher-ssc')
        return { success: true, filename: filename }
      end
    end

    svg = Molecule.svg_reprocess(nil, molfile)
    return { success: false, error: 'Failed to generate SVG from molfile', status: 422 } if svg.blank?

    FileUtils.mkdir_p(File.dirname(target_path))
    File.write(target_path, svg)
    { success: true, filename: filename }
  rescue StandardError => e
    Rails.logger.error("Sample.refresh_svg_content: Error refreshing SVG for #{svg_path}: #{e.message}")
    { success: false, error: e.message, status: 500 }
  end

  private

  def has_collections
    errors.add(:base, 'must have least one collection') if collections_samples.blank?
  end

  def set_elem_composition_data(d_type, d_values, loading = nil)
    attrs = {
      composition_type: d_type,
      data: d_values,
      loading: loading,
    }

    if (item = elemental_compositions.find { |i| i.composition_type == d_type })
      item.assign_attributes attrs
    else
      elemental_compositions << ElementalComposition.new(attrs)
    end
  end

  def check_molfile_polymer_section
    return if decoupled || sample_type == SAMPLE_TYPE_MIXTURE
    return unless molfile.include? 'R#'

    lines = molfile.lines
    polymers = []
    m_end_index = nil
    lines[4..].each_with_index do |line, index|
      polymers << index if line.include? 'R#'
      (m_end_index = index) && break if /M\s+END/.match?(line)
    end

    reg = /(> <PolymersList>[\W\w.\n]+\d+)/m
    unless (lines[5 + m_end_index].to_s + lines[6 + m_end_index].to_s).match reg
      if lines[5 + m_end_index].to_s.include? '> <PolymersList>'
        lines.insert(6 + m_end_index, "#{polymers.join(' ')}\n")
      else
        lines.insert(4 + m_end_index, "> <PolymersList>\n")
        lines.insert(5 + m_end_index, "#{polymers.join(' ')}\n")
      end
    end

    self.molfile = lines.join
    self.fingerprint_id = Fingerprint.find_or_create_by_molfile(molfile.clone)&.id
  end

  def set_loading_from_ea
    return unless residues.first

    # select from cached attributes, don't make a SQL query
    return unless (el_composition = elemental_compositions.find do |i|
      i.composition_type == 'found'
    end)

    el_composition.set_loading self
  end

  def update_equivalent_for_reactions
    rel_reaction_id = reactions_samples.first&.reaction_id
    return unless rel_reaction_id

    ReactionsSample.where(reaction_id: rel_reaction_id,
                          type: %w[ReactionsProductSample ReactionsReactantSample
                                   ReactionsStartingMaterialSample]).find_each(&:update_equivalent)
  end

  def update_svg_for_reactions
    reactions.each(&:save)
  end

  # rubocop: disable Metrics/AbcSize
  # rubocop: disable Metrics/CyclomaticComplexity
  # rubocop: disable Metrics/PerceivedComplexity

  def auto_set_short_label
    sh_label = self['short_label']
    return if /solvents?|reactants?/.match?(sh_label)
    return if short_label && !short_label_changed?

    if sh_label && (Sample.find_by(short_label: sh_label) || sh_label.eql?('NEW SAMPLE'))
      if parent && (parent_label = parent.short_label) !~ /solvents?|reactants?/
        self.short_label = "#{parent_label}-#{parent.children.count.to_i.succ}"
      elsif creator && creator.counters['samples']
        abbr = creator.name_abbreviation
        self.short_label = "#{abbr}-#{creator.counters['samples'].to_i.succ}"
      end
    elsif !sh_label && creator && creator.counters['samples']
      abbr = creator.name_abbreviation
      self.short_label = "#{abbr}-#{creator.counters['samples'].to_i.succ}"
    end
  end

  # rubocop: enable Metrics/AbcSize
  # rubocop: enable Metrics/CyclomaticComplexity
  # rubocop: enable Metrics/PerceivedComplexity

  def update_counter
    return if short_label =~ /solvents?|reactants?/ || parent
    return unless saved_change_to_short_label?
    return unless /^#{creator.name_abbreviation}-\d+$/.match?(short_label)

    creator.increment_counter 'samples'
  end

  def create_root_container
    self.container = Container.create_root_container if container.nil?
  end

  def assign_molecule_name
    if molecule_name&.new_record? && molecule.persisted? && molecule_name.name.present?
      att = molecule_name.attributes.slice('user_id', 'description', 'name')
      att['molecule_id'] = molecule.id
      mn = MoleculeName.find_or_create_by(att)
    else
      target = molecule_iupac_name || molecule_sum_formular
      mn = molecule.molecule_names.find_by(name: target)
    end
    self.molecule_name = mn
  end

  def check_molecule_name
    return if molecule_name_id.present?

    assign_molecule_name
  end

  def set_boiling_melting_points
    self.boiling_point = Range.new(-Float::INFINITY, Float::INFINITY, '()') if boiling_point.nil?
    self.melting_point = Range.new(-Float::INFINITY, Float::INFINITY, '()') if melting_point.nil?
  end

  def update_molecule_name
    return unless molecule_id_changed? && molecule_name&.molecule_id != molecule_id

    assign_molecule_name
  end

  def has_molarity
    molarity_value.present? && molarity_value.positive? && density.zero?
  end

  def has_density
    density.present? && density.positive? && (molarity_value.blank? || molarity_value.zero?)
  end

  # build a full path of the sample svg, nil if not buildable
  def full_svg_path(svg_file_name = sample_svg_file)
    return unless svg_file_name

    Rails.public_path.join('images', 'samples', svg_file_name)
  end

  def update_gas_material
    rel_reaction_id = reactions_samples.first&.reaction_id
    gas_type = reactions_samples.first&.gas_type
    return unless rel_reaction_id && gas_type == 'catalyst'

    catalyst_mol_value = amount_mol
    return if catalyst_mol_value.nil?

    ReactionsSample.where(
      reaction_id: rel_reaction_id,
      gas_type: 3,
      type: %w[ReactionsProductSample],
    ).find_each do |material|
      material.update_gas_material(catalyst_mol_value)
    end
  end

  def coerce_amount(value)
    return nil if value.nil?

    amount = value.to_f
    return nil unless amount&.finite?

    amount
  end

  def convert_liters_to_moles(amount)
    return convert_liters_using_molarity(amount) if has_molarity

    return nil unless density_and_mw_valid?

    amount * density.to_f * 1000 * purity.to_f / molecule.molecular_weight.to_f
  end

  def convert_liters_using_molarity(amount)
    return nil unless molarity_value.present? && molarity_value.to_f.positive?

    amount * molarity_value.to_f
  end

  def density_and_mw_valid?
    density.present? && density.to_f.positive? && valid_molecular_weight?
  end

  def convert_grams_to_moles(amount)
    return nil unless valid_molecular_weight?

    (amount * purity.to_f) / molecule.molecular_weight.to_f
  end

  def valid_molecular_weight?
    molecule&.molecular_weight.present? && molecule.molecular_weight.to_f.positive?
  end
end
# rubocop:enable Metrics/ClassLength
