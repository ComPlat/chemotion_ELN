module Chemotion

  def self.molecule_info_from_molfile molfile
    babel_info = OpenBabelService.molecule_info_from_molfile(molfile)
    pubchem_info = PubchemService.molecule_info_from_inchikey(babel_info[:inchikey])

    babel_info.merge(pubchem_info)
  end

  module OpenBabelService

    def self.samplemolfile

      <<-MOLFILE
Molecule Name
  CHEMDOOD08241506543D 0   0.00000     0.00000     0
[Insert Comment Here]
 10 11  0  0  0  0  0  0  0  0  1 V2000
   -0.4330    0.2500    0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0
    0.4330   -0.2500    0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0
    0.4330   -1.2500    0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0
   -0.4330   -1.7500    0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0
   -1.2990   -1.2500    0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0
   -1.2990   -0.2500    0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0
   -0.4330    1.2500    0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0
    0.4330    1.7500    0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0
    1.2990    1.2500    0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0
    1.2990    0.2500    0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0
  1  2  1  0  0  0  0
  2  3  1  0  0  0  0
  3  4  1  0  0  0  0
  4  5  1  0  0  0  0
  5  6  1  0  0  0  0
  6  1  1  0  0  0  0
  1  7  1  0  0  0  0
  7  8  1  0  0  0  0
  8  9  1  0  0  0  0
  9 10  1  0  0  0  0
 10  2  1  0  0  0  0
M  END
      MOLFILE

    end

    def self.molecule_info_from_molfile molfile

      c = OpenBabel::OBConversion.new
      c.set_in_format 'mol'
   
      m = OpenBabel::OBMol.new
      c.read_string m, molfile

      c.set_out_format 'smi'
      smiles = c.write_string(m, false)

      c.set_out_format 'inchi'
      inchi = c.write_string(m, false)

      c.set_out_format 'inchikey'
      inchikey = c.write_string(m, false)

      {
        charge: m.get_total_charge,
        mol_wt: m.get_mol_wt,
        mass: m.get_exact_mass,
        title_legacy: m.get_title,
        spin: m.get_total_spin_multiplicity,
        smiles: smiles,
        inchikey: inchikey,
        inchi: inchi,
        formula: m.get_formula,
        svg: self.svg_from_molfile(molfile)
      }
    end

    private

    def self.svg_from_molfile molfile
      c = OpenBabel::OBConversion.new
      c.set_in_format 'mol'
      c.set_out_format 'svg'

      highlight = ""

      if !highlight.blank? then
        c.add_option 's', OpenBabel::OBConversion::GENOPTIONS, highlight+" green"
      end
      c.set_options 'd u', OpenBabel::OBConversion::OUTOPTIONS
   
      m = OpenBabel::OBMol.new
      c.read_string m, molfile
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
