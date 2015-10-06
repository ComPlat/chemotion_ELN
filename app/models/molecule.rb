class Molecule < ActiveRecord::Base
  has_many :samples

  validates_uniqueness_of :inchikey

  scope :by_formula, ->(query) { where('sum_formular ILIKE ?', "%#{query}%") }

  def self.find_or_create_by_molfile molfile

    babel_info = Chemotion::OpenBabelService.molecule_info_from_molfile(molfile)

    inchikey = babel_info[:inchikey]
    unless inchikey.blank?

      svg_file_name = "#{inchikey}.svg"
      svg_file_path = "public/images/molecules/#{svg_file_name}"

      svg_file = File.new(svg_file_path, 'w+')
      svg_file.write(babel_info[:svg])
      svg_file.close

      #todo: consistent naming

      molecule = Molecule.find_or_create_by(inchikey: inchikey) do |molecule|
        pubchem_info = Chemotion::PubchemService.molecule_info_from_inchikey(inchikey)

        molecule.molfile = molfile
        molecule.inchistring = babel_info[:inchi]
        molecule.sum_formular = babel_info[:formula]
        molecule.molecular_weight = babel_info[:mol_wt]
        molecule.iupac_name = pubchem_info[:iupac_name]
        molecule.names = pubchem_info[:names]

        molecule.molecule_svg_file = svg_file_name
      end
      molecule
    end
  end

end
