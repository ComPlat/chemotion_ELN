# frozen_string_literal: true

# Use case for deleting components that are no longer present in the update payload for a sample.
# Deletes this sample's components whose id is not referenced by the payload. An empty or
# all-placeholder payload is authoritative (the client sends [] to clear a mixture), so it
# deletes all existing components. The one exception: if the payload references integer ids
# but none belong to this sample (foreign/parent ids on a freshly split sub-sample), it is not
# describing this sample's rows, so deletion is skipped to avoid wiping real components.
module Usecases
  module Components
    class DeleteRemovedComponents
      # Normalizes defensively (idempotent — Reconcile already passes a normalized
      # array): without indifferent access, a string-keyed payload would make every
      # cp[:id] lookup miss, so referenced_ids would be empty and the payload would
      # wrongly count as an authoritative "delete everything" instruction.
      def initialize(sample_id, components_params)
        @sample_id = sample_id
        @components_params = Usecases::Components::Create.normalize(components_params)
      end

      def execute!
        own_ids = Component.where(sample_id: @sample_id).pluck(:id)

        # (1) Restrict the keep-list to ids that ACTUALLY belong to this sample.
        # Placeholder ids ('new_1') and integer ids that reference another sample's
        # components are ignored — the rows they represent are inserted by Create.
        referenced_ids = @components_params.filter_map { |cp| Integer(cp[:id], exception: false) }
        referenced_own_ids = own_ids & referenced_ids

        # (2) Skip deletion ONLY when the payload carries integer ids but none of
        # them belong to this sample (e.g. a freshly split sub-sample whose
        # serialized components still carry the parent's ids) — that payload isn't
        # describing this sample's rows, so deleting by it would wrongly wipe them.
        # Otherwise the payload is authoritative: an empty or all-placeholder list
        # legitimately means "these are all the components now" (the client sends
        # [] to clear a mixture), so components it no longer references are deleted.
        return if referenced_ids.any? && referenced_own_ids.empty?

        # Delete this sample's components that the payload no longer references.
        Component.where(sample_id: @sample_id, id: own_ids - referenced_own_ids).destroy_all
      end
    end
  end
end
