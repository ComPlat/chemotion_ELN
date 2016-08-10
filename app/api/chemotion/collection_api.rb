module Chemotion
  class CollectionAPI < Grape::API
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
        current_user.collections.locked.unshared.roots.order('label ASC')
      end

      desc "Return all unlocked unshared serialized collection roots of current user"
      get :roots do
        current_user.collections.ordered.unlocked.unshared.roots
      end

      desc "Return all shared serialized collections"
      get :shared_roots do
        Collection.shared(current_user.id).roots.includes(:user)
      end

      desc "Return all remote serialized collections"
      get :remote_roots, each_serializer: CollectionRemoteSerializer do
        current_user.all_collections.remote(current_user.id).roots
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
          end
        end

        put ':id' do
          Collection.shared(current_user.id).find(params[:id]).update!(params[:collection_attributes])
        end

        desc "Create shared collections"
        params do
          requires :elements_filter, type: Hash do
            requires :sample, type: Hash do
              requires :all, type: Boolean
              optional :included_ids, type: Array
              optional :excluded_ids, type: Array
              optional :collection_id
            end

            requires :reaction, type: Hash do
              requires :all, type: Boolean
              optional :included_ids, type: Array
              optional :excluded_ids, type: Array
              optional :collection_id
            end

            requires :wellplate, type: Hash do
              requires :all, type: Boolean
              optional :included_ids, type: Array
              optional :excluded_ids, type: Array
              optional :collection_id
            end

            requires :screen, type: Hash do
              requires :all, type: Boolean
              optional :included_ids, type: Array
              optional :excluded_ids, type: Array
              optional :collection_id
            end
          end
          requires :collection_attributes, type: Hash do
            requires :permission_level, type: Integer
            requires :sample_detail_level, type: Integer
            requires :reaction_detail_level, type: Integer
            requires :wellplate_detail_level, type: Integer
            requires :screen_detail_level, type: Integer
          end
          requires :user_ids, type: Array
          optional :current_collection_id, type: Integer
        end

        before do
          samples = Sample.for_user(current_user.id).for_ui_state(params[:elements_filter][:sample])
          reactions = Reaction.for_user(current_user.id).for_ui_state(params[:elements_filter][:reaction])
          wellplates = Wellplate.for_user(current_user.id).for_ui_state(params[:elements_filter][:wellplate])
          screens = Screen.for_user(current_user.id).for_ui_state(params[:elements_filter][:screen])

          top_secret_sample = samples.pluck(:is_top_secret).any?
          top_secret_reaction = reactions.flat_map(&:samples).map(&:is_top_secret).any?
          top_secret_wellplate = wellplates.flat_map(&:samples).map(&:is_top_secret).any?
          top_secret_screen = screens.flat_map(&:wellplates).flat_map(&:samples).map(&:is_top_secret).any?

          is_top_secret = top_secret_sample || top_secret_wellplate || top_secret_reaction || top_secret_screen

          share_samples = ElementsPolicy.new(current_user, samples).share?
          share_reactions = ElementsPolicy.new(current_user, reactions).share?
          share_wellplates = ElementsPolicy.new(current_user, wellplates).share?
          share_screens = ElementsPolicy.new(current_user, screens).share?

          sharing_allowed = share_samples && share_reactions && share_wellplates && share_screens

          error!('401 Unauthorized', 401) if (!sharing_allowed || is_top_secret)
        end

        post do
          Usecases::Sharing::ShareWithUsers.new(params, current_user).execute!
        end
      end

      namespace :elements do
        desc "Update the collection of a set of elements by UI state"
        params do
          requires :ui_state, type: Hash, desc: "Selected elements from the UI"
          requires :collection_id, type: Integer, desc: "Destination collection id"
        end
        put do

          ui_state = params[:ui_state]
          current_collection_id = ui_state[:currentCollection].id
          collection_id = params[:collection_id]
          unless Collection.find(collection_id).is_shared
            sample_ids = Sample.for_user(current_user.id).for_ui_state_with_collection(
              ui_state[:sample],
              CollectionsSample,
              current_collection_id
            )

            CollectionsSample.where(
              sample_id: sample_ids,
              collection_id: current_collection_id
            ).delete_all

            sample_ids.map { |id|
              CollectionsSample.find_or_create_by(sample_id: id, collection_id: collection_id)
            }

            reaction_ids = Reaction.for_user(current_user.id).for_ui_state_with_collection(
              ui_state[:reaction],
              CollectionsReaction,
              current_collection_id
            )

            CollectionsReaction.where(
              reaction_id: reaction_ids,
              collection_id: current_collection_id
            ).delete_all

            reaction_ids.map { |id|
              CollectionsReaction.find_or_create_by(reaction_id: id, collection_id: collection_id)
            }

            wellplate_ids = Wellplate.for_user(current_user.id).for_ui_state_with_collection(
              ui_state[:wellplate],
              CollectionsWellplate,
              current_collection_id
            )

            CollectionsWellplate.where(
              wellplate_id: wellplate_ids,
              collection_id: current_collection_id
            ).delete_all

            wellplate_ids.map { |id|
              CollectionsWellplate.find_or_create_by(wellplate_id: id, collection_id: collection_id)
            }

            screen_ids = Screen.for_user(current_user.id).for_ui_state_with_collection(
              ui_state[:screen],
              CollectionsScreen,
              current_collection_id
            )

            CollectionsScreen.where(
              screen_id: screen_ids,
              collection_id: current_collection_id
            ).delete_all

            screen_ids.map { |id|
              CollectionsScreen.find_or_create_by(screen_id: id, collection_id: collection_id)
            }
          end
        end

        desc "Assign a collection to a set of elements by UI state"
        params do
          requires :ui_state, type: Hash, desc: "Selected elements from the UI"
          requires :collection_id, type: Integer, desc: "Destination collection id"
        end
        post do
          ui_state = params[:ui_state]
          collection_id = params[:collection_id]
          current_collection_id = ui_state[:currentCollection].id

          Sample.for_user(current_user.id).for_ui_state_with_collection(
            ui_state[:sample],
            CollectionsSample,
            current_collection_id
          ).each do |id|
            CollectionsSample.find_or_create_by(sample_id: id, collection_id: collection_id)
          end

          Reaction.for_user(current_user.id).for_ui_state_with_collection(
            ui_state[:reaction],
            CollectionsReaction,
            current_collection_id
          ).each do |id|
            CollectionsReaction.find_or_create_by(reaction_id: id, collection_id: collection_id)
          end

          Wellplate.for_user(current_user.id).for_ui_state_with_collection(
            ui_state[:wellplate],
            CollectionsWellplate,
            current_collection_id
          ).each do |id|
            CollectionsWellplate.find_or_create_by(wellplate_id: id, collection_id: collection_id)
          end

          Screen.for_user(current_user.id).for_ui_state_with_collection(
            ui_state[:screen],
            CollectionsScreen,
            current_collection_id
          ).each do |id|
            CollectionsScreen.find_or_create_by(screen_id: id, collection_id: collection_id)
          end
        end

        desc "Remove from a collection a set of elements by UI state"
        params do
          requires :ui_state, type: Hash, desc: "Selected elements from the UI"
        end
        delete do
          ui_state = params[:ui_state]
          current_collection_id = ui_state[:currentCollection].id

          sample_ids = Sample.for_ui_state_with_collection(
            ui_state[:sample],
            CollectionsSample,
            current_collection_id
          )

          CollectionsSample.where(
            sample_id: sample_ids,
            collection_id: current_collection_id
          ).delete_all

          reaction_ids = Reaction.for_ui_state_with_collection(
            ui_state[:reaction],
            CollectionsReaction,
            current_collection_id
          )

          CollectionsReaction.where(
            reaction_id: reaction_ids,
            collection_id: current_collection_id
          ).delete_all

          wellplate_ids = Wellplate.for_ui_state_with_collection(
            ui_state[:wellplate],
            CollectionsWellplate,
            current_collection_id
          )

          CollectionsWellplate.where(
            wellplate_id: wellplate_ids,
            collection_id: current_collection_id
          ).delete_all

          screen_ids = Screen.for_ui_state_with_collection(
            ui_state[:screen],
            CollectionsScreen,
            current_collection_id
          )

          CollectionsScreen.where(
            screen_id: screen_ids,
            collection_id: current_collection_id
          ).delete_all
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
