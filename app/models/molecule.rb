class Molecule < ActiveRecord::Base
  acts_as_paranoid

  attr_accessor :pcid
  include Collectable
  include Taggable

  serialize :cas, Array

  has_many :samples
  has_many :collections, through: :samples
  has_many :molecule_names

  has_many :computed_props

  before_save :sanitize_molfile
  after_create :create_molecule_names
  skip_callback :save, before: :sanitize_molfile, if: :skip_sanitize_molfile

  validates_uniqueness_of :inchikey, scope: :is_partial

  # scope for suggestions
  scope :by_iupac_name, -> (query) {
    where('iupac_name ILIKE ?', "%#{query}%")
  }
  scope :by_sum_formular, -> (query) {
    where('sum_formular ILIKE ?', "%#{query}%")
  }
  scope :by_inchistring, -> (query) {
    where('inchistring ILIKE ?', "%#{query}%")
  }
  scope :by_cano_smiles, -> (query) {
    where('cano_smiles ILIKE ?', "%#{query}%")
  }

  scope :with_reactions, -> {
    joins(:samples).joins("inner join reactions_samples rs on rs.sample_id = samples.id" ).uniq
  }

  scope :with_wellplates, -> {
    joins(:samples).joins("inner join wells w on w.sample_id = samples.id" ).uniq
  }

  def self.find_or_create_by_molfile(molfile, **babel_info)
    unless babel_info && babel_info[:inchikey]
      babel_info = Chemotion::OpenBabelService.molecule_info_from_molfile(molfile)
    end
    inchikey = babel_info[:inchikey]
    return unless inchikey.present?
    is_partial = babel_info[:is_partial]
    partial_molfile = babel_info[:molfile]
    molecule = Molecule.find_or_create_by(inchikey: inchikey, is_partial: is_partial) do |molecule|
      pubchem_info = Chemotion::PubchemService.molecule_info_from_inchikey(inchikey)
      molecule.molfile = partial_molfile || molfile
      molecule.assign_molecule_data(babel_info, pubchem_info)
    end
    molecule
  end

  def self.find_or_create_by_cano_smiles(cano_smiles)
    molfile = Chemotion::OpenBabelService.molfile_from_cano_smiles(cano_smiles)
    Molecule.find_or_create_by_molfile(molfile)
  end

  def self.find_or_create_by_molfiles(molfiles_array)
    babel_info_array = Chemotion::OpenBabelService.molecule_info_from_molfiles(molfiles_array)
    babel_info_array.map.with_index do |babel_info, i|
      if babel_info[:inchikey]
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
    self.check_sum_formular # correct exact and average MW for resins

    self.attach_svg babel_info[:svg]

    self.cano_smiles = babel_info[:cano_smiles]
    self.molfile_version = babel_info[:molfile_version]
    self.is_partial = babel_info[:is_partial]
  end

  def attach_svg svg_data
    return unless svg_data.match /\A<\?xml/

    svg_file_name = if self.is_partial
      "#{SecureRandom.hex(64)}Part.svg"
    else
      "#{SecureRandom.hex(64)}.svg"
    end
    svg_file_path = "public/images/molecules/#{svg_file_name}"

    svg_file = File.new(svg_file_path, 'w+')
    svg_file.write(svg_data)
    svg_file.close

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

    fdata = Chemotion::Calculations.parse_formula self.sum_formular, true
    self.sum_formular = fdata.map do |key, value|
      if value == 0
        ''
      elsif value == 1
        key
      else
        key + value.to_s
      end
    end.join
  end

  def load_cas(force = false)
    return unless inchikey.present?
    return unless force || cas.blank?
    self.cas = PubChem.get_cas_from_cid(cid)
    save
  end

  def create_molecule_names
    if names.present?
      names.each do |nm|
        molecule_names.create(name: nm, description: 'iupac_name')
      end
    end
    molecule_names.create(name: sum_formular, description: 'sum_formular')
  end

  def create_molecule_name_by_user(new_name, user_id)
    return unless unique_molecule_name(new_name)
    molecule_names
      .create(name: new_name, description: "defined by user #{user_id}")
  end

  def unique_molecule_name(new_name)
    mns = molecule_names.map(&:name)
    !mns.include?(new_name)
  end

private

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
end
