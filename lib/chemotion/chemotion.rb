module Chemotion
  def self.molecule_info_from_molfile molfile
    babel_info = OpenBabelService.molecule_info_from_molfile(molfile)
    pubchem_info = PubchemService.molecule_info_from_inchikey(babel_info[:inchikey])

    babel_info.merge(pubchem_info)
  end
end
