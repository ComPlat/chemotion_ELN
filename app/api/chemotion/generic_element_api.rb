# frozen_string_literal: true
module Chemotion
  # Generic Element API
  class GenericElementAPI < Grape::API
    include Grape::Kaminari
    helpers ContainerHelpers
    helpers ParamsHelpers
    helpers CollectionHelpers
    helpers SampleAssociationHelpers
    helpers GenericHelpers

    resource :generic_elements do
      namespace :klass do
        desc 'get klass info'
        params do
          requires :name, type: String, desc: 'element klass name'
        end
        get do
          ek = ElementKlass.find_by(name: params[:name])
          present ek, with: Entities::ElementKlassEntity, root: 'klass'
        end
      end

      namespace :klasses do
        desc 'get klasses'
        params do
          optional :generic_only, type: Boolean, desc: 'list generic element only'
        end
        get do
          list = ElementKlass.where(is_active: true, is_generic: true).order('place') if params[:generic_only].present? && params[:generic_only] == true
          list = ElementKlass.where(is_active: true).order('place') unless params[:generic_only].present? && params[:generic_only] == true
          present list, with: Entities::ElementKlassEntity, root: 'klass'
        end
      end

      namespace :create_element_klass do
        desc 'create Generic Element Klass'
        params do
          requires :name, type: String, desc: 'Element Klass Name'
          requires :label, type: String, desc: 'Element Klass Label'
          requires :klass_prefix, type: String, desc: 'Element Klass Short Label Prefix'
          optional :icon_name, type: String, desc: 'Element Klass Icon Name'
          optional :desc, type: String, desc: 'Element Klass Desc'
          optional :properties_template, type: Hash, desc: 'Element Klass properties template'
        end
        post do
          authenticate_admin!('elements')
          uuid = SecureRandom.uuid
          template = { uuid: uuid, layers: {}, select_options: {} }
          attributes = declared(params, include_missing: false)
          attributes[:properties_template]['uuid'] = uuid if attributes[:properties_template].present?
          attributes[:properties_template] = template unless attributes[:properties_template].present?
          attributes[:properties_template]['eln'] = Chemotion::Application.config.version if attributes[:properties_template].present?
          attributes[:properties_template]['klass'] = 'ElementKlass' if attributes[:properties_template].present?
          attributes[:is_active] = false
          attributes[:uuid] = uuid
          attributes[:released_at] = DateTime.now
          attributes[:properties_release] = attributes[:properties_template]
          attributes[:created_by] = current_user.id

          new_klass = ElementKlass.create!(attributes)
          new_klass.reload
          new_klass.create_klasses_revision(current_user.id)
          klass_names_file = Rails.root.join('config', 'klasses.json')
          klasses = ElementKlass.where(is_active: true)&.pluck(:name) || []
          File.write(klass_names_file, klasses)

          status 201
        rescue ActiveRecord::RecordInvalid => e
          { error: e.message }
        end
      end

      namespace :update_element_klass do
        desc 'update Generic Element Klass'
        params do
          requires :id, type: Integer, desc: 'Element Klass ID'
          optional :label, type: String, desc: 'Element Klass Label'
          optional :klass_prefix, type: String, desc: 'Element Klass Short Label Prefix'
          optional :icon_name, type: String, desc: 'Element Klass Icon Name'
          optional :desc, type: String, desc: 'Element Klass Desc'
          optional :place, type: String, desc: 'Element Klass Place'
        end
        post do
          authenticate_admin!('elements')
          place = params[:place]
          begin
            place = place.to_i if place.present? && place.to_i == place.to_f
          rescue StandardError
            place = 100
          end
          klass = ElementKlass.find(params[:id])
          klass.label = params[:label] if params[:label].present?
          klass.klass_prefix = params[:klass_prefix] if params[:klass_prefix].present?
          klass.icon_name = params[:icon_name] if params[:icon_name].present?
          klass.desc = params[:desc] if params[:desc].present?
          klass.place = place
          klass.save!
          present klass, with: Entities::ElementKlassEntity
        end
      end

      namespace :klass_revisions do
        desc 'list Generic Element Revisions'
        params do
          requires :id, type: Integer, desc: 'Generic Element Klass Id'
          requires :klass, type: String, desc: 'Klass', values: %w[ElementKlass SegmentKlass DatasetKlass]
        end
        get do
          klass = params[:klass].constantize.find_by(id: params[:id])
          list = klass.send("#{params[:klass].underscore}es_revisions") unless klass.nil?
          present list.sort_by(&:released_at).reverse, with: Entities::KlassRevisionEntity, root: 'revisions'
        end
      end

      namespace :element_revisions do
        desc 'list Generic Element Revisions'
        params do
          requires :id, type: Integer, desc: 'Generic Element Id'
        end
        get do
          klass = Element.find(params[:id])
          list = klass.elements_revisions unless klass.nil?
          present list&.sort_by(&:created_at).reverse, with: Entities::ElementRevisionEntity, root: 'revisions'
        end
      end

      namespace :delete_klass_revision do
        desc 'delete Klass Revision'
        params do
          requires :id, type: Integer, desc: 'Revision ID'
          requires :klass_id, type: Integer, desc: 'Klass ID'
          requires :klass, type: String, desc: 'Klass', values: %w[ElementKlass SegmentKlass DatasetKlass]
        end
        post do
          authenticate_admin!(params[:klass].gsub(/(Klass)/, 's').downcase)
          revision = "#{params[:klass]}esRevision".constantize.find(params[:id])
          klass = params[:klass].constantize.find_by(id: params[:klass_id]) unless revision.nil?
          error!('Revision is invalid.', 404) if revision.nil?
          error!('Can not delete the active revision.', 405) if revision.uuid == klass.uuid
          revision&.destroy!
          status 201
        end
      end

      namespace :delete_revision do
        desc 'delete Generic Element Revisions'
        params do
          requires :id, type: Integer, desc: 'Revision Id'
          requires :element_id, type: Integer, desc: 'Element ID'
          requires :klass, type: String, desc: 'Klass', values: %w[Element Segment Dataset]
        end
        post do
          revision = "#{params[:klass]}sRevision".constantize.find(params[:id])
          element = params[:klass].constantize.find_by(id: params[:element_id]) unless revision.nil?
          error!('Revision is invalid.', 404) if revision.nil?
          error!('Can not delete the active revision.', 405) if revision.uuid == element.uuid
          revision&.destroy!
          status 201
        end
      end

      namespace :segment_revisions do
        desc 'list Generic Element Revisions'
        params do
          optional :id, type: Integer, desc: 'Generic Element Id'
        end
        get do
          klass = Segment.find(params[:id])
          list = klass.segments_revisions unless klass.nil?
          present list&.sort_by(&:created_at).reverse, with: Entities::SegmentRevisionEntity, root: 'revisions'
        end
      end

      namespace :upload_generics_files do
        desc 'upload generic files'
        params do
          requires :att_id, type: Integer, desc: 'Element Id'
          requires :att_type, type: String, desc: 'Element Type'
        end

        after_validation do
          el = params[:att_type].constantize.find_by(id: params[:att_id])
          error!('401 Unauthorized', 401) if el.nil?

          policy_updatable = ElementPolicy.new(current_user, el).update?
          error!('401 Unauthorized', 401) unless policy_updatable
        end
        post do
          attach_ary = []
          att_ary = create_uploads('Element', params[:att_id], params[:elfiles], params[:elInfo], current_user.id) if params[:elfiles].present? && params[:elInfo].present?
          (attach_ary << att_ary).flatten! unless att_ary&.empty?
          att_ary = create_uploads('Segment', params[:att_id], params[:sefiles], params[:seInfo], current_user.id) if params[:sefiles].present? && params[:seInfo].present?
          (attach_ary << att_ary).flatten! unless att_ary&.empty?
          att_ary = create_attachments(params[:attfiles], params[:delfiles], params[:att_type], params[:att_id], current_user.id) if params[:attfiles].present? || params[:delfiles].present?
          (attach_ary << att_ary).flatten! unless att_ary&.empty?
          TransferThumbnailToPublicJob.set(queue: "transfer_thumbnail_to_public_#{current_user.id}").perform_later(attach_ary) unless attach_ary.empty?
          TransferFileFromTmpJob.set(queue: "transfer_file_from_tmp_#{current_user.id}").perform_later(attach_ary) unless attach_ary.empty?
          true
        end
      end

      namespace :klasses_all do
        desc 'get all klasses for admin function'
        get do
          list = ElementKlass.all.sort_by { |e| e.place }
          present list, with: Entities::ElementKlassEntity, root: 'klass'
        end
      end

      namespace :de_activate_klass do
        desc 'activate or deactivate Generic Klass'
        params do
          requires :klass, type: String, desc: 'Klass', values: %w[ElementKlass SegmentKlass DatasetKlass]
          requires :id, type: Integer, desc: 'Klass ID'
          requires :is_active, type: Boolean, desc: 'Active or Inactive Klass'
        end
        after_validation do
          authenticate_admin!(params[:klass].gsub(/(Klass)/, 's').downcase)
          @klz = fetch_klass(params[:klass], params[:id])
        end
        post do
          @klz&.update!(is_active: params[:is_active])
          generate_klass_file unless @klz.class.name != 'ElementKlass'

          @klz
        end
      end

      namespace :delete_klass do
        desc 'delete Generic Klass'
        params do
          requires :klass, type: String, desc: 'Klass', values: %w[ElementKlass SegmentKlass DatasetKlass]
          requires :id, type: Integer, desc: 'Klass ID'
        end
        delete ':id' do
          authenticate_admin!(params[:klass].gsub(/(Klass)/, 's').downcase)
          klass = fetch_klass(params[:klass], params[:id])
          klass&.destroy!
          generate_klass_file unless klass.class.name != 'ElementKlass'
          status 201
        end
      end

      namespace :update_template do
        desc 'update Generic Properties Template'
        params do
          requires :klass, type: String, desc: 'Klass', values: %w[ElementKlass SegmentKlass DatasetKlass]
          requires :id, type: Integer, desc: 'Klass ID'
          requires :properties_template, type: Hash
          optional :is_release, type: Boolean, default: false
        end
        after_validation do
          authenticate_admin!(params[:klass].gsub(/(Klass)/, 's').downcase)
          @klz = fetch_klass(params[:klass], params[:id])
        end
        post do
          uuid = SecureRandom.uuid
          properties = params[:properties_template]
          properties['uuid'] = uuid
          properties['eln'] = Chemotion::Application.config.version
          properties['klass'] = @klz.class.name

          @klz.properties_template = properties
          @klz.save!
          @klz.reload
          @klz.create_klasses_revision(current_user.id) if params[:is_release] == true
          "Entities::#{params[:klass]}Entity".constantize.represent(@klz)
        end
      end

      desc 'Return serialized elements of current user'
      params do
        optional :collection_id, type: Integer, desc: 'Collection id'
        optional :sync_collection_id, type: Integer, desc: 'SyncCollectionsUser id'
        optional :el_type, type: String, desc: 'element klass name'
        optional :from_date, type: Integer, desc: 'created_date from in ms'
        optional :to_date, type: Integer, desc: 'created_date to in ms'
        optional :filter_created_at, type: Boolean, desc: 'filter by created at or updated at'
      end
      paginate per_page: 7, offset: 0, max_per_page: 100
      get do
        collection_id =
          if params[:collection_id]
            Collection.belongs_to_or_shared_by(current_user.id, current_user.group_ids).find_by(id: params[:collection_id])&.id
          elsif params[:sync_collection_id]
            current_user.all_sync_in_collections_users.find_by(id: params[:sync_collection_id])&.collection&.id
          end

        scope =
          if collection_id
            Element.joins(:element_klass, :collections_elements).where(element_klasses: { name: params[:el_type] }, collections_elements: { collection_id: collection_id })
          else
            Element.none
          end

        from = params[:from_date]
        to = params[:to_date]
        by_created_at = params[:filter_created_at] || false

        scope = scope.order('created_at DESC')
        scope = scope.created_time_from(Time.at(from)) if from && by_created_at
        scope = scope.created_time_to(Time.at(to) + 1.day) if to && by_created_at
        scope = scope.updated_time_from(Time.at(from)) if from && !by_created_at
        scope = scope.updated_time_to(Time.at(to) + 1.day) if to && !by_created_at

        reset_pagination_page(scope)

        present paginate(scope), with: Entities::ElementEntity, displayed_in_list: true, root: :generic_elements
      end

      desc 'Return serialized element by id'
      params do
        requires :id, type: Integer, desc: 'Element id'
      end
      route_param :id do
        before do
          error!('401 Unauthorized', 401) unless current_user.matrix_check_by_name('genericElement') && ElementPolicy.new(current_user, Element.find(params[:id])).read?
        end

        get do
          element = Element.find(params[:id])
          {
            element: Entities::ElementEntity.represent(element),
            attachments: Entities::AttachmentEntity.represent(element.attachments)
          }
        end
      end

      desc 'Create a element'
      params do
        requires :element_klass, type: Hash
        requires :name, type: String
        optional :properties, type: Hash
        optional :collection_id, type: Integer
        requires :container, type: Hash
        optional :segments, type: Array, desc: 'Segments'
      end
      post do
        klass = params[:element_klass] || {}
        uuid = SecureRandom.uuid
        params[:properties]['uuid'] = uuid
        params[:properties]['klass_uuid'] = klass[:uuid]
        params[:properties]['eln'] = Chemotion::Application.config.version
        params[:properties]['klass'] = 'Element'
        attributes = {
          name: params[:name],
          element_klass_id: klass[:id],
          uuid: uuid,
          klass_uuid: klass[:uuid],
          properties: params[:properties],
          created_by: current_user.id
        }
        element = Element.new(attributes)

        if params[:collection_id]
          collection = current_user.collections.find(params[:collection_id])
          element.collections << collection
        end

        all_coll = Collection.get_all_collection_for_user(current_user.id)
        element.collections << all_coll
        element.save!

        element.properties = update_sample_association(element, params[:properties], current_user)
        element.container = update_datamodel(params[:container])
        element.save!
        element.save_segments(segments: params[:segments], current_user_id: current_user.id)

        present element, with: Entities::ElementEntity, root: :element
      end

      desc 'Update element by id'
      params do
        requires :id, type: Integer, desc: 'element id'
        optional :name, type: String
        optional :properties, type: Hash
        requires :container, type: Hash
        optional :segments, type: Array, desc: 'Segments'
      end
      route_param :id do
        before do
          error!('401 Unauthorized', 401) unless ElementPolicy.new(current_user, Element.find(params[:id])).update?
        end

        put do
          element = Element.find(params[:id])

          update_datamodel(params[:container])
          properties = update_sample_association(element, params[:properties], current_user)
          params.delete(:container)
          params.delete(:properties)

          attributes = declared(params.except(:segments), include_missing: false)
          properties['eln'] = Chemotion::Application.config.version if properties['eln'] != Chemotion::Application.config.version
          if element.klass_uuid != properties['klass_uuid'] || element.properties != properties || element.name != params[:name]
            properties['klass'] = 'Element'
            uuid = SecureRandom.uuid
            properties['uuid'] = uuid
            attributes['properties'] = properties
            attributes['properties']['uuid'] = uuid
            attributes['uuid'] = uuid
            attributes['klass_uuid'] = properties['klass_uuid']

            element.update(attributes)
          end
          element.save_segments(segments: params[:segments], current_user_id: current_user.id)

          {
            element: Entities::ElementEntity.represent(element),
            attachments: Entities::AttachmentEntity.represent(element.attachments)
          }
        end
      end
    end
  end
end
