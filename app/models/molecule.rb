class Molecule < ActiveRecord::Base
  acts_as_paranoid
  include Collectable

  has_many :samples
  has_many :collections, through: :samples

  before_save :sanitize_molfile
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
    sample_ids = ReactionsProductSample.pluck(:sample_id) +
      ReactionsReactantSample.pluck(:sample_id) +
      ReactionsStartingMaterialSample.pluck(:sample_id)
    molecule_ids = Sample.find(sample_ids).flat_map(&:molecule).map(&:id)
    where(id: molecule_ids)
  }
  scope :with_wellplates, -> {
    molecule_ids =
      Wellplate.all.flat_map(&:samples).flat_map(&:molecule).map(&:id)
    where(id: molecule_ids)
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

  def self.find_or_create_by_molfiles molfiles, is_partial = false

    bi = Chemotion::OpenBabelService.molecule_info_from_molfiles(molfiles)

    inchikeys = bi.map.with_index do |babel_info,i|
      inchikey = babel_info[:inchikey]
      !inchikey.blank? && inchikey || nil
    end
    compact_iks = inchikeys.compact
    existing_ik = Molecule.where('inchikey IN (?)',compact_iks).pluck(:inchikey)
    mol_to_get = compact_iks - existing_ik

    unless mol_to_get.empty?
      pi = Chemotion::PubchemService.molecule_info_from_inchikeys(mol_to_get)
      pi.each do |pubchem_info|
        ik = pubchem_info[:inchikey]
        Molecule.find_or_create_by(inchikey: ik,
          is_partial: is_partial) do |molecule|
          i =  inchikeys.index(ik)
          inchikeys[i] = nil
          babel_info = bi[i]
          molecule.molfile = molfiles[i]
          molecule.assign_molecule_data babel_info, pubchem_info
        end
      end
    end

    where('inchikey IN (?)',compact_iks)
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

  def assign_molecule_data babel_info, pubchem_info
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

    lines[4..-1].each do |line|
      break if line.match /(M.+END+)/

      line.gsub! ' R# ', ' H  ' # replace residues with Hydrogens
    end

    lines.join "\n"
  end

  # remove additional H in formula and in molecular_weight
  def check_sum_formular
    return unless self.is_partial

    atomic_weight_h = Chemotion::PeriodicTable.get_atomic_weight 'H'
    self.molecular_weight -= atomic_weight_h
    self.exact_molecular_weight -= atomic_weight_h

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

private

  # TODO: check that molecules are OK and remove this method. fix is in editor
  def sanitize_molfile
    index = self.molfile.lines.index { |l| l.match /(M.+END+)/ }
    self.molfile = self.molfile.lines[0..index].join if index.is_a?(Integer)
  end
end
