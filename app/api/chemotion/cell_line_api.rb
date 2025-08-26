# frozen_string_literal: true

module Chemotion
  class CellLineAPI < Grape::API
    include Grape::Kaminari
    helpers ParamsHelpers
    helpers ContainerHelpers
    helpers CellLineApiParamsHelpers

    rescue_from ActiveRecord::RecordNotFound do
      error!('Ressource not found', 401)
    end
    resource :cell_lines do
      desc 'return cell lines of a collection'
      params do
        use :cell_line_get_params
      end
      paginate per_page: 5, offset: 0
      before do
        params[:per_page].to_i > 50 && (params[:per_page] = 50)
      end

      get do
        scope = if params[:collection_id]
                  begin
                    Collection.belongs_to_or_shared_by(current_user.id, current_user.group_ids)
                              .find(params[:collection_id]).cellline_samples
                  rescue ActiveRecord::RecordNotFound
                    CelllineSample.none
                  end
                else
                  # All collection of current_user
                  CelllineSample.none.joins(:collections).where(collections: { user_id: current_user.id }).distinct
                end.order('created_at DESC')

        from = params[:from_date]
        to = params[:to_date]
        by_created_at = params[:filter_created_at] || false

        scope = scope.created_time_from(Time.zone.at(from)) if from && by_created_at
        scope = scope.created_time_to(Time.zone.at(to) + 1.day) if to && by_created_at
        scope = scope.updated_time_from(Time.zone.at(from)) if from && !by_created_at
        scope = scope.updated_time_to(Time.zone.at(to) + 1.day) if to && !by_created_at

        reset_pagination_page(scope)

        cell_line_samples = paginate(scope).map do |cell_line_sample|
          Entities::CellLineSampleEntity.represent(
            cell_line_sample,
            displayed_in_list: true,
            detail_levels: ElementDetailLevelCalculator.new(user: current_user,
                                                            element: cell_line_sample).detail_levels,
          )
        end
        { cell_lines: cell_line_samples }
      end

      desc 'Get a cell line by id'
      params do
        requires :id, type: Integer, desc: 'id of cell line sample to load'
      end
      get ':id' do
        use_case = Usecases::CellLines::Load.new(params[:id], current_user)
        begin
          cell_line_sample = use_case.execute!
        rescue StandardError => e
          error!(e, 400)
        end
        return present cell_line_sample, with: Entities::CellLineSampleEntity
      end

      desc 'Create a new Cell line sample'
      params do
        use :cell_line_creation_params
      end
      post do
        error!('401 Unauthorized', 401) unless current_user.collections.find(params[:collection_id])
        use_case = Usecases::CellLines::Create.new(params, current_user)
        cell_line_sample = use_case.execute!
        cell_line_sample.container = update_datamodel(params[:container])

        return present cell_line_sample, with: Entities::CellLineSampleEntity
      end
      desc 'Update a Cell line sample'
      params do
        use :cell_line_update_params
      end
      put do
        use_case = Usecases::CellLines::Update.new(params, current_user)
        cell_line_sample = use_case.execute!
        cell_line_sample.container = update_datamodel(params[:container])
        return present cell_line_sample, with: Entities::CellLineSampleEntity
      end

      desc 'Copy a cell line'
      params do
        requires :id, type: Integer, desc: 'id of cell line sample to copy'
        requires :collection_id, type: Integer, desc: 'id of collection of copied cell line sample'
        requires :container, type: Hash, desc: 'root container of element'
      end
      namespace :copy do
        post do
          cell_line_to_copy = @current_user.cellline_samples.where(id: [params[:id]]).reorder('id')

          error!('401 Unauthorized', 401) unless ElementsPolicy.new(@current_user, cell_line_to_copy).update?

          begin
            use_case = Usecases::CellLines::Copy.new(cell_line_to_copy.first, @current_user, params[:collection_id])
            copied_cell_line_sample = use_case.execute!
            copied_cell_line_sample.container = update_datamodel(params[:container])
          rescue StandardError => e
            error!(e, 400)
          end
          return present copied_cell_line_sample, with: Entities::CellLineSampleEntity
        end
      end

      desc 'Splits a cell line'
      params do
        requires :id, type: Integer, desc: 'id of cell line sample to copy'
        requires :collection_id, type: Integer, desc: 'id of collection of copied cell line sample'
        optional :container, type: Hash, desc: 'root container of element'
      end
      namespace :split do
        post do
          cell_line_to_copy = @current_user.cellline_samples.where(id: [params[:id]]).reorder('id')

          error!('401 Unauthorized', 401) unless ElementsPolicy.new(@current_user, cell_line_to_copy).update?

          begin
            use_case = Usecases::CellLines::Split.new(cell_line_to_copy.first, @current_user, params[:collection_id])
            splitted_cell_line_sample = use_case.execute!
            splitted_cell_line_sample.container = update_datamodel(params[:container]) if @params.key?('container')
          rescue StandardError => e
            error!(e, 400)
          end
          return present splitted_cell_line_sample, with: Entities::CellLineSampleEntity
        end
      end

      resource :names do
        desc 'Returns all accessable cell line material names and their id'
        get 'all' do
          return present CelllineMaterial.all, with: Entities::CellLineMaterialNameEntity
        end
      end

      resource :material do
        params do
          requires :id, type: Integer, desc: 'id of cell line material to load'
        end
        get ':id' do
          return CelllineMaterial.find(params[:id])
        end
      end
    end
  end
end
