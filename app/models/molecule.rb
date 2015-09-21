require 'chemotion'
class Molecule < ActiveRecord::Base
  has_many :samples

  validates_uniqueness_of :inchikey

  def self.valuesFromPubchemByMolfile(molfile)
    data = Chemotion::OpenBabelService.molecule_info_from_molfile(molfile)
    pubchem_info = Chemotion::PubchemService.molecule_info_from_inchikey(data[:inchikey])

    svg_file_name = "#{data[:inchikey]}.svg"
    svg_file_path = "public/images/molecules/#{svg_file_name}"
    svg_file = File.new(svg_file_path, 'w+')
    svg_file.write(data[:svg])
    svg_file.close
    {
      molfile: molfile,
      inchistring: data[:inchi],
      sum_formular: data[:formula],
      molecular_weight: data[:mol_wt],
      iupac_name: pubchem_info[:iupac_name],
      names: pubchem_info[:names],
      molecule_svg_file: svg_file_name
    }
  end

end
