module Chemotion
  class CollectionAPI < Grape::API
    helpers CollectionHelpers
    helpers ParamsHelpers
    resource :collections do

      namespace :all do
        desc "Return the 'All' collection of the current user"
        get do
          Collection.get_all_collection_for_user(current_user.id)
        end
      end

      desc "Return collection by id"
      params do
        requires :id, type: Integer, desc: "Collection id"
      end
      route_param :id, requirements: { id: /[0-9]*/ } do
        get do
          Collection.find(params[:id])
        end
      end

      namespace :take_ownership do
        desc "Take ownership of collection with specified id"
        params do
          requires :id, type: Integer, desc: "Collection id"
        end
        route_param :id do
          before do
            error!('401 Unauthorized', 401) unless CollectionPolicy.new(current_user, Collection.find(params[:id])).take_ownership?
          end

          post do
            Usecases::Sharing::TakeOwnership.new(params.merge(current_user_id: current_user.id)).execute!
          end
        end
      end

      desc "Return all locked and unshared serialized collection roots of current user"
      get :locked do
        current_user.collections.includes(:shared_users)
          .locked.unshared.roots.order('label ASC')
      end

      get_child = Proc.new do |children, collects|
        children.each do |obj|
          child = collects.select { |dt| dt['ancestry'] == obj['ancestry_root']}
          get_child.call(child, collects) if child.count>0
          obj[:children] = child
        end
      end

      build_tree = Proc.new do |collects|
        col_tree = []
        collects.collect{ |obj| col_tree.push(obj) if obj['ancestry'].nil? }
        get_child.call(col_tree,collects)
        Entities::CollectionRootEntity.represent(col_tree, serializable: true)
      end

      desc "Return all unlocked unshared serialized collection roots of current user"
      get :roots do
        collects = Collection.where(user_id: current_user.id).unlocked.unshared
        .select(
          <<~SQL
            id, label, ancestry, is_synchronized, permission_level, position, collection_shared_names(user_id, id) as shared_names,
            reaction_detail_level, sample_detail_level, screen_detail_level, wellplate_detail_level, is_locked,is_shared,
            case when (ancestry is null) then cast(id as text) else concat(ancestry, chr(47), id) end as ancestry_root
          SQL
        )
        .as_json
        build_tree.call(collects)
      end

      desc "Return all shared serialized collections"
      get :shared_roots do
        collects = Collection.shared(current_user.id)
        .select(
          <<~SQL
            id, user_id, label,ancestry, permission_level, user_as_json(collections.user_id) as shared_to,
            is_shared, is_locked, is_synchronized, false as is_remoted,
            reaction_detail_level, sample_detail_level, screen_detail_level, wellplate_detail_level,
            case when (ancestry is null) then cast(id as text) else concat(ancestry, chr(47), id) end as ancestry_root
          SQL
        )
        .as_json
        build_tree.call(collects)
      end

      desc "Return all remote serialized collections"
      get :remote_roots do
        collects = Collection.remote(current_user.id).where([" user_id in (select user_ids(?))",current_user.id])
        .select(
          <<~SQL
            id, user_id, label, ancestry, permission_level, user_as_json(collections.shared_by_id) as shared_by,
            case when (ancestry is null) then cast(id as text) else concat(ancestry, chr(47), id) end as ancestry_root,
            reaction_detail_level, sample_detail_level, screen_detail_level, wellplate_detail_level, is_locked, is_shared,
            shared_user_as_json(collections.user_id, #{current_user.id}) as shared_to,position
          SQL
        ).as_json
        build_tree.call(collects)

      end

      desc "Bulk update and/or create new collections"
      patch '/' do
        Collection.bulk_update(current_user.id, params[:collections].as_json(except: :descendant_ids), params[:deleted_ids])
      end

      namespace :shared do
        desc "Update shared collection"
        params do
          requires :id, type: Integer
          requires :collection_attributes, type: Hash do
            requires :permission_level, type: Integer
            requires :sample_detail_level, type: Integer
            requires :reaction_detail_level, type: Integer
            requires :wellplate_detail_level, type: Integer
            requires :screen_detail_level, type: Integer
            optional :research_plan_detail_level, type: Integer
          end
        end

        put ':id' do
          Collection.shared(current_user.id).find(params[:id]).update!(params[:collection_attributes])
        end

        desc "Create shared collections"
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

          sharing_allowed = share_samples && share_reactions &&
            share_wellplates && share_screens && share_research_plans

          error!('401 Unauthorized', 401) if (!sharing_allowed || is_top_secret)
          @sample_ids = samples.pluck(:id)
          @reaction_ids = reactions.pluck(:id)
          @wellplate_ids = wellplates.pluck(:id)
          @screen_ids = screens.pluck(:id)
          @research_plan_ids = research_plans.pluck(:id)
        end

        post do
          uids = params[:user_ids].map do |user_id|
            val = user_id[:value].to_s.downcase
            if val =~ /^[0-9]+$/
              val.to_i
            # elsif val =~ Devise::email_regexp
            else
              User.where(email: val).pluck :id
            end
          end.flatten.compact.uniq
          Usecases::Sharing::ShareWithUsers.new(
            user_ids: uids,
            sample_ids: @sample_ids,
            reaction_ids: @reaction_ids,
            wellplate_ids: @wellplate_ids,
            screen_ids: @screen_ids,
            research_plan_ids: @research_plan_ids,
            collection_attributes: params[:collection_attributes].merge(shared_by_id: current_user.id)
          ).execute!
        end
      end

      namespace :elements do
        desc 'Update the collection of a set of elements by UI state'
        params do
          requires :ui_state, type: Hash, desc: 'Selected elements from the UI'
          optional :collection_id, type: Integer, desc: 'Destination collect id'
          optional :newCollection, type: String, desc: 'Label for a new collion'
        end

        put do
          collection_id = fetch_collection_id_for_assign(params)
          collection = Collection.find_by(id: collection_id)
          # can only move to collection  owned or shared by current_user
          if !collection || params[:is_sync_to_me] || collection.is_shared
            error!('401 Unauthorized collection', 401)
          end
          ui_state = params[:ui_state]
          current_collection_id = ui_state[:currentCollection][:id]
          # cannot moved from 'All' collection
          if Collection.get_all_collection_for_user(current_user)
                       .id == current_collection_id
            error!('401 Cannot move element out of root collection', 401)
          end
          [
            [Sample, :sample, CollectionsSample],
            [Reaction, :reaction, CollectionsReaction],
            [Wellplate, :wellplate, CollectionsWellplate],
            [Screen, :screen, CollectionsScreen],
            [ResearchPlan, :research_plan, CollectionsResearchPlan]
          ].each do |e|
            ids = e[0].for_user(current_user.id).for_ui_state_with_collection(
              ui_state[e[1]], e[2], current_collection_id
            ).compact
            e[2].move_to_collection(ids, current_collection_id, collection_id)
          end
          status 204
        end

        desc 'Assign a collection to a set of elements by UI state'
        params do
          requires :ui_state, type: Hash, desc: 'Selected elements from the UI'
          optional :collection_id, type: Integer, desc: 'Destination collection id'
          optional :newCollection, type: String, desc: 'Label for a new collection'
          optional :is_sync_to_me, type: Boolean, desc: 'Destination collection is_sync_to_me'
        end

        post do
          collection_id = fetch_collection_id_for_assign(params)
          error!('401 Unauthorized collection', 401) unless collection_id
          ui_state = params[:ui_state]
          current_collection_id = ui_state[:currentCollection][:id]
          [
            [Sample, :sample, CollectionsSample],
            [Reaction, :reaction, CollectionsReaction],
            [Wellplate, :wellplate, CollectionsWellplate],
            [Screen, :screen, CollectionsScreen],
            [ResearchPlan, :research_plan, CollectionsResearchPlan]
          ].each do |e|
            ids = e[0].for_user(current_user.id).for_ui_state_with_collection(
              ui_state[e[1]], e[2], current_collection_id
            )
            e[2].create_in_collection(ids, collection_id)
          end
          status 204
        end

        desc "Remove from a collection a set of elements by UI state"
        params do
          requires :ui_state, type: Hash, desc: "Selected elements from the UI"
        end
        delete do
          ui_state = params[:ui_state]
          current_collection_id = ui_state[:currentCollection][:id]

          # Remove Sample
          sample_ids = Sample.for_ui_state_with_collection(
            ui_state[:sample],
            CollectionsSample,
            current_collection_id
          )
          CollectionsSample.remove_in_collection(sample_ids, current_collection_id)

          # Remove Reaction
          reaction_ids = Reaction.for_ui_state_with_collection(
            ui_state[:reaction],
            CollectionsReaction,
            current_collection_id
          )
          CollectionsReaction.remove_in_collection(reaction_ids, current_collection_id)

          # Remove Wellplate
          wellplate_ids = Wellplate.for_ui_state_with_collection(
            ui_state[:wellplate],
            CollectionsWellplate,
            current_collection_id
          )
          CollectionsWellplate.remove_in_collection(wellplate_ids, current_collection_id)

          # Remove Screen
          screen_ids = Screen.for_ui_state_with_collection(
            ui_state[:screen],
            CollectionsScreen,
            current_collection_id
          )
          CollectionsScreen.remove_in_collection(screen_ids, current_collection_id)
          status 204
        end

      end

      namespace :unshared do

        desc "Create an unshared collection"
        params do
          requires :label, type: String, desc: "Collection label"
        end
        post do
          Collection.create(user_id: current_user.id, label: params[:label])
        end

      end

    end
  end
end
