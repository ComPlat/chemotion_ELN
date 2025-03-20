# frozen_string_literal: true

module Entities
  class SequenceBasedMacromoleculeSampleEntity < ApplicationEntity
    expose! :id
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
  end
end
