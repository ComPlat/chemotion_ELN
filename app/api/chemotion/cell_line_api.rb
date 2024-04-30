# frozen_string_literal: true

module Chemotion
  class CellLineAPI < Grape::API
    include Grape::Kaminari
    helpers ParamsHelpers
    helpers ContainerHelpers

    rescue_from ActiveRecord::RecordNotFound do
      error!('Ressource not found', 401)
    end
    resource :cell_lines do
      desc 'return cell lines of a collection'
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
        scope = if params[:collection_id]
                  begin
                    Collection.belongs_to_or_shared_by(current_user.id, current_user.group_ids)
                              .find(params[:collection_id]).cellline_samples
                  rescue ActiveRecord::RecordNotFound
                    CelllineSample.none
                  end
                elsif params[:sync_collection_id]
                  begin
                    current_user.all_sync_in_collections_users
                                .find(params[:sync_collection_id])
                                .collection
                                .cellline_samples
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
        optional :organism, type: String, desc: 'name of the donor organism of the cell'
        optional :tissue, type: String, desc: 'tissue from which the cell originates'
        requires :amount, type: Integer, desc: 'amount of cells'
        requires :unit, type: String, desc: 'unit of cell amount'
        requires :passage, type: Integer, desc: 'passage of cells'
        optional :disease, type: String, desc: 'deasease of cells'
        requires :material_names, type: String, desc: 'names of cell line e.g. name1;name2'
        requires :collection_id, type: Integer, desc: 'Collection of the cell line sample'
        optional :cell_type, type: String, desc: 'type of cells'
        optional :biosafety_level, type: String, desc: 'biosafety_level of cells'
        optional :growth_medium, type: String, desc: 'growth medium of cells'
        optional :variant, type: String, desc: 'variant of cells'
        optional :optimal_growth_temp, type: Float, desc: 'optimal_growth_temp of cells'
        optional :cryo_pres_medium, type: String, desc: 'cryo preservation medium of cells'
        optional :gender, type: String, desc: 'gender of donor organism'
        optional :material_description, type: String, desc: 'description of cell line concept'
        optional :contamination, type: String, desc: 'contamination of a cell line sample'
        requires :source, type: String, desc: 'source of a cell line sample'
        optional :name, type: String, desc: 'name of a cell line sample'
        optional :mutation, type: String, desc: 'mutation of a cell line'
        optional :description, type: String, desc: 'description of a cell line sample'
        optional :short_label, type: String, desc: 'short label of a cell line sample'
        requires :container, type: Hash, desc: 'root Container of element'
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
        requires :cell_line_sample_id, type: String, desc: 'id of the cell line to update'
        optional :organism, type: String, desc: 'name of the donor organism of the cell'
        optional :mutation, type: String, desc: 'mutation of a cell line'
        optional :tissue, type: String, desc: 'tissue from which the cell originates'
        requires :amount, type: Integer, desc: 'amount of cells'
        requires :unit, type: String, desc: 'unit of amount of cells'
        optional :passage, type: Integer, desc: 'passage of cells'
        optional :disease, type: String, desc: 'deasease of cells'
        optional :material_names, type: String, desc: 'names of cell line e.g. name1;name2'
        optional :collection_id, type: Integer, desc: 'Collection of the cell line sample'
        optional :cell_type, type: String, desc: 'type of cells'
        optional :biosafety_level, type: String, desc: 'biosafety_level of cells'
        optional :variant, type: String, desc: 'variant of cells'
        optional :optimal_growth_temp, type: Float, desc: 'optimal_growth_temp of cells'
        optional :cryo_pres_medium, type: String, desc: 'cryo preservation medium of cells'
        optional :gender, type: String, desc: 'gender of donor organism'
        optional :material_description, type: String, desc: 'description of cell line concept'
        optional :contamination, type: String, desc: 'contamination of a cell line sample'
        optional :source, type: String, desc: 'source of a cell line sample'
        optional :name, type: String, desc: 'name of a cell line sample'
        optional :description, type: String, desc: 'description of a cell line sample'
        requires :container, type: Hash, desc: 'root Container of element'
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
          cell_line_to_copy = @current_user.cellline_samples.find(params[:id])
          use_case = Usecases::CellLines::Copy.new(cell_line_to_copy, @current_user, params[:collection_id])
          #error!('401 Unauthorized', 401) unless ElementsPolicy.new(@current_user, CelllineSample).update?

          begin
            copied_cell_line_sample = use_case.execute!
            copied_cell_line_sample.container = update_datamodel(params[:container])
          rescue StandardError => e
            error!(e, 400)
          end
          return present copied_cell_line_sample, with: Entities::CellLineSampleEntity
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
