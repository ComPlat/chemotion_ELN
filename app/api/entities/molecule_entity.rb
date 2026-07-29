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

    expose :pubchem_cid

    def temp_svg
      options[:temp_svg]
    end

    # At sample detail level 0 {Entities::SampleEntity#molecule} represents a plain Hash of
    # two keys instead of a Molecule, so guard like #molfile does — plainly +expose+d
    # attributes yield nil for a missing Hash key, but a model call would raise.
    def pubchem_cid
      return unless object.respond_to?(:tag)

      object.tag&.taggable_data&.fetch('pubchem_cid', nil)
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
