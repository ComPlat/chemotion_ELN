# frozen_string_literal: true

module Chemotion
  class VesselAPI < Grape::API
    include Grape::Kaminari
    helpers ParamsHelpers
    helpers ContainerHelpers

    rescue_from ActiveRecord::RecordNotFound do
      error!('Ressource not found', 401)
    end
    resource :vessels do
      desc 'return vessels of a collection'
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
                              .find(params[:collection_id]).vessels
                  rescue ActiveRecord::RecordNotFound
                    Vessel.none
                  end
                elsif params[:sync_collection_id]
                  begin
                    current_user.all_sync_in_collections_users
                                .find(params[:sync_collection_id])
                                .collection
                                .vessels
                  rescue ActiveRecord::RecordNotFound
                    Vessel.none
                  end
                else
                  # All collection of current_user
                  Vessel.none.joins(:collections).where(collections: { user_id: current_user.id }).distinct
                end.order('created_at DESC')

        from = params[:from_date]
        to = params[:to_date]
        by_created_at = params[:filter_created_at] || false

        scope = scope.created_time_from(Time.zone.at(from)) if from && by_created_at
        scope = scope.created_time_to(Time.zone.at(to) + 1.day) if to && by_created_at
        scope = scope.updated_time_from(Time.zone.at(from)) if from && !by_created_at
        scope = scope.updated_time_to(Time.zone.at(to) + 1.day) if to && !by_created_at

        reset_pagination_page(scope)

        vessels = paginate(scope).map do |vessel|
          Entities::VesselInstanceEntity.represent(
            vessel,
            # displayed_in_list: true,
            #  detail_levels: ElementDetailLevelCalculator.new(user: current_user, element: cell_line_sample).detail_levels,
          )
        end
        { vessels: vessels }
      end

      desc 'Get a vessel by id'
      params do
        requires :id, type: String, desc: 'id of vessel instance to load'
      end
      get ':id' do
        begin
          vessel = Vessel.find(params[:id])
        rescue ActiveRecord::RecordNotFound
          error!('404 Not Found', 404)
        rescue StandardError => e
          error!(e, 400)
        end
        return present vessel, with: Entities::VesselInstanceEntity
      end

      desc 'Create a new Vessel sample'
      params do
        requires :name, type: String, desc: 'name of a vessel template'
        optional :vessel_name, type: String, desc: 'name of a vessel sample'
        optional :material_details, type: String, desc: 'details of the vessel template'
        optional :details, type: String, desc: 'additional details'
        optional :material_type, type: String, desc: 'material type of the vessel'
        optional :vessel_type, type: String, desc: 'type of the vessel'
        optional :volume_amount, type: Float, desc: 'volume amount'
        optional :volume_unit, type: String, desc: 'volume unit'
        optional :weight_amount, type: Float, desc: 'weight of the vessel'
        optional :weight_unit, type: String, desc: 'weight unit of the vessel'
        optional :bar_code, type: String, desc: 'bar code of the vessel'
        optional :qr_code, type: String, desc: 'qr code of the vessel'
        requires :collection_id, type: Integer, desc: 'collection of the vessel sample'
        optional :description, type: String, desc: 'description of a vessel sample'
        optional :short_label, type: String, desc: 'short label of a vessel sample'
        optional :container, type: Hash, desc: 'root Container of element'
      end
      post do
        error!('401 Unauthorized', 401) unless current_user.collections.find(params[:collection_id])

        vessel_template = VesselTemplate.find_by(
          name: params[:name],
        ) || VesselTemplate.create!(
          name: params[:name],
          details: params[:details],
          material_details: params[:material_details],
          material_type: params[:material_type],
          vessel_type: params[:vessel_type],
          volume_amount: params[:volume_amount],
          volume_unit: params[:volume_unit],
          weight_amount: params[:weight_amount],
          weight_unit: params[:weight_unit],
        )

        vessel = Vessel.create!(
          vessel_template: vessel_template,
          name: params[:vessel_name],
          user_id: current_user.id,
          description: params[:description],
          bar_code: params[:bar_code],
          qr_code: params[:qr_code],
          short_label: params[:short_label],
        )

        if params[:collection_id]
          collection = current_user.collections.find_by(id: params[:collection_id])
          vessel.collections << collection if collection.present?
        end

        if params[:container]
          begin
            vessel.container = update_datamodel(params[:container])
          rescue StandardError => e
            Rails.logger.error "Error updating container: #{e.message}"
            error!("Container update failed: #{e.message}", 400)
          end
        end

        present vessel, with: Entities::VesselInstanceEntity
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

      desc 'Delete a Vessel'
      params do
        requires :id, type: String, desc: 'ID of the vessel instance to delete'
      end
      delete ':id' do
        vessel = Vessel.find_by(id: params[:id])
        if vessel.nil?
          error!('404 Vessel Not Found', 404)
        else
          vessel.destroy!
          status 200
          { message: 'Vessel successfully deleted', vessel_id: params[:id] }
        end
      end

      desc 'Delete a VesselTemplate'
      params do
        requires :id, type: String, desc: 'ID of the vessel template to delete'
      end
      delete 'vessel_template/:id' do
        vessel_template = VesselTemplate.find_by(id: params[:id])
        if vessel_template.nil?
          error!('404 VesselTemplate Not Found', 404)
        elsif vessel_template.vessels.exists?
          error!('400 Cannot delete VesselTemplate. It is associated with one or more vessels.', 400)
        else
          vessel_template.destroy!
          status 200
          { message: 'VesselTemplate successfully deleted', vessel_template_id: params[:id] }
        end
      end
    end
  end
end
