module Chemotion

  def self.molecule_info_from_molfile molfile
    babel_info = OpenBabelService.molecule_info_from_molfile(molfile)
    pubchem_info = PubchemService.molecule_info_from_inchikey(babel_info[:inchikey])

    babel_info.merge(pubchem_info)
  end

  module OpenBabelService

    def self.molecule_info_from_molfile molfile

      {
        inchikey: '14AE8FC2B',
        inchistring: '1S/CH4/h1H4',
        formular: 'CH4',
        svg: svg_from_molfile(molfile)
      }
    end

    private

    def svg_from_molfile molfile
      c = OpenBabel::OBConversion.new
      c.set_in_format 'mol'
      c.set_out_format 'svg'

      if !highlight.blank? then
        c.add_option 's', OpenBabel::OBConversion::GENOPTIONS, highlight+" green"
      end
      c.set_options 'd u', OpenBabel::OBConversion::OUTOPTIONS
   
      m = OpenBabel::OBMol.new
      c.read_string m, self.molfile
      #m.do_transformations c.get_options(OpenBabel::OBConversion::GENOPTIONS), c
      c.write_string(m, false)
    end

  end

  module PubchemService

    def self.molecule_info_from_inchikey inchikey
      {
        iupac_name: 'Methan',
        names: ['Methan','..']
      }
    end

  end

  module Calculations

    class Molecular
      attr_accessor :molecule

      def initialize molecule
        self.molcule = molecule
      end

      #converts an amount from a unit to an other for specific molecule
      def convert_amount amount:, from_unit:, to_unit:
        {
          amount_value: '100.5',
          unit: 'ml'
        }
      end
    end

  end

end
