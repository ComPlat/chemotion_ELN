# frozen_string_literal: true

module Chemotion
  class PermissionAPI < Grape::API
    helpers CollectionHelpers
    helpers ParamsHelpers

    resource :permissions do
      namespace :status do
        desc 'Returns if selected elements contain a top secret sample'
        params do
          use :main_ui_state_params
        end

        post do
          collection = Collection.accessible_for(current_user).find(params[:currentCollection][:id])
          selected_elements = {}

          API::ELEMENTS.each do |element|
            ui_state = params[element]

            element_model = API::ELEMENT_CLASS[element]
            selected_elements[element_model] = []

            if ui_state && (ui_state[:checkedAll] || ui_state[:checkedIds].present?)
              selected_elements[element_model] =
                collection.send(element_model.model_name.route_key).by_ui_state(ui_state)
            end
          end

          # Checking if the selection includes any top-secret sample. is_top_secret is a plain
          # boolean column, so each element type is checked with a single EXISTS query
          # (SELECT 1 ... LIMIT 1) instead of materialising every selected row and walking
          # associations in Ruby (refs: #2783). Samples are reached directly and, for the container
          # types, through their associated samples; the `||` chain stops at the first hit. An
          # unselected type is the empty-array default, so where(id: []) short-circuits to no rows.
          is_top_secret =
            Sample.exists?(id: selected_elements[Sample], is_top_secret: true) ||
            Reaction.where(id: selected_elements[Reaction])
                    .joins(:samples).exists?(samples: { is_top_secret: true }) ||
            Wellplate.where(id: selected_elements[Wellplate])
                     .joins(:samples).exists?(samples: { is_top_secret: true }) ||
            Screen.where(id: selected_elements[Screen])
                  .joins(wellplates: :samples).exists?(samples: { is_top_secret: true })

          deletion_allowed = true
          sharing_allowed = true
          # Unlinking from a shared collection (not destroying the record) is granted at
          # :remove_elements, independently of the owner-only destroy gate above.
          remove_allowed = true
          # Editing element content (e.g. bulk user-label changes) is granted at :edit_elements.
          update_allowed = true

          if collection.user != current_user # collection was shared to user
            # Every selected element type is policed, not just the four legacy ones. A selection the
            # loop skipped (research_plan / cell_line / vessel / device_description / SBMM) would keep
            # the flag at its permissive default, and the UI would offer a Move/Remove/Delete the
            # server then refuses.
            # One policy per selected type, reused across every check below. ElementsPolicy
            # memoizes its own/shared record-id lookups per instance, so building it once keeps
            # the share pass from re-running those queries.
            policies = selected_elements.values.reject(&:none?).map do |scope|
              ElementsPolicy.new(current_user, scope)
            end

            policies.each do |policy|
              deletion_allowed &&= policy.destroy_all?
              remove_allowed &&= policy.remove_all?
              update_allowed &&= policy.update_all?
            end

            # permission for deletion includes permission for sharing,
            # so we have to check if the lower permissions for sharing are satisfied
            # when mass deletion is forbidden
            policies.each { |policy| sharing_allowed &&= policy.share_all? } unless deletion_allowed

            # With nothing selected the loops above police nothing, leaving the permissive
            # defaults untouched. That stale "true" lingers in the client's PermissionStore and
            # makes permission-gated buttons (e.g. Split) flash enabled for a moment when the next
            # selection arrives, before the refreshed status disables them. On a shared collection
            # an empty selection grants no bulk permission, so report false.
            if selected_elements.values.none?(&:any?)
              deletion_allowed = false
              sharing_allowed = false
              remove_allowed = false
              update_allowed = false
            end
          end

          { deletion_allowed: deletion_allowed, sharing_allowed: sharing_allowed,
            remove_allowed: remove_allowed, update_allowed: update_allowed, is_top_secret: is_top_secret }
        end
      end
    end
  end
end
