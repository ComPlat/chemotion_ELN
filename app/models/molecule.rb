class Molecule < ActiveRecord::Base
  acts_as_paranoid
  include Collectable

  has_many :samples
  has_many :collections, through: :samples

  validates_uniqueness_of :inchikey, scope: :is_partial

  # scope for suggestions
  scope :by_sum_formular, ->(query) { where('sum_formular ILIKE ?', "%#{query}%") }
  scope :by_iupac_name, ->(query) { where('iupac_name ILIKE ?', "%#{query}%") }
  scope :with_reactions, -> {
    sample_ids = ReactionsProductSample.pluck(:sample_id) + ReactionsReactantSample.pluck(:sample_id) + ReactionsStartingMaterialSample.pluck(:sample_id)
    molecule_ids = Sample.find(sample_ids).flat_map(&:molecule).map(&:id)
    where(id: molecule_ids)
  }
  scope :with_wellplates, -> {
    molecule_ids = Wellplate.all.flat_map(&:samples).flat_map(&:molecule).map(&:id)
    where(id: molecule_ids)
  }

  def self.find_or_create_by_molfile molfile, is_partial = false

    molfile = self.skip_residues(molfile) if is_partial

    babel_info = Chemotion::OpenBabelService.molecule_info_from_molfile(molfile)

    inchikey = babel_info[:inchikey]
    unless inchikey.blank?

      #todo: consistent naming

      molecule = Molecule.find_or_create_by(inchikey: inchikey, is_partial: is_partial) do |molecule|
        pubchem_info = Chemotion::PubchemService.molecule_info_from_inchikey(inchikey)

        molecule.molfile = molfile
        molecule.inchistring = babel_info[:inchi]
        molecule.sum_formular = babel_info[:formula]
        molecule.molecular_weight = babel_info[:mol_wt]
        molecule.iupac_name = pubchem_info[:iupac_name]
        molecule.names = pubchem_info[:names]

        molecule.attach_svg babel_info[:svg]

        molecule.check_sum_formular

      end
      molecule
    end
  end

  def attach_svg svg_data
    return if self.molecule_svg_file.present? # we usually don't need update

    svg_file_name = if self.is_partial
      "#{self.inchikey}Part.svg"
    else
      "#{self.inchikey}.svg"
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

    self.molecular_weight -= Chemotion::PeriodicTable.get_atomic_weight 'H'

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

end
