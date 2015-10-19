module Chemotion
  class PermissionAPI < Grape::API
    resource :permissions do

      namespace :top_secret do
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
          top_secret_sample = Sample.for_user(current_user.id).for_ui_state(params[:elements_filter][:sample]).pluck(:is_top_secret).any?
          top_secret_reaction = Reaction.for_user(current_user.id).for_ui_state(params[:elements_filter][:reaction]).flat_map(&:samples).map(&:is_top_secret).any?
          top_secret_wellplate = Wellplate.for_user(current_user.id).for_ui_state(params[:elements_filter][:wellplate]).flat_map(&:samples).map(&:is_top_secret).any?
          top_secret_screen = Screen.for_user(current_user.id).for_ui_state(params[:elements_filter][:screen]).flat_map(&:wellplates).flat_map(&:samples).map(&:is_top_secret).any?

          is_top_secret = top_secret_sample || top_secret_wellplate || top_secret_reaction || top_secret_screen

          {is_top_secret: is_top_secret}
        end
      end

      namespace :sharing do
        desc "Returns if selected elements may be shared"
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
          sharing_allowed_sample = ElementsPolicy.new(current_user, Sample.for_user(current_user.id).for_ui_state(params[:elements_filter][:sample])).share?
          sharing_allowed_reaction = ElementsPolicy.new(current_user, Reaction.for_user(current_user.id).for_ui_state(params[:elements_filter][:reaction])).share?
          sharing_allowed_wellplate = ElementsPolicy.new(current_user, Wellplate.for_user(current_user.id).for_ui_state(params[:elements_filter][:wellplate])).share?
          sharing_allowed_screen = ElementsPolicy.new(current_user, Screen.for_user(current_user.id).for_ui_state(params[:elements_filter][:screen])).share?

          sharing_allowed = sharing_allowed_sample && sharing_allowed_reaction && sharing_allowed_wellplate && sharing_allowed_screen

          {sharing_allowed: sharing_allowed}
        end
      end

      namespace :deletion do
        desc "Returns if selected elements may be deleted"
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
          deletion_allowed_sample = ElementsPolicy.new(current_user, Sample.for_user(current_user.id).for_ui_state(params[:elements_filter][:sample])).destroy?
          deletion_allowed_reaction = ElementsPolicy.new(current_user, Reaction.for_user(current_user.id).for_ui_state(params[:elements_filter][:reaction])).destroy?
          deletion_allowed_wellplate = ElementsPolicy.new(current_user, Wellplate.for_user(current_user.id).for_ui_state(params[:elements_filter][:wellplate])).destroy?
          deletion_allowed_screen = ElementsPolicy.new(current_user, Screen.for_user(current_user.id).for_ui_state(params[:elements_filter][:screen])).share?

          deletion_allowed = deletion_allowed_sample && deletion_allowed_reaction && deletion_allowed_wellplate && deletion_allowed_screen

          {deletion_allowed: deletion_allowed}
        end
      end
    end
  end
end
