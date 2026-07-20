# frozen_string_literal: true

# == Schema Information
#
# Table name: molecules
#
#  id                     :integer          not null, primary key
#  inchikey               :string
#  inchistring            :string
#  density                :float            default(0.0)
#  molecular_weight       :float
#  molfile                :binary
#  melting_point          :float
#  boiling_point          :float
#  sum_formular           :string
#  names                  :string           default([]), is an Array
#  iupac_name             :string
#  molecule_svg_file      :string
#  created_at             :datetime         not null
#  updated_at             :datetime         not null
#  deleted_at             :datetime
#  is_partial             :boolean          default(FALSE), not null
#  exact_molecular_weight :float
#  cano_smiles            :string
#  cas                    :text
#  molfile_version        :string(20)
#
# Indexes
#
#  index_molecules_on_deleted_at                           (deleted_at)
#  index_molecules_on_formula_and_inchikey_and_is_partial  (inchikey,sum_formular,is_partial) UNIQUE
#

# rubocop:disable Metrics/ClassLength

class Molecule < ApplicationRecord
  acts_as_paranoid

  # skip_lcss_callback lets a caller that's collecting ids into its own
  # lcss_batch array (see .schedule_lcss_batch) suppress this particular
  # instance's automatic scheduling; it's a plain per-object attribute, not
  # shared/ambient state, so it's inherently thread-safe.
  attr_accessor :pcid, :ob_log, :skip_lcss_callback
  include Collectable
  include Taggable

  serialize :cas, Array

  has_many :samples
  has_many :collections, through: :samples
  has_many :molecule_names

  has_many :computed_props

  has_many :nmr_simulations, foreign_key: 'molecule_id', dependent: :destroy

  before_save :sanitize_molfile
  after_create :create_molecule_names
  after_create_commit :get_lcss, unless: :skip_lcss_callback
  skip_callback :save, before: :sanitize_molfile, if: :skip_sanitize_molfile
  before_destroy :deindex_inchikey

  # validates_uniqueness_of :inchikey, scope: :is_partial

  # scope for suggestions
  scope :by_iupac_name, -> (query) {
    where('iupac_name ILIKE ?', "%#{sanitize_sql_like(query)}%")
  }
  scope :by_sum_formular, -> (query) {
    where('sum_formular ILIKE ?', "%#{sanitize_sql_like(query)}%")
  }
  scope :by_inchistring, -> (query) {
    where('inchistring ILIKE ?', "%#{sanitize_sql_like(query)}%")
  }
  scope :by_inchikey, -> (query) {
    where('inchikey ILIKE ?', "%#{sanitize_sql_like(query)}%")
  }
  scope :by_cano_smiles, -> (query) {
    where('cano_smiles ILIKE ?', "%#{sanitize_sql_like(query)}%")
  }

  scope :with_reactions, lambda {
    joins(:samples).joins('inner join reactions_samples rs on rs.sample_id = samples.id')
  }

  scope :with_wellplates, lambda {
    joins(:samples).joins('inner join wells w on w.sample_id = samples.id')
  }

  def self.find_or_create_dummy
    molecule = Molecule.find_or_create_by(inchikey: 'DUMMY')
  end

  # @param lcss_batch [Array<Integer>, nil] when given, a newly-created molecule's
  #   id is pushed here (and its own automatic LCSS scheduling is suppressed) instead
  #   of scheduling immediately — the caller is responsible for flushing it via
  #   .schedule_lcss_batch once its own batch of creations is done.
  # rubocop:disable Metrics/CyclomaticComplexity, Metrics/PerceivedComplexity, Metrics/AbcSize
  def self.find_or_create_by_molfile(molfile, lcss_batch: nil, **babel_info)
    unless babel_info && babel_info[:inchikey]
      babel_info = Chemotion::OpenBabelService.molecule_info_from_molfile(molfile)
    end
    inchikey = babel_info[:inchikey]
    return if inchikey.blank?

    is_partial = babel_info[:is_partial]
    partial_molfile = babel_info[:molfile]
    # NB: if the molfile has a R# group for solid support (is_partial) then
    #   it has been replaced by C befor getting babel_info (which would have added a fictif CH3 group)
    formula = babel_info[:formula]
    formula = SumFormula.new(formula).remove_fragment('CH3').valid.to_s if is_partial
    molecule = Molecule.find_by(inchikey: inchikey, is_partial: is_partial, sum_formular: formula)
    if molecule.nil?
      molecule = Molecule.create(inchikey: inchikey, is_partial: is_partial, sum_formular: formula) do |mol|
        mol.skip_lcss_callback = true if lcss_batch
        pubchem_info = Chemotion::PubchemService.molecule_info_from_inchikey(inchikey)
        mol.molfile = (is_partial && partial_molfile) || molfile
        mol.assign_molecule_data(babel_info, pubchem_info)
      end
      lcss_batch << molecule.id if lcss_batch && molecule.persisted?
    end
    molecule.ob_log = babel_info[:ob_log]
    molecule
  end
  # rubocop:enable Metrics/CyclomaticComplexity, Metrics/PerceivedComplexity, Metrics/AbcSize

  def self.find_or_create_by_cano_smiles(cano_smiles, lcss_batch: nil)
    molfile = Chemotion::OpenBabelService.molfile_from_cano_smiles(cano_smiles)
    Molecule.find_or_create_by_molfile(molfile, lcss_batch: lcss_batch)
  end

  def self.find_or_create_by_molfiles(molfiles_array)
    babel_info_array = Chemotion::OpenBabelService.molecule_info_from_molfiles(molfiles_array)
    babel_info_array.map.with_index do |babel_info, i|
      if babel_info && babel_info[:inchikey]
        Molecule.find_or_create_by_molfile(molfiles_array[i], babel_info)
      else
        nil
      end
    end
  end

  def refresh_molecule_data
    babel_info = Chemotion::OpenBabelService.molecule_info_from_molfile(self.molfile)
    # this is to not refresh is_partial, because the info has already been removed from the molfile
    babel_info[:is_partial] = self.is_partial
    inchikey = babel_info[:inchikey]

    return unless inchikey.present?
    pubchem_info = Chemotion::PubchemService.molecule_info_from_inchikey(inchikey)
    self.assign_molecule_data babel_info, pubchem_info
    self.save!
  end

  def assign_molecule_data(babel_info, pubchem_info = {})
    self.inchistring = babel_info[:inchi]
    self.sum_formular = babel_info[:formula]
    self.molecular_weight = babel_info[:mol_wt]
    self.exact_molecular_weight = babel_info[:mass]
    self.iupac_name = pubchem_info[:iupac_name]
    self.names = pubchem_info[:names]
    self.pcid = pubchem_info[:cid]

    check_sum_formular
    svg = Molecule.svg_reprocess(babel_info[:svg], molfile)
    attach_svg svg

    self.cano_smiles = babel_info[:cano_smiles]
    self.molfile_version = babel_info[:molfile_version]
    self.is_partial = babel_info[:is_partial]
  end

  def pubchem_lcss
    return unless cid.present?
    # if pubchem_lcss of taggable does not exist, try PubChem API and then update DB and return
    mol_tag = self.tag
    mol_tag_data = mol_tag.taggable_data || {}

    unless mol_tag_data['pubchem_lcss']&.present?
      mol_tag_data['pubchem_lcss'] = Chemotion::PubchemService.lcss_from_cid(cid)
      # updated_at of element_tags(not molecule) is updated
      mol_tag.update taggable_data: mol_tag_data
    end

    mol_tag_data['pubchem_lcss']
  end

  def chem_repo
    { id: self.tag&.taggable_data&.fetch('chemrepo_id', nil) }
  end

  def attach_svg(svg_data)
    svg_data = svg_data.to_s if svg_data.is_a?(Nokogiri::XML::Document)
    return unless svg_data =~ /\A\s*<\?xml/

    svg_file_name = if is_partial
                      "#{SecureRandom.hex(64)}Part.svg"
                    else
                      "#{SecureRandom.hex(64)}.svg"
                    end
    # NB: successiv gsub seems to be faster than a single gsub with a regexp with multiple matches
    File.write(
      full_svg_path(svg_file_name),
      Chemotion::Sanitizer.scrub_svg(svg_data, encoding: 'UTF-8', remap_glyph_ids: true),
    )

    self.molecule_svg_file = svg_file_name
  end

  # remove additional H in formula and in molecular_weight
  def check_sum_formular
    return unless self.is_partial

    atomic_weight_h = Chemotion::PeriodicTable.get_atomic_weight('H') * 3
    self.molecular_weight -= atomic_weight_h # remove CH3
    self.exact_molecular_weight -= atomic_weight_h # remove CH3

    atomic_weight_c = Chemotion::PeriodicTable.get_atomic_weight 'C'
    self.molecular_weight -= atomic_weight_c # remove CH3
    self.exact_molecular_weight -= atomic_weight_c # remove CH3
    self.sum_formular = SumFormula.new(sum_formular).remove_fragment('CH3').valid.to_s
  end

  def load_cas
    return if inchikey.blank?

    self.cas = PubChem.get_cas_from_cid(cid)
    save
  end

  def create_molecule_names
    return if inchikey == 'DUMMY'

    if names.present?
      names.each do |nm|
        molecule_names.create(name: nm, description: 'iupac_name')
      end
    end
    molecule_names.create(name: sum_formular, description: 'sum_formular')
  end

  # Schedules a single PubchemSingleLcssJob for the given ids, re-querying
  # first so only molecules that actually still exist get scheduled (e.g. a
  # caller's own transaction rolling back after collecting some ids into its
  # lcss_batch array shouldn't schedule a job for rows that never persisted).
  def self.schedule_lcss_batch(molecule_ids)
    return if molecule_ids.blank?

    existing_ids = Molecule.where(id: molecule_ids).pluck(:id)
    return if existing_ids.blank?

    PubchemSingleLcssJob.perform_later(existing_ids)
  end

  def get_lcss
    self.class.schedule_lcss_batch([id])
  end

  def create_molecule_name_by_user(new_names, user_id)
    new_names.split(';').each do |new_name|
      next unless unique_molecule_name(new_name)

      molecule_names
        .create(name: new_name, description: "defined by user #{user_id}")
    end
  end

  def unique_molecule_name(new_name)
    mns = molecule_names.map(&:name)
    mns.exclude?(new_name)
  end

  def self.svg_reprocess(svg, struct, service: nil)
    return svg if svg_valid_and_not_openbabel?(svg)

    Chemotion::SvgRenderer.render_svg_from_molfile(struct, service: service)
  end

  def self.svg_valid_and_not_openbabel?(svg)
    svg.present? && svg.exclude?('Open Babel')
  end

  # return the full path of the svg file if it exsits or nil.
  def current_svg_full_path
    file_path = full_svg_path
    file_path&.file? ? file_path : nil
  end

  private

  # This frees the inchikey value from the index
  def deindex_inchikey
    return if inchikey.starts_with?("#{id}_")

    update_columns(inchikey: "#{id}_#{inchikey}") # rubocop:disable Rails/SkipsModelValidations
  end

  # TODO: check that molecules are OK and remove this method. fix is in editor
  def sanitize_molfile
    if self.molfile =~ /^(M +END$)/
      self.molfile = $` + $1
    end
  end

  def cid
    tag.taggable_data['pubchem_cid'] ||
      PubChem.get_cid_from_inchikey(inchikey)
  end

  # build the full path of the molecule svg, return nil if the path can't be built.
  def full_svg_path(svg_file_name = molecule_svg_file)
    return unless svg_file_name.present?

    Rails.public_path.join('images', 'molecules', svg_file_name)
  end
end
# rubocop:enable Metrics/ClassLength
