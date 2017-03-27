module Chemotion
  class PermissionAPI < Grape::API
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
              optional :all, type: Boolean
              optional :included_ids, type: Array
              optional :excluded_ids, type: Array
            end

            optional :reaction, type: Hash do
              optional :all, type: Boolean
              optional :included_ids, type: Array
              optional :excluded_ids, type: Array
            end

            optional :wellplate, type: Hash do
              optional :all, type: Boolean
              optional :included_ids, type: Array
              optional :excluded_ids, type: Array
            end

            optional :screen, type: Hash do
              optional :all, type: Boolean
              optional :included_ids, type: Array
              optional :excluded_ids, type: Array
            end
          end
        end

        post do
          spl_exist = non_empty(params[:elements_filter][:sample])
          rxn_exist = non_empty(params[:elements_filter][:reaction])
          wlp_exist = non_empty(params[:elements_filter][:wellplate])
          scn_exist = non_empty(params[:elements_filter][:screen])

          top_secret_sample = spl_exist ? Sample.for_user(current_user.id).for_ui_state(params[:elements_filter][:sample]).pluck(:is_top_secret).any? : false
          top_secret_reaction = top_secret_sample || rxn_exist ? Reaction.for_user(current_user.id).for_ui_state(params[:elements_filter][:reaction]).lazy.flat_map(&:samples).map(&:is_top_secret).any? : false
          top_secret_wellplate = top_secret_reaction || wlp_exist ? Wellplate.for_user(current_user.id).for_ui_state(params[:elements_filter][:wellplate]).lazy.flat_map(&:samples).map(&:is_top_secret).any? : false
          top_secret_screen = top_secret_wellplate || scn_exist ? Screen.for_user(current_user.id).for_ui_state(params[:elements_filter][:screen]).lazy.flat_map(&:wellplates).flat_map(&:samples).map(&:is_top_secret).any? : false

          is_top_secret = top_secret_screen

          deletion_allowed_sample = spl_exist ? ElementsPolicy.new(current_user, Sample.for_user_n_groups(user_ids).for_ui_state(params[:elements_filter][:sample])).destroy? : true
          deletion_allowed_reaction = deletion_allowed_sample && rxn_exist ? ElementsPolicy.new(current_user, Reaction.for_user_n_groups(user_ids).for_ui_state(params[:elements_filter][:reaction])).destroy? : true
          deletion_allowed_wellplate = deletion_allowed_reaction && wlp_exist ? ElementsPolicy.new(current_user, Wellplate.for_user_n_groups(user_ids).for_ui_state(params[:elements_filter][:wellplate])).destroy? : true
          deletion_allowed_screen = deletion_allowed_wellplate && scn_exist ? ElementsPolicy.new(current_user, Screen.for_user_n_groups(user_ids).for_ui_state(params[:elements_filter][:screen])).destroy? : true

          deletion_allowed = deletion_allowed_screen

          if deletion_allowed
            sharing_allowed = true
          else
            sharing_allowed_sample = spl_exist ? ElementsPolicy.new(current_user, Sample.for_user_n_groups(user_ids).for_ui_state(params[:elements_filter][:sample])).share? : true
            sharing_allowed_reaction = sharing_allowed_sample && rxn_exist ? ElementsPolicy.new(current_user, Reaction.for_user_n_groups(user_ids).for_ui_state(params[:elements_filter][:reaction])).share? : true
            sharing_allowed_wellplate = sharing_allowed_reaction && wlp_exist ? ElementsPolicy.new(current_user, Wellplate.for_user_n_groups(user_ids).for_ui_state(params[:elements_filter][:wellplate])).share? : true
            sharing_allowed_screen = sharing_allowed_wellplate && scn_exist ? ElementsPolicy.new(current_user, Screen.for_user_n_groups(user_ids).for_ui_state(params[:elements_filter][:screen])).share? : true

            sharing_allowed = sharing_allowed_screen
          end

          { deletion_allowed: deletion_allowed, sharing_allowed: sharing_allowed, is_top_secret: is_top_secret }
        end
      end
    end
  end
end
