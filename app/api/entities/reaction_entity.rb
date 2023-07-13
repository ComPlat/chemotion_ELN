# frozen_string_literal: true

# rubocop:disable Layout/ExtraSpacing, Layout/LineLength
module Entities
  class ReactionEntity < ApplicationEntity
    with_options(anonymize_below: 0) do
      expose! :can_copy,                                    unless: :displayed_in_list
      expose! :can_update,                                  unless: :displayed_in_list
      expose! :description,                                 unless: :displayed_in_list
      expose! :id
      expose! :is_restricted
      expose! :observation,                                 unless: :displayed_in_list
      expose! :products,                                                                using: 'Entities::ReactionMaterialEntity'
      expose! :purification_solvents, anonymize_with: [],                               using: 'Entities::ReactionMaterialEntity'
      expose! :reactants,                                                               using: 'Entities::ReactionMaterialEntity'
      expose! :role
      expose! :solvents,                                                                using: 'Entities::ReactionMaterialEntity'
      expose! :starting_materials,                                                      using: 'Entities::ReactionMaterialEntity'
      expose! :type
      expose :comment_count
    end

    with_options(anonymize_below: 10) do
      expose! :code_log,              anonymize_with: nil,                              using: 'Entities::CodeLogEntity'
      expose! :conditions,                                  unless: :displayed_in_list
      expose! :container,             anonymize_with: nil,                              using: 'Entities::ContainerEntity'
      expose! :dangerous_products,    anonymize_with: [],   unless: :displayed_in_list
      expose! :duration,                                    unless: :displayed_in_list
      expose! :name
      expose! :origin
      expose! :purification,          anonymize_with: [],   unless: :displayed_in_list
      expose! :reaction_svg_file
      expose! :rf_value,                                    unless: :displayed_in_list
      expose! :rinchi_long_key
      expose! :rinchi_short_key
      expose! :rinchi_web_key
      expose! :rxno
      expose! :segments,              anonymize_with: [],                               using: 'Entities::SegmentEntity'
      expose! :short_label
      expose! :solvent,                                     unless: :displayed_in_list
      expose! :status
      expose! :tag,                   anonymize_with: nil,                              using: 'Entities::ElementTagEntity'
      expose! :temperature,                                 unless: :displayed_in_list
      expose! :timestamp_start,                             unless: :displayed_in_list
      expose! :timestamp_stop,                              unless: :displayed_in_list
      expose! :tlc_description,                             unless: :displayed_in_list
      expose! :tlc_solvents,                                unless: :displayed_in_list
      expose! :variations, anonymize_with: []
    end

    expose_timestamps

    private

    def can_update
      options[:policy].try(:update?) || false
    end

    def can_copy
      options[:policy].try(:copy?) || false
    end

    def code_log
      displayed_in_list? ? nil : object.code_log
    end

    def container
      displayed_in_list? ? nil : object.container
    end

    def is_restricted # rubocop:disable Naming/PredicateName
      detail_levels[Reaction] < 10
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

    def comment_count
      object.comments.count
    end
  end
end
# rubocop:enable Layout/ExtraSpacing, Layout/LineLength
