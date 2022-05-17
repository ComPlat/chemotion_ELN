module Entities
  class ReactionEntity < ApplicationEntity
    expose(
      :id,
      :name,
      :origin,
      :reaction_svg_file,
      :rinchi_long_key,
      :rinchi_short_key,
      :rinchi_web_key,
      :role,
      :rxno,
      :short_label,
      :status,
      :type,
    )

    expose(
      :can_copy,
      :can_update,
      :conditions,
      :dangerous_products,
      :description,
      :duration,
      :observation,
      :purification,
      :rf_value,
      :solvent,
      :temperature,
      :timestamp_start,
      :timestamp_stop,
      :tlc_description,
      :tlc_solvents,
      unless: ->(instance, options) { displayed_in_list? }
    )

    expose_timestamps

    expose :code_log, using: 'Entities::CodeLogEntity'
    expose :container, using: 'Entities::ContainerEntity'
    expose :products, using: 'Entities::MaterialEntity'
    expose :purification_solvents, using: 'Entities::MaterialEntity'
    expose :reactants, using: 'Entities::MaterialEntity'
    expose :segments, using: 'Entities::SegmentEntity'
    expose :solvents, using: 'Entities::MaterialEntity'
    expose :starting_materials, using: 'Entities::MaterialEntity'
    expose :tag, using: 'Entities::ElementTagEntity'

    private

    def code_log
      displayed_in_list? ? nil : object.code_log
    end

    def container
      displayed_in_list? ? nil : object.container
    end

    def products
      displayed_in_list? ? [] : object.reactions_product_samples
    end

    def purification_solvents
      displayed_in_list? ? [] : object.reactions_purification_solvent_samples
    end

    def reactants
      displayed_in_list? ? [] : object.reactions_reactant_samples
    end

    def segments
      displayed_in_list? ? [] : object.segments
    end

    def solvents
      displayed_in_list? ? [] : object.reactions_solvent_samples
    end

    def starting_materials
      displayed_in_list? ? [] : object.reactions_starting_material_samples
    end

    def type
      'reaction'
    end

    def can_update
      (options[:policy] && options[:policy].try(:update?)) || false
    end

    def can_copy
      (options[:policy] && options[:policy].try(:copy?)) || false
    end
  end
end
