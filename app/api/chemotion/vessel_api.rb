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
            displayed_in_list: true,
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
        optional :material_type, type: String, desc: 'vessel material type of the vessel'
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

      desc 'Update a vessel instance or associated vessel template'
      params do
        requires :vessel_id, type: String, desc: 'id of the vessel to update'
        optional :vessel_template_id, type: String, desc: 'ID of the vessel template to update'
        optional :template_name, type: String, desc: 'name of a vessel template'
        optional :vessel_name, type: String, desc: 'name of a vessel sample'
        optional :material_details, type: String, desc: 'details of the vessel template'
        optional :details, type: String, desc: 'additional details'
        optional :material_type, type: String, desc: 'vessel material type of the vessel'
        optional :vessel_type, type: String, desc: 'type of the vessel'
        optional :volume_amount, type: Float, desc: 'volume amount'
        optional :volume_unit, type: String, desc: 'volume unit'
        optional :weight_amount, type: Float, desc: 'weight of the vessel'
        optional :weight_unit, type: String, desc: 'weight unit of the vessel'
        optional :bar_code, type: String, desc: 'bar code of the vessel'
        optional :qr_code, type: String, desc: 'qr code of the vessel'
        optional :collection_id, type: Integer, desc: 'collection of the vessel sample'
        optional :description, type: String, desc: 'description of a vessel sample'
        optional :short_label, type: String, desc: 'short label of a vessel sample'
        optional :container, type: Hash, desc: 'root Container of element'
      end
      put do
        vessel = Vessel.find_by(id: params[:vessel_id])
        error!('Vessel not found', 404) unless vessel

        vessel_params = {
          name: params[:vessel_name],
          description: params[:description],
          bar_code: params[:bar_code],
          qr_code: params[:qr_code],
          short_label: params[:short_label],
        }.compact
        vessel.update!(vessel_params) if vessel_params.present?

        if params[:vessel_template_id]
          vessel_template = VesselTemplate.find_by(id: params[:vessel_template_id], deleted_at: nil)
          error!('Vessel template not found', 404) unless vessel_template

          template_params = {
            name: params[:template_name],
            details: params[:details],
            material_details: params[:material_details],
            material_type: params[:material_type],
            vessel_type: params[:vessel_type],
            volume_amount: params[:volume_amount],
            volume_unit: params[:volume_unit],
            weight_amount: params[:weight_amount],
            weight_unit: params[:weight_unit],
          }.compact
          vessel_template.update!(template_params) if template_params.present?
        end

        present vessel, with: Entities::VesselInstanceEntity
      end

      resource :names do
        desc 'Returns all accessable vessel templates material names and their id'
        get 'all' do
          return present VesselTemplate.all, with: Entities::VesselTemplateEntity
        end
      end
      resource :material do
        params do
          requires :id, type: String, desc: 'id of vessel template to load'
        end
        get ':id' do
          return VesselTemplate.find(params[:id])
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

      desc 'Delete a Vessel Template'
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
