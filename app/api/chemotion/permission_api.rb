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

          # checking if the selected elements include any one element that is top secret
          is_top_secret = false
          is_top_secret ||= selected_elements[Sample].any?(&:is_top_secret?)
          is_top_secret ||= selected_elements[Reaction].lazy.flat_map(&:samples).any?(&:is_top_secret?)
          is_top_secret ||= selected_elements[Wellplate].lazy.flat_map(&:samples).any?(&:is_top_secret?)
          is_top_secret ||= selected_elements[Screen].lazy.flat_map(&:wellplates)
                                                          .flat_map(&:samples)
                                                          .any?(&:is_top_secret?)

          deletion_allowed = true
          sharing_allowed = true

          if collection.user != current_user # collection was shared to user
            # set deletion_allowed to false if any of the elements is not allowed to be mass deleted
            [Sample, Reaction, Screen, Wellplate].each do |element_class|
              next if selected_elements[element_class].none?

              deletion_allowed &&= ElementsPolicy.new(current_user, selected_elements[element_class]).destroy_all?
            end

            # permission for deletion includes permission for sharing,
            # so we have to check if the lower permissions for sharing are satisfied
            # when mass deletion is forbidden
            unless deletion_allowed
              [Sample, Reaction, Screen, Wellplate].each do |element_class|
                next if selected_elements[element_class].none?

                sharing_allowed &&= ElementsPolicy.new(current_user, selected_elements[element_class]).share_all?
              end
            end
          end

          { deletion_allowed: deletion_allowed, sharing_allowed: sharing_allowed, is_top_secret: is_top_secret }
        end
      end
    end
  end
end
