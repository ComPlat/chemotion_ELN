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
      return if object.molfile.nil?

      mf = object.molfile.dup.force_encoding('UTF-8')
      if mf.valid_encoding?
        mf.encode('UTF-8', universal_newline: true)
      else
        mf.encode('UTF-8', 'binary', invalid: :replace, undef: :replace, universal_newline: true)
      end
    end
  end
end
