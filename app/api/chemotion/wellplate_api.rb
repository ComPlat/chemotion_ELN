# frozen_string_literal: true

module Chemotion
  class WellplateAPI < Grape::API
    include Grape::Kaminari
    helpers ContainerHelpers
    helpers ParamsHelpers
    helpers CollectionHelpers
    helpers SampleHelpers
    helpers ProfileHelpers

    resource :wellplates do
      namespace :bulk do
        desc 'Bulk create wellplates'
        params do
          requires :wellplates, type: Array do
            requires :name, type: String
            optional :size, type: Integer
            optional :description, type: Hash
            optional :wells, type: Array
            optional :readout_titles, type: Array
            optional :collection_id, type: Integer
          end
        end
        post do
          Usecases::Wellplates::BulkCreate.new(declared(params, include_missing: false), current_user).execute!
          body false
        end
      end

      namespace :ui_state do
        desc 'Get Wellplates by UI state'
        params do
          requires :ui_state, type: Hash, desc: 'Selected wellplates from the UI' do
            use :ui_state_params
          end
        end
        # we are using POST because the fetchers don't support GET requests with body data
        post do
          params_cid = params[:ui_state][:collection_id]
          cid = params_cid && fetch_collection_w_current_user(params_cid)&.id
          wellplates = Wellplate
                       .includes_for_list_display
                       .by_collection_id(cid)
                       .by_ui_state(params[:ui_state])
                       .for_user(current_user.id)
          error!('401 Unauthorized', 401) unless ElementsPolicy.new(current_user, wellplates).read?

          present wellplates, with: Entities::WellplateEntity, root: :wellplates, displayed_in_list: true
        end
      end

      desc 'Return serialized wellplates'
      params do
        optional :collection_id, type: Integer, desc: 'Collection id'
        optional :sync_collection_id, type: Integer, desc: 'SyncCollectionsUser id'
        optional :filter_created_at, type: Boolean, desc: 'filter by created at or updated at'
        optional :from_date, type: Integer, desc: 'created_date from in ms'
        optional :to_date, type: Integer, desc: 'created_date to in ms'
      end
      paginate per_page: 5, offset: 0
      before do
        params[:per_page].to_i > 50 && (params[:per_page] = 50)
      end
      get do
        scope = begin
                  collection = fetch_collection_w_current_user(params[:collection_id])
                  collection ? collection.wellplates.order('created_at DESC') : Wellplate.none
                rescue ActiveRecord::RecordNotFound
                  Wellplate.none
                end

        from = params[:from_date]
        to = params[:to_date]
        by_created_at = params[:filter_created_at] || false

        scope = scope.includes_for_list_display
        scope = scope.created_time_from(Time.at(from)) if from && by_created_at
        scope = scope.created_time_to(Time.at(to) + 1.day) if to && by_created_at
        scope = scope.updated_time_from(Time.at(from)) if from && !by_created_at
        scope = scope.updated_time_to(Time.at(to) + 1.day) if to && !by_created_at

        reset_pagination_page(scope)

        wellplates = paginate(scope).map do |wellplate|
          Entities::WellplateEntity.represent(
            wellplate,
            displayed_in_list: true,
            detail_levels: ElementDetailLevelCalculator.new(user: current_user, element: wellplate).detail_levels
          )
        end

        { wellplates: wellplates }
      end

      desc 'Return serialized wellplate by id'
      params do
        requires :id, type: Integer, desc: 'Wellplate id'
      end
      route_param :id do
        before do
          error!('401 Unauthorized', 401) unless ElementPolicy.new(current_user, Wellplate.find(params[:id])).read?
        end

        get do
          wellplate = Wellplate.find(params[:id])
          detail_levels = ElementDetailLevelCalculator.new(user: current_user, element: wellplate).detail_levels

          {
            wellplate: Entities::WellplateEntity.represent(wellplate, detail_levels: detail_levels),
            attachments: Entities::AttachmentEntity.represent(wellplate.attachments)
          }
        end
      end

      desc 'Delete a wellplate by id'
      params do
        requires :id, type: Integer, desc: 'Wellplate id'
      end
      route_param :id do
        before do
          error!('401 Unauthorized', 401) unless ElementPolicy.new(current_user, Wellplate.find(params[:id])).destroy?
        end

        delete do
          present Wellplate.find(params[:id]).destroy, with: Entities::WellplateEntity
        end
      end

      desc 'Update wellplate by id'
      params do
        requires :id, type: Integer
        optional :name, type: String
        optional :size, type: Integer
        optional :description, type: Hash
        optional :wells, type: Array
        optional :readout_titles, type: Array
        requires :container, type: Hash
        optional :segments, type: Array, desc: 'Segments'
      end
      route_param :id do
        before do
          error!('401 Unauthorized', 401) unless ElementPolicy.new(current_user, Wellplate.find(params[:id])).update?
        end

        put do
          update_datamodel(params[:container])
          params.delete(:container)

          wellplate = Usecases::Wellplates::Update.new(declared(params, include_missing: false), current_user.id).execute!

          # save to profile
          kinds = wellplate.container&.analyses&.pluck(Arel.sql("extended_metadata->'kind'"))
          recent_ols_term_update('chmo', kinds) if kinds&.length&.positive?

          present(
            wellplate,
            with: Entities::WellplateEntity,
            detail_levels: ElementDetailLevelCalculator.new(user: current_user, element: wellplate).detail_levels,
            root: :wellplate
          )
        end
      end

      desc 'Create a wellplate'
      params do
        requires :name, type: String
        optional :size, type: Integer
        optional :description, type: Hash
        requires :wells, type: Array
        optional :readout_titles, type: Array
        requires :collection_id, type: Integer
        requires :container, type: Hash
        optional :segments, type: Array, desc: 'Segments'
      end
      post do
        container = params[:container]
        params.delete(:container)

        wellplate = Usecases::Wellplates::Create.new(declared(params, include_missing: false), current_user).execute!
        wellplate.container = update_datamodel(container)

        wellplate.save!

        # save to profile
        kinds = wellplate.container&.analyses&.pluck(Arel.sql("extended_metadata->'kind'"))
        recent_ols_term_update('chmo', kinds) if kinds&.length&.positive?

        present(
          wellplate,
          with: Entities::WellplateEntity,
          detail_levels: ElementDetailLevelCalculator.new(user: current_user, element: wellplate).detail_levels,
          root: :wellplate
        )
      end

      namespace :subwellplates do
        desc 'Split Wellplates into Subwellplates'
        params do
          requires :ui_state, type: Hash, desc: 'Selected wellplates from the UI'
        end
        post do
          ui_state = params[:ui_state]
          col_id = ui_state[:currentCollectionId]
          wellplate_ids = Wellplate.for_user(current_user.id).for_ui_state_with_collection(ui_state[:wellplate], CollectionsWellplate, col_id)
          Wellplate.where(id: wellplate_ids).each do |wellplate|
            wellplate.create_subwellplate current_user, col_id, true
          end

          # Frontend does not use the return value of this api, so we do not need to supply one
          {}
        end
      end

      namespace :import_spreadsheet do
        desc 'Import spreadsheet data to Wellplates and Wells'
        params do
          requires :wellplate_id, type: Integer
          requires :attachment_id, type: Integer
        end
        route_param :wellplate_id do
          before do
            error!('401 Unauthorized', 401) unless ElementPolicy.new(current_user, Wellplate.find(params[:wellplate_id])).update?
          end

          put do
            wellplate_id = params[:wellplate_id]
            attachment_id = params[:attachment_id]
            begin
              import = Import::ImportWellplateSpreadsheet.new(wellplate_id: wellplate_id, attachment_id: attachment_id)
              import.process!
              wellplate = import.wellplate
              {
                wellplate: Entities::WellplateEntity.represent(
                  wellplate,
                  detail_levels: ElementDetailLevelCalculator.new(user: current_user, element: wellplate).detail_levels
                ),
                attachments: Entities::AttachmentEntity.represent(wellplate.attachments)
              }
            rescue StandardError => e
              error!(e, 500)
            end
          end
        end
      end

      namespace :well_label do
        desc 'update well label'
        params do
          requires :id, type: Integer
          requires :label, type: String
        end
        after_validation do
          error!('401 Unauthorized', 401) unless ElementPolicy.new(current_user, Well.find(params[:id]).wellplate).update?
        end
        post do
          well = Well.find(params[:id])
          well.update(label: params[:label])
          { label: well.label }
        end
      end

      namespace :well_color_code do
        desc 'add or update color code'
        params do
          requires :id, type: Integer
          requires :color_code, type: String
        end
        after_validation do
          error!('401 Unauthorized', 401) unless ElementPolicy.new(current_user, Well.find(params[:id]).wellplate).update?
        end
        post do
          well = Well.find(params[:id])
          well.update(color_code: params[:color_code])
          { color_code: well.color_code }
        end
      end
    end
  end
end
