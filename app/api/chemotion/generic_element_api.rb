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

      namespace :delete_revision do
        desc 'list Generic Element Revisions'
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
        scope = if params[:collection_id]
                  begin
                    collection_id = Collection.belongs_to_or_shared_by(current_user.id, current_user.group_ids).find(params[:collection_id])&.id
                    Element.joins(:element_klass, :collections_elements).where('element_klasses.name = ? and collections_elements.collection_id = ?', params[:el_type], collection_id)
                  rescue ActiveRecord::RecordNotFound
                    Element.none
                  end
                elsif params[:sync_collection_id]
                  begin
                    collection_id = current_user.all_sync_in_collections_users.find(params[:sync_collection_id]).collection&.id
                    Element.joins(:element_klass, :collections_elements).where('element_klasses.name = ? and collections_elements.collection_id = (?)', params[:el_type], collection_id)
                  rescue ActiveRecord::RecordNotFound
                    Element.none
                  end
                else
                  Element.none
                end.includes(:tag, collections: :sync_collections_users).order('created_at DESC')

        from = params[:from_date]
        to = params[:to_date]
        by_created_at = params[:filter_created_at] || false
        scope = scope.created_time_from(Time.at(from)) if from && by_created_at
        scope = scope.created_time_to(Time.at(to) + 1.day) if to && by_created_at
        scope = scope.updated_time_from(Time.at(from)) if from && !by_created_at
        scope = scope.updated_time_to(Time.at(to) + 1.day) if to && !by_created_at

        reset_pagination_page(scope)

        paginate(scope).map { |s| ElementListPermissionProxy.new(current_user, s, user_ids).serialized }
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
            element: ElementPermissionProxy.new(current_user, element, user_ids).serialized,
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
        element
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
            element: ElementPermissionProxy.new(current_user, element, user_ids).serialized,
            attachments: Entities::AttachmentEntity.represent(element.attachments)
          }
        end
      end
    end
  end
end
