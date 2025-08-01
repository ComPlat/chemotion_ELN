# frozen_string_literal: true

VesselStruct = Struct.new(
  :id, :name, :vessel_type, :material_type,
  :volume_amount, :volume_unit, :details, :material_details
)

module Chemotion
  # rubocop:disable Metrics/ClassLength
  class VesselAPI < Grape::API
    include Grape::Kaminari
    helpers ParamsHelpers
    helpers ContainerHelpers

    rescue_from ActiveRecord::RecordNotFound do
      error!('Resource not found', 401)
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
          )
        end
        { vessels: vessels }
      end

      desc 'Get a vessel instance by id'
      params do
        requires :id, type: String, desc: 'id of vessel instance to load'
      end
      get ':id' do
        return present Vessel.new, with: Entities::VesselInstanceEntity if params[:id] == 'new'

        begin
          vessel = Vessel.find(params[:id])
        rescue ActiveRecord::RecordNotFound
          error!('404 Not Found', 404)
        rescue StandardError => e
          error!(e, 400)
        end
        return present vessel, with: Entities::VesselInstanceEntity
      end

      desc 'Create a new Vessel Template'
      params do
        requires :name, type: String, desc: 'Name of the vessel template'
        optional :details, type: String, desc: 'Additional details'
        optional :material_details, type: String, desc: 'Material details'
        optional :material_type, type: String, desc: 'Material type'
        optional :vessel_type, type: String, desc: 'Vessel type'
        optional :volume_amount, type: Float, desc: 'Volume amount'
        optional :volume_unit, type: String, desc: 'Volume unit'
        optional :container, type: Hash, desc: 'root container of element'
      end
      post 'templates/create' do
        if VesselTemplate.exists?(name: params[:name])
          error!('409 Conflict: Vessel Template with the same name already exists', 409)
        end

        vessel_template = VesselTemplate.create!(
          name: params[:name],
          details: params[:details],
          material_details: params[:material_details],
          material_type: params[:material_type],
          vessel_type: params[:vessel_type],
          volume_amount: params[:volume_amount],
          volume_unit: params[:volume_unit],
        )

        if params[:container]
          begin
            root = Container.create_root_container(containable: vessel_template)
            params[:container][:id] = root.id
            params[:container][:is_new] = false
            update_datamodel(params[:container].deep_dup)
          rescue StandardError => e
            error!("Container update failed: #{e.message}", 400)
          end
        end

        vessel_template.reload
        present vessel_template, with: Entities::VesselTemplateEntity
      end

      desc 'Create a new Vessel Instance'
      params do
        requires :vessel_template_id, type: String, desc: 'ID of the vessel template'
        requires :collection_id, type: Integer, desc: 'Collection ID for the vessel'
        optional :name, type: String, desc: 'Name of the vessel instance'
        optional :description, type: String, desc: 'Description of the vessel instance'
        optional :short_label, type: String, desc: 'Short label'
        optional :weight_amount, type: Float, desc: 'Weight amount'
        optional :weight_unit, type: String, desc: 'Weight unit'
      end
      post 'instances/create' do
        vessel_template = VesselTemplate.find_by(id: params[:vessel_template_id])
        error!('404 Vessel Template not found', 404) unless vessel_template

        collection = current_user.collections.find_by(id: params[:collection_id])
        error!('404 Collection not found', 404) unless collection

        current_count = Vessel.where(user_id: current_user.id).count

        vessel = Vessel.create!(
          vessel_template: vessel_template,
          name: params[:name] || "#{vessel_template.name} instance",
          user_id: current_user.id,
          description: params[:description],
          short_label: params[:short_label] || "#{current_user.initials}-V#{current_count + 1}",
          weight_amount: params[:weight_amount],
          weight_unit: params[:weight_unit],
        )

        vessel.create_code_log

        vessel.collections << collection

        present vessel.reload, with: Entities::VesselInstanceEntity
      end

      desc 'Create batch of vessel instances'
      params do
        requires :vessel_template_id, type: String, desc: 'ID of the selected vessel template'
        requires :collection_id, type: Integer, desc: 'Collection ID for the vessels'
        requires :count, type: Integer, values: 1..100, desc: 'Number of vessel instances to create (1-100)'
        optional :short_labels, type: [String], desc: 'Short labels for each vessel',
                                documentation: { is_array: true }
        optional :container, type: Hash, desc: 'Root container for vessel template'

        optional :template_name, type: String
        optional :material_type, type: String
        optional :vessel_type, type: String
        optional :volume_amount, type: Float
        optional :volume_unit, type: String
        optional :details, type: String
      end

      post 'bulk_create' do
        error!('401 Unauthorized', 401) unless current_user.collections.find_by(id: params[:collection_id])

        vessel_template = VesselTemplate.find_by(id: params[:vessel_template_id])
        error!('404 VesselTemplate Not Found', 404) unless vessel_template

        if params[:container]
          begin
            vessel_template.container = update_datamodel(params[:container].deep_dup)
            vessel_template.save!
          rescue StandardError => e
            error!("Container update failed: #{e.message}", 400)
          end
        end

        short_labels = params[:short_labels] || []
        created_vessels = []

        ActiveRecord::Base.transaction do
          current_count = Vessel.where(user_id: current_user.id).count
          params[:count].times do |i|
            short_label = short_labels[i] || "#{current_user.initials}-V#{current_count + i + 1}"

            vessel = Vessel.create!(
              vessel_template: vessel_template,
              name: "instance#{i + 1}",
              user_id: current_user.id,
              short_label: short_label,
            )

            if params[:collection_id]
              collection = current_user.collections.find_by(id: params[:collection_id])
              vessel.collections << collection if collection.present?
            end

            created_vessels << vessel
          end
        end

        created_vessels.each do |vessel|
          vessel.create_code_log

          vessel.define_singleton_method(:code_log) do
            CodeLog.where(source: 'vessel', source_id: vessel.id).order(created_at: :desc).first
          end
        end

        present created_vessels.map { |v|
          v.reload

          log = CodeLog.where(source: 'vessel', source_id: v.id).order(created_at: :desc).first
          v.define_singleton_method(:code_log) { log }

          v
        }, with: Entities::VesselInstanceEntity
      end

      desc 'Update only a vessel template'
      params do
        requires :id, type: String, desc: 'ID of the vessel template to update'
        optional :name, type: String, desc: 'Vessel template name'
        optional :details, type: String, desc: 'Additional details'
        optional :material_details, type: String, desc: 'Material details'
        optional :material_type, type: String, desc: 'Material type'
        optional :vessel_type, type: String, desc: 'Vessel type'
        optional :volume_amount, type: Float, desc: 'Volume amount'
        optional :volume_unit, type: String, desc: 'Volume unit'
        optional :container, type: Hash, desc: 'Root container of the vessel template'
      end
      put 'templates/:id' do
        vessel_template = VesselTemplate.find_by(id: params[:id])
        error!('Vessel template not found', 404) unless vessel_template

        template_params = params.slice(:name, :details, :material_details, :material_type, :vessel_type,
                                       :volume_amount, :volume_unit).compact
        vessel_template.update!(template_params)

        if params[:container]
          begin
            if vessel_template.container.present?
              vessel_template.container.update!(update_datamodel(params[:container]).attributes)
            else
              root = Container.create_root_container(containable: vessel_template)
              params[:container][:id] = root.id
              params[:container][:is_new] = false

              update_datamodel(params[:container].deep_dup)
            end
          rescue StandardError => e
            error!("Container update failed: #{e.message}", 400)
          end
        end

        vessel_template.reload
        present vessel_template, with: Entities::VesselTemplateEntity
      end

      desc 'Update a specific property of a vessel instance'
      params do
        requires :id, type: String, desc: 'ID of the vessel instance to update'
        optional :name, type: String, desc: 'Vessel instance name'
        optional :description, type: String, desc: 'Description'
        optional :bar_code, type: String, desc: 'Barcode'
        optional :qr_code, type: String, desc: 'QR Code'
        optional :weight_amount, type: Float, desc: 'Weight amount'
        optional :weight_unit, type: String, desc: 'Weight unit'
      end
      put ':id' do
        vessel = Vessel.find_by(id: params[:id])
        error!('Vessel instance not found', 404) unless vessel

        vessel_params = params.slice(:name, :description, :bar_code, :qr_code, :weight_amount, :weight_unit).compact
        vessel.update!(vessel_params)
        present vessel, with: Entities::VesselInstanceEntity
      end

      desc 'Return an empty Vessel Template object for creation'
      get 'templates/new' do
        present VesselTemplate.new, with: Entities::VesselTemplateEntity
      end

      resource :templates do
        desc 'fetch a vessel template and associated vessel instances for the current user and collection'
        params do
          requires :id, type: String, desc: 'vessel template ID'
          optional :collection_id, type: Integer, desc: 'collection ID'
        end
        get ':id' do
          vessel_template = VesselTemplate.includes(:vessels).find_by(id: params[:id])

          if vessel_template
            user_vessels = vessel_template.vessels.where(user_id: current_user.id)

            if params[:collection_id]
              user_vessels = user_vessels.joins(:collections).where(collections: { id: params[:collection_id] })
            end

            present(
              {
                vessel_template: Entities::VesselTemplateEntity.represent(vessel_template),
                vessels: user_vessels.map { |vessel| Entities::VesselInstanceEntity.represent(vessel) },
              },
            )
          else
            error!({ error: 'Vessel template not found' }, 404)
          end
        end
      end

      resource :names do
        desc 'Returns all accessible vessel templates material names and their id'
        get 'all' do
          vessel_templates = VesselTemplate
                             .where(deleted_at: nil)
                             .distinct
                             .pluck(
                               :id, :name, :vessel_type, :material_type, :volume_amount,
                               :volume_unit, :details, :material_details
                             )
                             .map { |row| VesselStruct.new(*row) }

          present vessel_templates, with: Entities::VesselTemplateBasicEntity
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

      desc 'Delete a Vessel Instance'
      params do
        requires :id, type: String, desc: 'ID of the vessel instance to delete'
      end
      route_param :id do
        before do
          @vessel = Vessel.find_by(id: params[:id])
          error!('404 Vessel Not Found', 404) unless @vessel
          error!('401 Unauthorized', 401) unless ElementPolicy.new(current_user, @vessel).destroy?
        end

        delete do
          @vessel.destroy
          status 200
          { message: 'Vessel successfully deleted', vessel_id: @vessel.id }
        end
      end

      # Not called from the UI yet
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
  # rubocop:enable Metrics/ClassLength
end
