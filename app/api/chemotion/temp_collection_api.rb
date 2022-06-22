module Chemotion
  class TempCollectionAPI < Grape::API
    helpers CollectionHelpers
    helpers ParamsHelpers
    resource :temp_collections do
      namespace :all do
        desc "Return the 'All' collection of the current user"
        get do
          Collection.where(user_id: current_user.id)
                    .joins('left join collection_acls acls on acls.collection_id = collections.id')
                    .includes(collection_acls: :user)
        end
      end
      namespace :shared do
        desc 'Return the collection shared with current user'
        get do
          Collection.joins(:collection_acls).includes(:user).where('collection_acls.user_id = ?', current_user.id)
        end

        desc 'Return shared collection by id'
        params do
          requires :id, type: Integer, desc: 'Collection id'
        end
        route_param :id, requirements: { id: /[0-9]*/ } do
          get do
            current_user.all_acl_collection_users.find(params[:id])
          end
        end

        desc 'Create shared collections'
        params do
          requires :elements_filter, type: Hash do
            requires :sample, type: Hash do
              use :ui_state_params
            end
            requires :reaction, type: Hash do
              use :ui_state_params
            end
            requires :wellplate, type: Hash do
              use :ui_state_params
            end
            requires :screen, type: Hash do
              use :ui_state_params
            end
            optional :research_plan, type: Hash do
              use :ui_state_params
            end
          end
          requires :collection_attributes, type: Hash do
            requires :permission_level, type: Integer
            requires :sample_detail_level, type: Integer
            requires :reaction_detail_level, type: Integer
            requires :wellplate_detail_level, type: Integer
            requires :screen_detail_level, type: Integer
            optional :research_plan_detail_level, type: Integer
            requires :label, type: String
          end
          requires :user_ids, type: Array do
            requires :value
          end
          requires :currentCollection, type: Hash do
            requires :id, type: Integer
            optional :is_sync_to_me, type: Boolean, default: false
          end
        end

        after_validation do
          @cid = fetch_collection_id_w_current_user(params[:currentCollection][:id], params[:currentCollection][:is_sync_to_me])
          samples = Sample.by_collection_id(@cid).by_ui_state(params[:elements_filter][:sample]).for_user_n_groups(user_ids)
          reactions = Reaction.by_collection_id(@cid).by_ui_state(params[:elements_filter][:reaction]).for_user_n_groups(user_ids)
          wellplates = Wellplate.by_collection_id(@cid).by_ui_state(params[:elements_filter][:wellplate]).for_user_n_groups(user_ids)
          screens = Screen.by_collection_id(@cid).by_ui_state(params[:elements_filter][:screen]).for_user_n_groups(user_ids)
          research_plans = ResearchPlan.by_collection_id(@cid).by_ui_state(params[:elements_filter][:research_plan]).for_user_n_groups(user_ids)
          elements = {}
          ElementKlass.find_each { |klass|
            elements[klass.name] = Element.by_collection_id(@cid).by_ui_state(params[:elements_filter][klass.name]).for_user_n_groups(user_ids)
          }
          top_secret_sample = samples.pluck(:is_top_secret).any?
          top_secret_reaction = reactions.flat_map(&:samples).map(&:is_top_secret).any?
          top_secret_wellplate = wellplates.flat_map(&:samples).map(&:is_top_secret).any?
          top_secret_screen = screens.flat_map(&:wellplates).flat_map(&:samples).map(&:is_top_secret).any?

          is_top_secret = top_secret_sample || top_secret_wellplate || top_secret_reaction || top_secret_screen

          share_samples = ElementsPolicy.new(current_user, samples).share?
          share_reactions = ElementsPolicy.new(current_user, reactions).share?
          share_wellplates = ElementsPolicy.new(current_user, wellplates).share?
          share_screens = ElementsPolicy.new(current_user, screens).share?
          share_research_plans = ElementsPolicy.new(current_user, research_plans).share?
          share_elements = !(elements&.length > 0)
          elements.each do |k, v|
            share_elements = ElementsPolicy.new(current_user, v).share?
            break unless share_elements
          end

          sharing_allowed = share_samples && share_reactions &&
          share_wellplates && share_screens && share_research_plans && share_elements
          error!('401 Unauthorized', 401) if (!sharing_allowed || is_top_secret)

          @sample_ids = samples.pluck(:id)
          @reaction_ids = reactions.pluck(:id)
          @wellplate_ids = wellplates.pluck(:id)
          @screen_ids = screens.pluck(:id)
          @research_plan_ids = research_plans.pluck(:id)
          @element_ids = elements&.transform_values { |v| v && v.pluck(:id) }
        end

        post do
          uids = params[:user_ids].map do |user_id|
            val = user_id[:value].to_s.downcase
            if val =~ /^[0-9]+$/
              val.to_i
            else
              User.where(email: val).pluck :id
            end
          end.flatten.compact.uniq
          puts 'okay000000'
          Usecases::Sharing::ShareWithUsers.new(
            user_ids: uids,
            sample_ids: @sample_ids,
            reaction_ids: @reaction_ids,
            wellplate_ids: @wellplate_ids,
            screen_ids: @screen_ids,
            research_plan_ids: @research_plan_ids,
            element_ids: @element_ids,
            collection_attributes: params[:collection_attributes].merge(user_id: current_user.id)
          ).execute!
          Message.create_msg_notification(
            channel_subject: Channel::SHARED_COLLECTION_WITH_ME,
            message_from: current_user.id, message_to: uids,
            data_args: { 'shared_by': current_user.name }, level: 'info'
          )
        end
      end
    end
  end
end


