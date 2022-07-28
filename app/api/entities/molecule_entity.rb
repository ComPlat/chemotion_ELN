# frozen_string_literal: true

module Entities
  class MoleculeEntity < ApplicationEntity
    expose(
      :boiling_point,
      :cano_smiles,
      :cas,
      :density,
      :exact_molecular_weight,
      :id,
      :inchikey,
      :inchistring,
      :is_partial,
      :iupac_name,
      :melting_point,
      :molecular_weight,
      :molecule_svg_file,
      :molfile,
      :molfile_version,
      :names,
      :sum_formular,
    )

    expose :molecule_names, using: 'Entities::MoleculeNameEntity', unless: ->(instance, options) { displayed_in_list? }


    def molfile
      return unless object.respond_to?(:molfile)

      object.molfile&.encode('utf-8', universal_newline: true, invalid: :replace, undef: :replace)
    end
  end
end
