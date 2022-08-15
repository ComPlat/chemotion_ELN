# frozen_string_literal: true

module Entities
  class ReactionReportEntity < ApplicationEntity
    expose(
      :can_copy,
      :can_update,
      :conditions,
      :dangerous_products,
      :description,
      :duration,
      :id,
      :name,
      :observation,
      :origin,
      :purification,
      :reaction_svg_file,
      :rf_value,
      :rinchi_long_key,
      :rinchi_short_key,
      :rinchi_web_key,
      :role,
      :rxno,
      :short_label,
      :solvent,
      :status,
      :temperature,
      :timestamp_start,
      :timestamp_stop,
      :tlc_description,
      :tlc_solvents,
      :type,
    )

    expose_timestamps

    expose :code_log, using: 'Entities::CodeLogEntity'
    expose :collections, using: 'Entities::CollectionEntity'
    expose :container, using: 'Entities::ContainerEntity'
    expose :products, using: 'Entities::ReactionMaterialReportEntity'
    expose :purification_solvents, using: 'Entities::ReactionMaterialReportEntity'
    expose :reactants, using: 'Entities::ReactionMaterialReportEntity'
    expose :segments, using: 'Entities::SegmentEntity'
    expose :solvents, using: 'Entities::ReactionMaterialReportEntity'
    expose :starting_materials, using: 'Entities::ReactionMaterialReportEntity'
    expose :tag, using: 'Entities::ElementTagEntity'

    private

    def type
      'reaction'
    end

    def can_update
      (options[:policy] && options[:policy].try(:update?)) || false
    end

    def can_copy
      (options[:policy] && options[:policy].try(:copy?)) || false
    end

    def products
      object.reactions_product_samples
    end

    def purification_solvents
      object.reactions_purification_solvent_samples
    end

    def reactants
      object.reactions_reactant_samples
    end

    def solvents
      object.reactions_solvent_samples
    end

    def starting_materials
      object.reactions_starting_material_samples
    end
  end
end
