require 'chemotion'

class Sample < ActiveRecord::Base
  has_many :collections_samples
  has_many :collections, through: :collections_samples

  has_many :reactions_starting_material_samples
  has_many :reactions_reactant_samples
  has_many :reactions_product_samples

  has_many :reactions_as_starting_material, through: :reactions_starting_material_samples, source: :reaction
  has_many :reactions_as_reactant, through: :reactions_reactant_samples, source: :reaction
  has_many :reactions_as_product, through: :reactions_product_samples, source: :reaction

  belongs_to :molecule

  composed_of :amount, mapping: %w(amount_value, amount_unit)

  before_save :auto_set_molfile_to_molecules_molfile
  before_save :find_or_create_molecule_based_on_inchikey

  #todo: find_or_create_molecule_based_on_inchikey
  def auto_set_molfile_to_molecules_molfile
    if molecule && molecule.molfile
      self.molfile ||= molecule.molfile
    end
  end

  def find_or_create_molecule_based_on_inchikey
    if molfile
      babel_info = Chemotion::OpenBabelService.molecule_info_from_molfile(molfile)

      inchikey = babel_info[:inchikey]
      unless inchikey.blank?
        unless molecule && molecule.inchikey == inchikey
          svg_file_name = "#{inchikey}.svg"
          svg_file_path = "public/images/molecules/#{svg_file_name}"

          svg_file = File.new(svg_file_path, 'w+')
          svg_file.write(babel_info[:svg])
          svg_file.close

          #todo: consistent naming

          self.molecule = Molecule.find_or_create_by(inchikey: inchikey) do |molecule|

            pubchem_info = Chemotion::PubchemService.molecule_info_from_inchikey(inchikey)

            molecule.molfile = molfile
            molecule.inchistring = babel_info[:inchi]
            molecule.sum_formular = babel_info[:formula]
            molecule.molecular_weight = babel_info[:mol_wt]
            molecule.iupac_name = pubchem_info[:iupac_name]
            molecule.names = pubchem_info[:names]

            molecule.molecule_svg_file = svg_file_name
          end
        end
      end
    end
  end

end
