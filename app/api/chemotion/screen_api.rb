# frozen_string_literal: true

module Chemotion
  class ScreenAPI < Grape::API
    include Grape::Kaminari
    helpers ContainerHelpers
    helpers ParamsHelpers
    helpers CollectionHelpers
    helpers ProfileHelpers

    resource :screens do
      desc "Return serialized screens"
      params do
        optional :collection_id, type: Integer, desc: "Collection id"
        optional :filter_created_at, type: Boolean, desc: 'filter by created at or updated at'
        optional :from_date, type: Integer, desc: 'created_date from in ms'
        optional :to_date, type: Integer, desc: 'created_date to in ms'
      end
      paginate per_page: 5, offset: 0
      before do
        params[:per_page].to_i > 50 && (params[:per_page] = 50)
      end
      get do
        scope = if params[:collection_id]
          begin
            collection = fetch_collection_w_current_user(params[:collection_id])
            collection ? collection.screens.order('created_at DESC') : Screen.none
          rescue ActiveRecord::RecordNotFound
            Screen.none
          end
        else
          # All collection of current_user
          Screen.joins(:collections).where(collections: { user_id: current_user.id }).distinct
        end.includes(:comments, collections: :sync_collections_users).order('created_at DESC')

        from = params[:from_date]
        to = params[:to_date]
        by_created_at = params[:filter_created_at] || false

        scope = scope.created_time_from(Time.at(from)) if from && by_created_at
        scope = scope.created_time_to(Time.at(to) + 1.day) if to && by_created_at
        scope = scope.updated_time_from(Time.at(from)) if from && !by_created_at
        scope = scope.updated_time_to(Time.at(to) + 1.day) if to && !by_created_at

        reset_pagination_page(scope)

        screens = paginate(scope).map do |screen|
          Entities::ScreenEntity.represent(
            screen,
            detail_levels: ElementDetailLevelCalculator.new(user: current_user, element: screen).detail_levels,
            displayed_in_list: true
          )
        end

        { screens: screens }
      end

      desc "Return serialized screen by id"
      params do
        requires :id, type: Integer, desc: "Screen id"
      end
      route_param :id do
        before do
          error!('401 Unauthorized', 401) unless ElementPolicy.new(current_user, Screen.find(params[:id])).read?
        end

        get do
          screen = Screen.find(params[:id])

          present(
            screen,
            with: Entities::ScreenEntity,
            detail_levels: ElementDetailLevelCalculator.new(user: current_user, element: screen).detail_levels,
            root: :screen
          )
        end

        namespace :add_research_plan do
          params do
            requires :collection_id, type: Integer
          end

          post do
            screen = Screen.find(params[:id])
            collection = current_user.collections.find(params[:collection_id])
            number = screen.research_plans.size + 1
            screen.research_plans << ResearchPlan.new(
              body: [],
              collections: [collection],
              creator: current_user,
              name: "New Research Plan #{number} for #{screen.name}",
            )

            present screen, with: Entities::ScreenEntity, root: :screen
          end
        end
      end

      desc "Update screen by id"
      params do
        requires :id, type: Integer, desc: "screen id"
        optional :name, type: String
        optional :collaborator, type: String
        optional :requirements, type: String
        optional :conditions, type: String
        optional :result, type: String
        optional :description, type: Hash
        requires :wellplate_ids, type: Array
        requires :research_plan_ids, type: Array
        requires :container, type: Hash
        optional :segments, type: Array, desc: 'Segments'
        optional :component_graph_data, type: Hash do
          optional :edges, type: Array
          optional :nodes, type: Array
        end
      end
      route_param :id do
        before do
          error!('401 Unauthorized', 401) unless ElementPolicy.new(current_user, Screen.find(params[:id])).update?
        end

        put do
          update_datamodel(params[:container])
          params.delete(:container)

          attributes = declared(params.except(:wellplate_ids, :segments), include_missing: false)

          screen = Screen.find(params[:id])
          screen.update(attributes)
          screen.save_segments(segments: params[:segments], current_user_id: current_user.id)
          old_wellplate_ids = screen.wellplates.pluck(:id)

          #save to profile
          kinds = screen.container&.analyses&.pluck(Arel.sql("extended_metadata->'kind'"))
          recent_ols_term_update('chmo', kinds) if kinds&.length&.positive?

          params[:wellplate_ids].each do |id|
            ScreensWellplate.find_or_create_by(wellplate_id: id, screen_id: params[:id])
          end

          (old_wellplate_ids - params[:wellplate_ids]).each do |id|
            ScreensWellplate.where(wellplate_id: id, screen_id: params[:id]).destroy_all
          end

          present(
            screen,
            with: Entities::ScreenEntity,
            detail_levels: ElementDetailLevelCalculator.new(user: current_user, element: screen).detail_levels,
            root: :screen
          )
        end
      end

      desc "Create a screen"
      params do
        requires :name, type: String
        optional :collaborator, type: String
        optional :requirements, type: String
        optional :conditions, type: String
        optional :result, type: String
        optional :description, type: Hash
        optional :collection_id, type: Integer
        requires :wellplate_ids, type: Array
        requires :research_plan_ids, type: Array
        requires :container, type: Hash
        optional :segments, type: Array, desc: 'Segments'
        optional :component_graph_data, type: JSON
      end
      post do
        attributes = {
          name: params[:name],
          collaborator: params[:collaborator],
          requirements: params[:requirements],
          conditions: params[:conditions],
          result: params[:result],
          description: params[:description],
          research_plan_ids: params[:research_plan_ids],
          component_graph_data: params[:component_graph_data],
        }

        screen = Screen.create(attributes)

        screen.container = update_datamodel(params[:container])
        screen.save!
        screen.save_segments(segments: params[:segments], current_user_id: current_user.id)

        #save to profile
        kinds = screen.container&.analyses&.pluck(Arel.sql("extended_metadata->'kind'"))
        recent_ols_term_update('chmo', kinds) if kinds&.length&.positive?

        collection = (
          params[:collection_id].present? && fetch_collection_w_current_user(params[:collection_id], 1) # 1 = write
        ) || nil
        add_element_to_collection_n_all(screen, collection)

        params[:wellplate_ids].each do |id|
          ScreensWellplate.find_or_create_by(wellplate_id: id, screen_id: screen.id)
        end

        present screen, with: Entities::ScreenEntity, root: :screen
      end
    end
  end
end
