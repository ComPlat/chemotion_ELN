# frozen_string_literal: true

module Chemotion
  class WellplateAPI < Grape::API # rubocop:disable Metrics/ClassLength
    include Grape::Kaminari
    helpers ContainerHelpers
    helpers ParamsHelpers
    helpers CollectionHelpers
    helpers SampleHelpers
    helpers ProfileHelpers
    helpers UserLabelHelpers

    resource :wellplates do
      namespace :bulk do
        desc 'Bulk create wellplates'
        params do
          requires :wellplates, type: Array do
            requires :name, type: String
            optional :description, type: Hash
            optional :wells, type: Array
            optional :readout_titles, type: Array
            optional :collection_id, type: Integer
            optional :user_labels, type: Array
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
          cid = fetch_collection_id_w_current_user(params[:ui_state][:collection_id],
                                                   params[:ui_state][:is_sync_to_me])
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
        optional :user_label, type: Integer, desc: 'user label'
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
                    Collection.belongs_to_or_shared_by(current_user.id, current_user.group_ids)
                              .find(params[:collection_id]).wellplates
                  rescue ActiveRecord::RecordNotFound
                    Wellplate.none
                  end
                elsif params[:sync_collection_id]
                  begin
                    current_user.all_sync_in_collections_users.find(params[:sync_collection_id]).collection.wellplates
                  rescue ActiveRecord::RecordNotFound
                    Wellplate.none
                  end
                else
                  # All collection of current_user
                  Wellplate.joins(:collections).where(collections: { user_id: current_user.id }).distinct
                end.order('wellplates.created_at DESC')

        from = params[:from_date]
        to = params[:to_date]
        user_label = params[:user_label]
        by_created_at = params[:filter_created_at] || false

        scope = scope.includes_for_list_display
        scope = scope.created_time_from(Time.zone.at(from)) if from && by_created_at
        scope = scope.created_time_to(Time.zone.at(to) + 1.day) if to && by_created_at
        scope = scope.updated_time_from(Time.zone.at(from)) if from && !by_created_at
        scope = scope.updated_time_to(Time.zone.at(to) + 1.day) if to && !by_created_at
        scope = scope.by_user_label(user_label) if user_label

        reset_pagination_page(scope)

        wellplates = paginate(scope).map do |wellplate|
          Entities::WellplateEntity.represent(
            wellplate,
            displayed_in_list: true,
            detail_levels: ElementDetailLevelCalculator.new(user: current_user, element: wellplate).detail_levels,
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
            attachments: Entities::AttachmentEntity.represent(wellplate.attachments),
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
        optional :description, type: Hash
        optional :wells, type: Array
        optional :user_labels, type: Array
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

          wellplate = Usecases::Wellplates::Update.new(declared(params, include_missing: false),
                                                       current_user.id).execute!

          # save to profile
          kinds = wellplate.container&.analyses&.pluck(Arel.sql("extended_metadata->'kind'"))
          recent_ols_term_update('chmo', kinds) if kinds&.length&.positive?

          present(
            wellplate,
            with: Entities::WellplateEntity,
            detail_levels: ElementDetailLevelCalculator.new(user: current_user, element: wellplate).detail_levels,
            root: :wellplate,
          )
        end
      end

      desc 'Create a wellplate'
      params do
        requires :name, type: String
        optional :description, type: Hash
        requires :wells, type: Array
        optional :readout_titles, type: Array
        requires :collection_id, type: Integer
        requires :container, type: Hash
        optional :height, type: Integer, default: 8, values: 1..100
        optional :width, type: Integer, default: 12, values: 1..100
        optional :segments, type: Array, desc: 'Segments'
        optional :user_labels, type: Array
      end
      post do
        container = params[:container]
        params.delete(:container)
        wellplate = Usecases::Wellplates::Create.new(declared(params, include_missing: false), current_user).execute!
        wellplate.container = update_datamodel(container)

        wellplate.save!
        update_element_labels(wellplate, params[:user_labels], current_user.id)

        # save to profile
        kinds = wellplate.container&.analyses&.pluck(Arel.sql("extended_metadata->'kind'"))
        recent_ols_term_update('chmo', kinds) if kinds&.length&.positive?

        present(
          wellplate,
          with: Entities::WellplateEntity,
          detail_levels: ElementDetailLevelCalculator.new(user: current_user, element: wellplate).detail_levels,
          root: :wellplate,
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
          wellplate_ids = Wellplate.for_user(current_user.id).for_ui_state_with_collection(ui_state[:wellplate],
                                                                                           CollectionsWellplate, col_id)
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
            error!('401 Unauthorized', 401) unless ElementPolicy.new(current_user,
                                                                     Wellplate.find(params[:wellplate_id])).update?
          end

          put do
            wellplate_id = params[:wellplate_id]
            attachment_id = params[:attachment_id]
            begin
              import = Import::ImportWellplateSpreadsheet.new(wellplate_id: wellplate_id,
                                                              attachment_id: attachment_id)
              import.process!
              wellplate = import.wellplate
              {
                wellplate: Entities::WellplateEntity.represent(
                  wellplate,
                  detail_levels: ElementDetailLevelCalculator.new(user: current_user,
                                                                  element: wellplate).detail_levels,
                ),
                attachments: Entities::AttachmentEntity.represent(wellplate.attachments),
              }
            rescue StandardError => e
              error!(e, 500)
            end
          end
        end
      end

      namespace :template do
        desc 'Returns an xlsx template for a wellplate'
        params do
          requires :id, type: Integer, desc: 'Wellplate id'
        end
        route_param :id do
          before do
            error!('401 Unauthorized', 401) unless Wellplate.find_by(id: params[:id])
            error!('401 Unauthorized', 401) unless ElementPolicy.new(current_user, Wellplate.find(params[:id])).read?
          end

          get do
            content_type 'application/octet-stream'
            env['api.format'] = :binary
            header['Content-Disposition'] = 'attachment; filename=wellplate_import_template.xlsx'
            header['Content-Transfer-Encoding'] = 'binary'
            wellplate = Wellplate.find(params[:id])
            xlsx_template = Usecases::Wellplates::TemplateCreation.new(wellplate).execute!
            xlsx_template.to_stream.read
          end
        end
      end

      namespace :by_generic_element do
        desc 'Get wellplates for a generic element'
        params do
          requires :element_id, type: Integer, desc: 'Generic element id'
        end
        route_param :element_id do
          get do
            element = Labimotion::Element.find(params[:element_id])
            error!('401 Unauthorized', 401) unless ElementPolicy.new(current_user, element).read?

            wellplate_ids = ElementsWellplate.where(element_id: element.id).pluck(:wellplate_id)
            wellplates = Wellplate.where(id: wellplate_ids).includes(:wells, wells: :sample)
            present wellplates, with: Entities::WellplateEntity, root: :wellplates
          end

          desc 'Update wellplates for a generic element'
          params do
            requires :wellplate_ids, type: Array, desc: 'Wellplate IDs'
          end
          put do
            element = Labimotion::Element.find(params[:element_id])
            error!('401 Unauthorized', 401) unless ElementPolicy.new(current_user, element).update?

            current_ids = ElementsWellplate.where(element_id: element.id).pluck(:wellplate_id)
            new_ids = params[:wellplate_ids] || []

            ids_to_remove = current_ids - new_ids
            if ids_to_remove.any?
              ElementsWellplate.where(element_id: element.id, wellplate_id: ids_to_remove).destroy_all
            end

            ids_to_add = new_ids - current_ids
            ids_to_add.each do |wellplate_id|
              ElementsWellplate.create!(element_id: element.id, wellplate_id: wellplate_id)
            end

            { wellplate_ids: ElementsWellplate.where(element_id: element.id).pluck(:wellplate_id) }
          end
        end
      end
    end
  end
end
