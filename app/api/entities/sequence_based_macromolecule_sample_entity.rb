# frozen_string_literal: true

module Entities
  class SequenceBasedMacromoleculeSampleEntity < ApplicationEntity
    expose! :id
    expose! :can_copy
    expose! :can_publish
    expose! :can_update
    expose! :name
    expose! :external_label
    expose! :short_label
    expose! :function_or_application
    expose! :concentration_value
    expose! :concentration_unit
    expose! :molarity_value
    expose! :molarity_unit
    expose! :activity_per_volume_value
    expose! :activity_per_volume_unit
    expose! :activity_per_mass_value
    expose! :activity_per_mass_unit
    expose! :volume_as_used_value
    expose! :volume_as_used_unit
    expose! :amount_as_used_mol_value
    expose! :amount_as_used_mol_unit
    expose! :amount_as_used_mass_value
    expose! :amount_as_used_mass_unit
    expose! :activity_value
    expose! :activity_unit
    expose! :type
    expose! :changed
    expose! :errors

    expose! :heterologous_expression, if: ->(object, options) { !uniprot_protein? }
    expose! :organism, if: ->(object, options) { !uniprot_protein? }
    expose! :taxon_id, if: ->(object, options) { !uniprot_protein? }
    expose! :strain, if: ->(object, options) { !uniprot_protein? }
    expose! :tissue, if: ->(object, options) { !uniprot_protein? }
    expose! :localisation, if: ->(object, options) { !uniprot_protein? }

    expose! :attachments, using: 'Entities::AttachmentEntity'
    expose! :comments, using: 'Entities::CommentEntity'
    expose! :comment_count
    expose! :container, using: 'Entities::ContainerEntity'
    expose! :sequence_based_macromolecule, using: "Entities::SequenceBasedMacromoleculeEntity"
    expose! :tag, using: 'Entities::ElementTagEntity'

    expose_timestamps

    def type
      'sequence_based_macromolecule_sample'
    end

    def comment_count
      object.comments.count
    end

    # The UI needs this field to track changes
    def changed
      false
    end

    def can_update
      options[:policy].try(:update?) || false
    end

    def can_publish
      options[:policy].try(:destroy?) || false
    end

    def errors
      object.errors || {}
    end

    private

    def uniprot_protein?
      object.sequence_based_macromolecule&.uniprot_derivation == 'uniprot'
    end
  end
end
