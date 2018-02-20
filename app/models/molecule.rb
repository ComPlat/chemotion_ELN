class Molecule < ActiveRecord::Base
  acts_as_paranoid

  include Collectable
  include Taggable

  serialize :cas, Array

  has_many :samples
  has_many :collections, through: :samples
  has_many :molecule_names

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

  def self.find_or_create_by_molfile molfile, is_partial = false

    molfile = self.skip_residues(molfile)

    babel_info = Chemotion::OpenBabelService.molecule_info_from_molfile(molfile)

    inchikey = babel_info[:inchikey]
    unless inchikey.blank?

      #todo: consistent naming
      molecule = Molecule.find_or_create_by(inchikey: inchikey,
        is_partial: is_partial) do |molecule|
        pubchem_info =
          Chemotion::PubchemService.molecule_info_from_inchikey(inchikey)
        molecule.molfile = molfile
        molecule.assign_molecule_data babel_info, pubchem_info
      end
      molecule
    end
  end

  def self.find_or_create_by_molfiles molfiles, is_partial = false, is_compact = true

    bi = Chemotion::OpenBabelService.molecule_info_from_molfiles(molfiles)
    inchikeys = bi.map do |babel_info|
      inchikey = babel_info[:inchikey]
      !inchikey.blank? && inchikey || nil
    end

    compact_iks = inchikeys.compact
    mol_to_get = []

    iks = inchikeys.dup
    unless compact_iks.empty?
      existing_ik = Molecule.where('inchikey IN (?)',compact_iks).pluck(:inchikey)
      mol_to_get = compact_iks - existing_ik
    end
    unless mol_to_get.empty?
      pi = Chemotion::PubchemService.molecule_info_from_inchikeys(mol_to_get)
      pi.each do |pubchem_info|
        ik = pubchem_info[:inchikey]
        Molecule.find_or_create_by(inchikey: ik,
          is_partial: is_partial) do |molecule|
          i =  iks.index(ik)
          iks[i] = nil
          babel_info = bi[i]
          molecule.molfile = molfiles[i]
          molecule.assign_molecule_data babel_info, pubchem_info
        end
      end
    end

    iks = inchikeys.dup
    unless compact_iks.empty?
      existing_ik = Molecule.where('inchikey IN (?)',compact_iks).pluck(:inchikey)
      mol_to_get = compact_iks - existing_ik
    end
    unless mol_to_get.empty?
      mol_to_get.each do |ik|
        Molecule.find_or_create_by(inchikey: ik,
          is_partial: is_partial) do |molecule|
          i =  iks.index(ik)
          iks[i] = nil
          babel_info = bi[i]
          molecule.molfile = molfiles[i]
          molecule.assign_molecule_data babel_info
        end
      end
    end

    molecules = where('inchikey IN (?)',compact_iks)
    if is_compact
      molecules
    else
      iks = inchikeys.dup
      mol_array = Array.new(iks.size)
      molecules.each do |mol|
        i = iks.index(mol.inchikey)
        if i
          iks[i] = nil
          mol_array[i]=mol
        end
      end
      mol_array
    end
  end

  def refresh_molecule_data
    babel_info =
      Chemotion::OpenBabelService.molecule_info_from_molfile(self.molfile)
    inchikey = babel_info[:inchikey]
    unless inchikey.blank?
      pubchem_info =
        Chemotion::PubchemService.molecule_info_from_inchikey(inchikey)

      self.assign_molecule_data babel_info, pubchem_info
      self.save!
    end
  end

  def assign_molecule_data babel_info, pubchem_info={}
    self.inchistring = babel_info[:inchi]
    self.sum_formular = babel_info[:formula]
    self.molecular_weight = babel_info[:mol_wt]
    self.exact_molecular_weight = babel_info[:mass]
    self.iupac_name = pubchem_info[:iupac_name]
    self.names = pubchem_info[:names]

    self.check_sum_formular # correct exact and average MW for resins

    self.attach_svg babel_info[:svg]

    self.cano_smiles = babel_info[:cano_smiles]

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

  # skip residues in molfile and replace with Hydrogens
  # in order to save at least known part of molecule
  def self.skip_residues molfile
    molfile.gsub! /(M.+RGP[\d ]+)/, ''
    molfile.gsub! /(> <PolymersList>[\W\w.\n]+[\d]+)/m, ''

    lines = molfile.split "\n"
    if lines.size > 3
      lines[4..-1].each do |line|
        break if line.match /(M.+END+)/
        line.gsub! ' R# ', ' C  ' # replace residues with Carbons
      end
    end
    lines.join "\n"
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

  def load_cas
    if inchikey.present? && cas.blank?
      xref = Chemotion::PubchemService.xref_from_inchikey(inchikey)
      self.cas = get_cas(xref)
      self.save
    end
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
    index = self.molfile.lines.index { |l| l.match /(M +END)/ }
    self.molfile = self.molfile.lines[0..index].join if index.is_a?(Integer)
  end

  def get_cas xref
    begin
      xref_json = JSON.parse(xref)
      xref_json["InformationList"]["Information"].first["RN"]
    rescue
      []
    end
  end
end
