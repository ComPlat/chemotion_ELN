# frozen_string_literal: true

module Entities
  class MoleculeEntity < Grape::Entity
    expose :id, :inchikey, :inchistring, :density, :molecular_weight, :molfile, :melting_point, :boiling_point, :sum_formular, :names, :iupac_name, :molecule_svg_file, :is_partial, :exact_molecular_weight, :cano_smiles, :cas, :molfile_version, :molecule_names

    def molfile
      object.molfile&.encode('utf-8', universal_newline: true, invalid: :replace, undef: :replace) if object.respond_to? :molfile
    end
  end
end
