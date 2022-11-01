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

    expose :temp_svg, unless: ->(instance, options) { options[:temp_svg].nil? }

    expose :ob_log, unless: ->(instance, options) { options[:ob_log].nil? }

    def temp_svg
      options[:temp_svg]
    end

    def ob_log
      options[:ob_log]
    end

    def molfile
      return unless object.respond_to?(:molfile)

      object.molfile&.encode('utf-8', universal_newline: true, invalid: :replace, undef: :replace)
    end
  end
end
