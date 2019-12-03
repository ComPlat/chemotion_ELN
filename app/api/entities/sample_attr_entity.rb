module Entities
  class SampleAttrEntity < Grape::Entity
    expose :id, documentation: { type: "Integer", desc: "Sample's unique id"}
    expose :type, :name, :short_label, :description, :created_at, :updated_at,
    :target_amount_value, :target_amount_unit, :real_amount_value, :location,
    :real_amount_unit, :molfile, :solvent, :molarity_value, :molarity_unit,
    :is_top_secret, :is_restricted, :external_label, :analyses, :purity,
    :children_count, :parent_id, :imported_readout, :_contains_residues,
    :sample_svg_file, :density, :boiling_point, :melting_point, :stereo,
    :reaction_description, :container, :metrics,
    :pubchem_tag, :xref, :code_log,
    :can_update, :can_publish, :molecule_name_hash, #:molecule_computed_props,
    :showed_name

    def created_at
      object.created_at.strftime("%d.%m.%Y, %H:%M")
    end

    def updated_at
      object.updated_at.strftime("%d.%m.%Y, %H:%M")
    end

    def type
      'sample'
    end

    def _contains_residues
      object.residues.any?
    end

    def is_restricted
      false
    end

    def children_count
      unless object.new_record?
        object.children.count.to_i
      end
    end

    def pubchem_tag
      unless object.molecule
        nil
      else
        if object.molecule.tag
          object.molecule.tag.taggable_data
        else
          nil
        end
      end
    end

    def can_update
      false
    end

    def can_publish
      false
    end

  end
end
