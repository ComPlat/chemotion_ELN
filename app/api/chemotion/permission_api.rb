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
        desc "Returns if selected elements contain a top secret sample"
        params do
          use :main_ui_state_params
        end

        post do
          cid = fetch_collection_id_w_current_user(params[:currentCollection][:id], params[:currentCollection][:is_sync_to_me])
          sel, has_sel = {}, {}
          API::ELEMENTS.each do |element|
            ui_state = params[element]
            if ui_state && (ui_state[:checkedAll] || ui_state[:checkedIds].present?)
              element_klass = element.classify.constantize
              sel[element] = element_klass.by_collection_id(cid).by_ui_state(params[:sample])
                                                .for_user_n_groups(user_ids)
            end
            has_sel[element] = sel[element].present?
          end

          is_top_secret = has_sel['sample'] ? sel['sample'].pluck(:is_top_secret).any? : false
          is_top_secret = is_top_secret || (has_sel['reaction'] ? sel['reaction'].lazy.flat_map(&:samples).map(&:is_top_secret).any? : false)
          is_top_secret = is_top_secret || (has_sel['wellplate'] ? sel['wellplate'].lazy.flat_map(&:samples).map(&:is_top_secret).any? : false)
          is_top_secret = is_top_secret || (has_sel['screen'] ? sel['screen'].lazy.flat_map(&:wellplates).flat_map(&:samples).map(&:is_top_secret).any? : false)

          deletion_allowed = true
          sharing_allowed = true

          if (params[:currentCollection][:is_sync_to_me] || params[:currentCollection][:is_shared])
            deletion_allowed = has_sel['sample'] ? ElementsPolicy.new(current_user, has_sel['sample']).destroy? : true
            deletion_allowed = deletion_allowed && (has_sel['reaction'] ? ElementsPolicy.new(current_user, has_sel['reaction']).destroy? : true)
            deletion_allowed = deletion_allowed && (has_sel['wellplate'] ? ElementsPolicy.new(current_user, has_sel['wellplate']).destroy? : true)
            deletion_allowed = deletion_allowed && (has_sel['screen'] ? ElementsPolicy.new(current_user, has_sel['screen']).destroy? : true)

            if deletion_allowed
              sharing_allowed = true
            else
              sharing_allowed = has_sel['sample'] ? ElementsPolicy.new(current_user, has_sel['sample']).share? : true
              sharing_allowed = sharing_allowed && has_sel['reaction'] ? ElementsPolicy.new(current_user, has_sel['reaction']).share? : true
              sharing_allowed = sharing_allowed && has_sel['wellplate'] ? ElementsPolicy.new(current_user, has_sel['wellplate']).share? : true
              sharing_allowed = sharing_allowed && has_sel['screen'] ? ElementsPolicy.new(current_user, has_sel['screen']).share? : true
            end
          end
          { deletion_allowed: deletion_allowed, sharing_allowed: sharing_allowed, is_top_secret: is_top_secret }
        end
      end
    end
  end
end
