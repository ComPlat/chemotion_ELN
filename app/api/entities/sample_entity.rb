# frozen_string_literal: true

module Entities
  class SampleEntity < ApplicationEntity
    expose(
      :ancestor_ids,
      :decoupled,
      :density,
      :external_label,
      :id,
      :is_restricted,
      :is_top_secret,
      :metrics,
      :molecular_mass,
      :molecule_name_hash,
      :molfile,
      :name,
      :pubchem_tag,
      :purity,
      :sample_svg_file,
      :short_label,
      :showed_name,
      :stereo,
      :sum_formula,
      :type,
      :user_labels,
      :xref,
    )

    expose(
      :_contains_residues,
      :boiling_point,
      :can_copy,
      :can_publish,
      :can_update,
      :children_count,
      :description,
      :imported_readout,
      :location,
      :melting_point,
      :molarity_unit,
      :molarity_value,
      :parent_id,
      :reaction_description,
      :real_amount_unit,
      :real_amount_value,
      :solvent,
      :target_amount_unit,
      :target_amount_value,
      unless: ->(instance, options) { displayed_in_list? }
    )

    expose_timestamps

    expose :analyses, using: 'Entities::ContainerEntity', unless: ->(instance, options) { displayed_in_list? }
    expose :code_log, using: 'Entities::CodeLogEntity', unless: ->(instance, options) { displayed_in_list? }
    expose :container, using: 'Entities::ContainerEntity', unless: ->(instance, options) { displayed_in_list? }
    expose :elemental_compositions, using: 'Entities::ElementalCompositionEntity', unless: ->(instance, options) { displayed_in_list? }
    expose :molecule, using: 'Entities::MoleculeEntity'
    expose :residues, using: 'Entities::ResidueEntity', unless: ->(instance, options) { displayed_in_list? }
    expose :segments, using: 'Entities::SegmentEntity', unless: ->(instance, options) { displayed_in_list? }
    expose :tag, using: 'Entities::ElementTagEntity'

    def type
      'sample'
    end

    def _contains_residues
      object.residues.any?
    end

    def is_restricted
      false
    end

    def can_update
      (options[:policy] && options[:policy].try(:update?)) || false
    end

    def can_copy
      (options[:policy] && options[:policy].try(:copy?)) || false
    end

    def can_publish
      (options[:policy] && options[:policy].try(:destroy?)) || false
    end

    def children_count
      return 0 if object.new_record?

      object.children.count.to_i
    end

    def pubchem_tag
      return unless object.molecule
      return unless object.molecule.tag

      object.molecule.tag.taggable_data
    end

    def molfile
      object.molfile&.encode('utf-8', universal_newline: true, invalid: :replace, undef: :replace) if object.respond_to? :molfile
    end

    def parent_id
      object.parent&.id
    end
  end
end
