# frozen_string_literal: true

module Chemotion
  class PermissionAPI < Grape::API
    helpers CollectionHelpers
    helpers ParamsHelpers
    helpers do
      def non_empty(filter)
        return true if filter.all
        return true if filter.included_ids.any?

        false
      end
    end

    resource :permissions do
      namespace :status do
        desc 'Returns if selected elements contain a top secret sample'
        params do
          use :main_ui_state_params
        end

        post do
          cid = Collection.accessible_for(current_user).find(params[:currentCollection][:id])
          sel = {}
          has_sel = {}

          API::ELEMENTS.each do |element|
            ui_state = params[element]

            if ui_state && (ui_state[:checkedAll] || ui_state[:checkedIds].present?)
              element_klass = API::ELEMENT_CLASS[element]
              sel[element_klass.model_name.param_key] = element_klass.by_collection_id(cid)
                                                                     .by_ui_state(ui_state)
                                                                     .for_user_n_groups(user_ids)
            end
            has_sel[element] = sel[element].present?
          end
          is_top_secret = has_sel['sample'] ? sel['sample'].pluck(:is_top_secret).any? : false
          is_top_secret ||= if has_sel['reaction']
                              sel['reaction'].lazy.flat_map(&:samples).map(&:is_top_secret).any?
                            else
                              false
                            end

          is_top_secret ||= if has_sel['wellplate']
                              sel['wellplate'].lazy.flat_map(&:samples).map(&:is_top_secret).any?
                            else
                              false
                            end

          is_top_secret ||= if has_sel['screen']
                              sel['screen'].lazy.flat_map(&:wellplates).flat_map(&:samples).map(&:is_top_secret).any?
                            else
                              false
                            end

          deletion_allowed = true
          sharing_allowed = true
          if params[:currentCollection][:is_shared]
            deletion_allowed = has_sel['sample'] ? ElementsPolicy.new(current_user, sel['sample']).destroy_all? : true
            deletion_allowed &&= (if has_sel['reaction']
                                    ElementsPolicy.new(current_user,
                                                       sel['reaction']).destroy_all?
                                  else
                                    true
                                  end)
            deletion_allowed &&= (if has_sel['wellplate']
                                    ElementsPolicy.new(current_user,
                                                       sel['wellplate']).destroy_all?
                                  else
                                    true
                                  end)
            deletion_allowed &&= (if has_sel['screen']
                                    ElementsPolicy.new(current_user,
                                                       sel['screen']).destroy_all?
                                  else
                                    true
                                  end)
            if deletion_allowed
              sharing_allowed = true
            else
              sharing_allowed = has_sel['sample'] ? ElementsPolicy.new(current_user, sel['sample']).share_all? : true
              sharing_allowed = if sharing_allowed && has_sel['reaction']
                                  ElementsPolicy.new(current_user,
                                                     sel['reaction']).share_all?
                                else
                                  true
                                end
              sharing_allowed = if sharing_allowed && has_sel['wellplate']
                                  ElementsPolicy.new(current_user,
                                                     sel['wellplate']).share_all?
                                else
                                  true
                                end
              sharing_allowed = if sharing_allowed && has_sel['screen']
                                  ElementsPolicy.new(current_user,
                                                     sel['screen']).share_all?
                                else
                                  true
                                end
            end
          end
          { deletion_allowed: deletion_allowed, sharing_allowed: sharing_allowed, is_top_secret: is_top_secret }
        end
      end
    end
  end
end
