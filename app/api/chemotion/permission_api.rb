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
          requires :elements_filter, type: Hash do
            optional :sample, type: Hash do
              use :ui_state_params
            end
            optional :reaction, type: Hash do
              use :ui_state_params
            end
            optional :wellplate, type: Hash do
              use :ui_state_params
            end
            optional :screen, type: Hash do
              use :ui_state_params
            end
            optional :research_plan, type: Hash do
              use :ui_state_params
            end
          end
          requires :currentCollection, type: Hash do
            requires :id, type: Integer
            optional :is_sync_to_me, type: Boolean, default: false
          end
        end

        post do
          cid = fetch_collection_id_w_current_user(params[:currentCollection][:id], params[:currentCollection][:is_sync_to_me])
          samples = Sample.by_collection_id(cid).by_ui_state(params[:elements_filter][:sample]).for_user_n_groups(user_ids)
          reactions = Reaction.by_collection_id(cid).by_ui_state(params[:elements_filter][:reaction]).for_user_n_groups(user_ids)
          wellplates = Wellplate.by_collection_id(cid).by_ui_state(params[:elements_filter][:wellplate]).for_user_n_groups(user_ids)
          screens = Screen.by_collection_id(cid).by_ui_state(params[:elements_filter][:screen]).for_user_n_groups(user_ids)

          spl_exist = samples.present?
          rxn_exist = reactions.present?
          wlp_exist = wellplates.present?
          scn_exist = screens.present?

          top_secret_sample = spl_exist ? samples.pluck(:is_top_secret).any? : false
          top_secret_reaction = top_secret_sample || rxn_exist ? reactions.lazy.flat_map(&:samples).map(&:is_top_secret).any? : false
          top_secret_wellplate = top_secret_reaction || wlp_exist ? wellplates.lazy.flat_map(&:samples).map(&:is_top_secret).any? : false
          top_secret_screen = top_secret_wellplate || scn_exist ? screens.lazy.flat_map(&:wellplates).flat_map(&:samples).map(&:is_top_secret).any? : false

          is_top_secret = top_secret_screen

          deletion_allowed_sample = spl_exist ? ElementsPolicy.new(current_user, samples).destroy? : true
          deletion_allowed_reaction = deletion_allowed_sample && rxn_exist ? ElementsPolicy.new(current_user, reactions).destroy? : true
          deletion_allowed_wellplate = deletion_allowed_reaction && wlp_exist ? ElementsPolicy.new(current_user, wellplates).destroy? : true
          deletion_allowed_screen = deletion_allowed_wellplate && scn_exist ? ElementsPolicy.new(current_user, screens).destroy? : true

          deletion_allowed = deletion_allowed_screen

          if deletion_allowed
            sharing_allowed = true
          else
            sharing_allowed_sample = spl_exist ? ElementsPolicy.new(current_user, samples).share? : true
            sharing_allowed_reaction = sharing_allowed_sample && rxn_exist ? ElementsPolicy.new(current_user, reactions).share? : true
            sharing_allowed_wellplate = sharing_allowed_reaction && wlp_exist ? ElementsPolicy.new(current_user, wellplates).share? : true
            sharing_allowed_screen = sharing_allowed_wellplate && scn_exist ? ElementsPolicy.new(current_user, screens).share? : true

            sharing_allowed = sharing_allowed_screen
          end

          { deletion_allowed: deletion_allowed, sharing_allowed: sharing_allowed, is_top_secret: is_top_secret }
        end
      end
    end
  end
end
