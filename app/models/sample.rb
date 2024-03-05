# == Schema Information
#
# Table name: samples
#
#  id                  :integer          not null, primary key
#  name                :string
#  target_amount_value :float            default(0.0)
#  target_amount_unit  :string           default("g")
#  created_at          :datetime         not null
#  updated_at          :datetime         not null
#  description         :text             default("")
#  molecule_id         :integer
#  molfile             :binary
#  purity              :float            default(1.0)
#  deprecated_solvent  :string           default("")
#  impurities          :string           default("")
#  location            :string           default("")
#  is_top_secret       :boolean          default(FALSE)
#  ancestry            :string
#  external_label      :string           default("")
#  created_by          :integer
#  short_label         :string
#  real_amount_value   :float
#  real_amount_unit    :string
#  imported_readout    :string
#  deleted_at          :datetime
#  sample_svg_file     :string
#  user_id             :integer
#  identifier          :string
#  density             :float            default(0.0)
#  melting_point       :numrange
#  boiling_point       :numrange
#  fingerprint_id      :integer
#  xref                :jsonb
#  molarity_value      :float            default(0.0)
#  molarity_unit       :string           default("M")
#  molecule_name_id    :integer
#  molfile_version     :string(20)
#  stereo              :jsonb
#  metrics             :string           default("mmm")
#  decoupled           :boolean          default(FALSE), not null
#  molecular_mass      :float
#  sum_formula         :string
#  solvent_old         :string
#  solvent             :jsonb
#
# Indexes
#
#  index_samples_on_deleted_at        (deleted_at)
#  index_samples_on_identifier        (identifier)
#  index_samples_on_molecule_name_id  (molecule_name_id)
#  index_samples_on_sample_id         (molecule_id)
#  index_samples_on_user_id           (user_id)
#

class Sample < ApplicationRecord
  acts_as_paranoid
  include ElementUIStateScopes
  include PgSearch
  include Collectable
  include ElementCodes
  include AnalysisCodes
  include UnitConvertable
  include Taggable
  include Segmentable

  STEREO_ABS = ['any', 'rac', 'meso', '(S)', '(R)', '(Sp)', '(Rp)', '(Sa)'].freeze
  STEREO_REL = ['any', 'syn', 'anti', 'p-geminal', 'p-ortho', 'p-meta', 'p-para', 'cis', 'trans', 'fac', 'mer'].freeze
  STEREO_DEF = { 'abs' => 'any', 'rel' => 'any' }.freeze

  multisearchable against: [
    :name, :short_label, :external_label, :molecule_sum_formular,
    :molecule_iupac_name, :molecule_inchistring, :molecule_inchikey, :molecule_cano_smiles
  ]

  # search scopes for exact matching
  pg_search_scope :search_by_sum_formula,  against: :sum_formula, associated_against: {
    molecule: :sum_formular
  }

  pg_search_scope :search_by_iupac_name, associated_against: {
    molecule: :iupac_name
  }

  pg_search_scope :search_by_inchistring, associated_against: {
    molecule: :inchistring
  }

  pg_search_scope :search_by_inchikey, associated_against: {
    molecule: :inchikey
  }

  pg_search_scope :search_by_cano_smiles, associated_against: {
    molecule: :cano_smiles
  }

  pg_search_scope :search_by_substring, against: %i[
    name short_label external_label
  ], associated_against: {
    molecule: %i[sum_formular iupac_name inchistring inchikey cano_smiles]
  }, using: { trigram: { threshold: 0.0001 } }

  pg_search_scope :search_by_sample_name, against: :name
  pg_search_scope :search_by_sample_short_label, against: :short_label
  pg_search_scope :search_by_sample_external_label, against: :external_label

  # scopes for suggestions
  scope :by_residues_custom_info, ->(info, val) { joins(:residues).where("residues.custom_info -> '#{info}' ILIKE ?", "%#{sanitize_sql_like(val)}%")}
  scope :by_name, ->(query) { where('name ILIKE ?', "%#{sanitize_sql_like(query)}%") }
  scope :by_exact_name, ->(query) { where('name ~* :regex', regex: "^([a-zA-Z0-9]+-)?#{sanitize_sql_like(query)}(-?[A-Z])$") }
  scope :by_short_label, ->(query) { where('short_label ILIKE ?', "%#{sanitize_sql_like(query)}%") }
  scope :by_external_label, ->(query) { where('external_label ILIKE ?', "%#{sanitize_sql_like(query)}%") }
  scope :by_molecule_sum_formular, ->(query) {
    decoupled_collection = where(decoupled: true).where('sum_formula ILIKE ?', "%#{sanitize_sql_like(query)}%")
    coupled_collection = where(decoupled: false).joins(:molecule).where('molecules.sum_formular ILIKE ?', "%#{sanitize_sql_like(query)}%")
    where(id: decoupled_collection + coupled_collection)
  }
  scope :with_reactions, -> {
    joins(:reactions_samples)
  }
  scope :with_wellplates, -> {
    joins(:well)
  }
  scope :by_wellplate_ids,         ->(ids) { joins(:wellplates).where('wellplates.id in (?)', ids) }
  scope :by_reaction_reactant_ids, ->(ids) { joins(:reactions_reactant_samples).where('reactions_samples.reaction_id in (?)', ids) }
  scope :by_reaction_product_ids,  ->(ids) { joins(:reactions_product_samples).where('reactions_samples.reaction_id in (?)', ids) }
  scope :by_reaction_material_ids, ->(ids) { joins(:reactions_starting_material_samples).where('reactions_samples.reaction_id in (?)', ids) }
  scope :by_reaction_solvent_ids,  ->(ids) { joins(:reactions_solvent_samples).where('reactions_samples.reaction_id in (?)', ids) }
  scope :by_reaction_ids,          ->(ids) { joins(:reactions_samples).where('reactions_samples.reaction_id in (?)', ids) }


  scope :product_only, -> { joins(:reactions_samples).where("reactions_samples.type = 'ReactionsProductSample'") }
  scope :sample_or_startmat_or_products, -> {
    joins("left join reactions_samples rs on rs.sample_id = samples.id").where("rs.id isnull or rs.\"type\" in ('ReactionsProductSample', 'ReactionsStartingMaterialSample')")
  }

  scope :search_by_fingerprint_sim, ->(molfile, threshold = 0.01) {
    joins(:fingerprint).merge(
      Fingerprint.search_similar(nil, threshold, false, molfile)
    ).order('tanimoto desc')
  }

  scope :search_by_fingerprint_sub, ->(molfile, as_array = false) {
    fp_vector = Chemotion::OpenBabelService.bin_fingerprint_from_molfile(molfile)
    smarts_query = Chemotion::OpenBabelService.get_smiles_from_molfile(molfile)
    samples = joins(:fingerprint).merge(Fingerprint.screen_sub(fp_vector))
    samples = samples.select do |sample|
      Chemotion::OpenBabelService.substructure_match(smarts_query, sample.molfile)
    end
    return samples if as_array

    Sample.where(id: samples.map(&:id))
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
  after_save :update_counter
  after_create :create_root_container
  after_save :update_data_for_reactions

  has_many :collections_samples, inverse_of: :sample, dependent: :destroy
  has_many :collections, through: :collections_samples

  has_many :reactions_samples, dependent: :destroy
  has_many :reactions_starting_material_samples, dependent: :destroy
  has_many :reactions_reactant_samples, dependent: :destroy
  has_many :reactions_solvent_samples, dependent: :destroy
  has_many :reactions_product_samples, dependent: :destroy
  has_many :elements_samples, dependent: :destroy

  has_many :reactions, through: :reactions_samples
  has_many :reactions_as_starting_material, through: :reactions_starting_material_samples, source: :reaction
  has_many :reactions_as_reactant, through: :reactions_reactant_samples, source: :reaction
  has_many :reactions_as_solvent, through: :reactions_solvent_samples, source: :reaction
  has_many :reactions_as_product, through: :reactions_product_samples, source: :reaction

  has_many :devices_samples
  has_many :analyses_experiments

  belongs_to :fingerprint
  belongs_to :user
  belongs_to :molecule_name

  has_one :container, as: :containable
  has_one :well, dependent: :destroy

  has_many :wellplates, through: :well
  has_many :residues, dependent: :destroy
  has_many :elemental_compositions, dependent: :destroy

  has_many :sync_collections_users, through: :collections
  composed_of :amount, mapping: %w[amount_value amount_unit]

  has_ancestry

  belongs_to :creator, foreign_key: :created_by, class_name: 'User'
  belongs_to :molecule

  accepts_nested_attributes_for :molecule_name
  accepts_nested_attributes_for :collections_samples
  accepts_nested_attributes_for :molecule, update_only: true
  accepts_nested_attributes_for :residues, :elemental_compositions, :container,
                                :tag, allow_destroy: true

  validates :purity, :numericality => { :greater_than_or_equal_to => 0.0, :less_than_or_equal_to => 1.0, :allow_nil => true }
  validate :has_collections
  validates :creator, presence: true

  delegate :computed_props, to: :molecule, prefix: true
  delegate :inchikey, to: :molecule, prefix: true, allow_nil: true

  def molecule_sum_formular
    (decoupled? ? sum_formula : molecule&.sum_formular) || ''
  end

  def molecule_iupac_name
    self.molecule ? self.molecule.iupac_name : ''
  end

  def molecule_inchistring
    self.molecule ? self.molecule.inchistring : ''
  end

  def molecule_inchikey
    self.molecule ? self.molecule.inchikey : ''
  end

  def molecule_cano_smiles
    self.molecule ? self.molecule.cano_smiles : ''
  end

  def analyses
    self.container ? self.container.analyses : Container.none
  end

  def self.associated_by_user_id_and_reaction_ids(user_id, reaction_ids)
    (for_user(user_id).by_reaction_ids(reaction_ids)).distinct
  end

  def self.associated_by_user_id_and_wellplate_ids(user_id, wellplate_ids)
    for_user(user_id).by_wellplate_ids(wellplate_ids)
  end

  def create_subsample user, collection_ids, copy_ea = false
    subsample = self.dup
    subsample.name = self.name if self.name.present?
    subsample.external_label = self.external_label if self.external_label.present?

    # Ex(p|t)ensive method to get a proper counter:
    # take into consideration sample children that have been hard/soft deleted
    children_count = self.children.with_deleted.count
    last_child_label = self.children.with_deleted.order('created_at')
                     .where('short_label LIKE ?', "#{self.short_label}-%").last&.short_label
    last_child_counter = last_child_label &&
      last_child_label.match(/^#{self.short_label}-(\d+)/) && $1.to_i || 0

    counter = [last_child_counter, children_count].max
    subsample.short_label = "#{self.short_label}-#{counter + 1}"

    subsample.parent = self
    subsample.created_by = user.id
    subsample.residues_attributes = self.residues.select(:custom_info, :residue_type).as_json
    subsample.elemental_compositions_attributes = self.elemental_compositions.select(
      :composition_type, :data, :loading
    ).as_json if copy_ea

    # associate to arg collections and creator's All collection
    collections = (
      Collection.where(id: collection_ids) | Collection.where(user_id: user, label: 'All', is_locked: true)
    )
    subsample.collections << collections

    subsample.container = Container.create_root_container
    subsample.mol_rdkit = nil if subsample.respond_to?(:mol_rdkit)
    subsample.save! && subsample
  end

  def reaction_description
    reactions.first.try(:description)
  end

  def auto_set_molfile_to_molecules_molfile
    self.molfile = self.molfile.presence || molecule&.molfile
  end

  def validate_stereo(_stereo = {})
    self.stereo ||= Sample::STEREO_DEF
    self.stereo.merge!(_stereo.slice('abs', 'rel'))
    self.stereo['abs'] = 'any' unless Sample::STEREO_ABS.include?(self.stereo['abs'])
    self.stereo['rel'] = 'any' unless Sample::STEREO_REL.include?(self.stereo['rel'])
    self.stereo
  end

  def find_or_create_molecule_based_on_inchikey
    return unless molfile.present?

    return if molecule.present?

    babel_info = Chemotion::OpenBabelService.molecule_info_from_molfile(molfile)
    inchikey = babel_info[:inchikey]
    return unless inchikey.present?

    is_partial = babel_info[:is_partial]
    molfile_version = babel_info[:version]
    if molecule&.inchikey != inchikey || molecule.is_partial != is_partial
      self.molecule = Molecule.find_or_create_by_molfile(molfile, babel_info)
    end
  end

  def find_or_create_fingerprint
    return unless molecule_id_changed? || molfile_changed? || fingerprint_id.nil?
    self.fingerprint_id = Fingerprint.find_or_create_by_molfile(molfile.clone)&.id
  end

  def get_svg_path
    if self.sample_svg_file.present?
      "/images/samples/#{self.sample_svg_file}"
    else
      "/images/molecules/#{self.molecule.molecule_svg_file}"
    end
  end

  def svg_text_path
    text = name.presence || molecule_sum_formular.presence || molecule.iupac_name
    "svg_text/#{text}"
  end

  def loading
    self.residues[0] && self.residues[0].custom_info['loading'].to_f
  end

  def attach_svg
    svg = self.sample_svg_file
    return unless svg.present?

    svg_file_name = "#{SecureRandom.hex(64)}.svg"
    if svg =~ /TMPFILE[0-9a-f]{64}.svg/
      svg_path = Rails.public_path.join('images', 'samples', svg.to_s).to_s
      FileUtils.mv(svg_path, svg_path.gsub(/(TMPFILE\S+)/, svg_file_name))

      self.sample_svg_file = svg_file_name
    elsif svg.start_with?('<?xml')
      svg_path = Rails.public_path.join('images', 'samples', svg_file_name)
      svg_file = File.new(svg_path, 'w+')
      svg_file.write(svg)
      svg_file.close

      self.sample_svg_file = svg_file_name
    end
  end

  def init_elemental_compositions
    residue = self.residues[0]
    return unless molecule_sum_formular.present?

    if residue.present? && self.molfile.include?(' R# ') # case when residue will be deleted
      p_formula = residue.custom_info['formula']
      p_loading = residue.custom_info['loading'].try(:to_d)

      if (loading_full = residue.custom_info['loading_full_conv'])
        d = Chemotion::Calculations.get_composition(molecule_sum_formular, p_formula, loading_full.to_f)
        set_elem_composition_data 'full_conv', d, loading_full
      end

      if p_formula.present?
        d = Chemotion::Calculations.get_composition(molecule_sum_formular, p_formula, (p_loading || 0.0))
        # if it is reaction product then loading has been calculated
        l_type = if residue['custom_info']['loading_type'] == 'mass_diff'
                   'mass_diff'
                 else
                   'loading'
                 end

        unless p_loading.to_f == 0.0
          set_elem_composition_data l_type, d, p_loading
        end
      else
        {}
      end
    else
      d = Chemotion::Calculations.get_composition(molecule_sum_formular)

      set_elem_composition_data 'formula', d
    end

    # init empty object keys for user-calculated composition input
    unless self.elemental_compositions.find { |i| i.composition_type == 'found' }
      clone_data = (d || {}).keys.map do |key|
        [key, nil]
      end.to_h

      set_elem_composition_data 'found', clone_data, 0.0
    end
  end

  def contains_residues
    self.residues.any?
  end

  def preferred_label
    self.external_label.presence || self.molecule_name_hash[:label].presence ||
      self.molecule.iupac_name
  end

  def preferred_tag
    if (tag = self.preferred_label) && tag && tag.length > 20
      tag[0, 20] + '...'
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

  def user_labels
    tag&.taggable_data&.fetch('user_labels', nil)
  end

private

  def has_collections
    if self.collections_samples.blank?
      errors.add(:base, 'must have least one collection')
    end
  end

  def set_elem_composition_data d_type, d_values, loading = nil
    attrs = {
      composition_type: d_type,
      data: d_values,
      loading: loading
    }

    if item = self.elemental_compositions.find{|i| i.composition_type == d_type}
      item.assign_attributes attrs
    else
      self.elemental_compositions << ElementalComposition.new(attrs)
    end
  end

  def check_molfile_polymer_section
    return if decoupled
    return unless self.molfile.include? 'R#'

    lines = self.molfile.lines
    polymers = []
    m_end_index = nil
    lines[4..-1].each_with_index do |line, index|
      polymers << index if line.include? 'R#'
      (m_end_index = index) && break if line.match /M\s+END/
    end

    reg = /(> <PolymersList>[\W\w.\n]+[\d]+)/m
    unless (lines[5 + m_end_index].to_s + lines[6 + m_end_index].to_s).match reg
      if lines[5 + m_end_index].to_s.include? '> <PolymersList>'
        lines.insert(6 + m_end_index, polymers.join(' ') + "\n")
      else
        lines.insert(4 + m_end_index, "> <PolymersList>\n")
        lines.insert(5 + m_end_index, polymers.join(' ') + "\n")
      end
    end

    self.molfile = lines.join
    self.fingerprint_id = Fingerprint.find_or_create_by_molfile(molfile.clone)&.id
  end

  def set_loading_from_ea
    return unless residue = self.residues.first

    # select from cached attributes, don't make a SQL query
    return unless el_composition = self.elemental_compositions.find do |i|
      i.composition_type == 'found'
    end

    el_composition.set_loading self
  end

  def update_data_for_reactions
    update_equivalent_for_reactions
    update_svg_for_reactions
  end

  def update_equivalent_for_reactions
    rel_reaction_id = reactions_samples.first&.reaction_id
    return unless rel_reaction_id

    ReactionsSample.where(reaction_id: rel_reaction_id, type: %w[ReactionsProductSample ReactionsReactantSample ReactionsStartingMaterialSample]).each(&:update_equivalent)
  end

  def update_svg_for_reactions
    reactions.each(&:save)
  end

  def auto_set_short_label
    sh_label = self['short_label']
    return if sh_label =~ /solvents?|reactants?/
    return if short_label && !short_label_changed?

    if sh_label && Sample.find_by(short_label: sh_label)
      if parent && !((parent_label = parent.short_label) =~ /solvents?|reactants?/)
        self.short_label = "#{parent_label}-#{parent.children.count.to_i.succ}"
      elsif creator && creator.counters['samples']
        abbr = self.creator.name_abbreviation
        self.short_label = "#{abbr}-#{self.creator.counters['samples'].to_i.succ}"
      end
    elsif !sh_label && creator && creator.counters['samples']
      abbr = self.creator.name_abbreviation
      self.short_label = "#{abbr}-#{self.creator.counters['samples'].to_i.succ}"
    end
  end

  def update_counter
    return if short_label =~ /solvents?|reactants?/ || self.parent
    return unless short_label_changed?
    return unless short_label =~ /^#{self.creator.name_abbreviation}-\d+$/
    self.creator.increment_counter 'samples'
  end

  def create_root_container
    if self.container == nil
      self.container = Container.create_root_container
    end
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
    return unless molecule_name_id.blank?
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
    density.present? && density.positive? && (!molarity_value.present? || molarity_value.zero?)
  end
end
