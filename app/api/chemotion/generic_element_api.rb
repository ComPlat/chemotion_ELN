# frozen_string_literal: true

module Chemotion
  # Generic Element API

  # rubocop:disable Metrics/ClassLength
  # rubocop:disable Style/MultilineIfModifier
  # rubocop:disable Metrics/BlockLength
  # rubocop:disable Style/MultilineIfThen

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
          list = ElementKlass
                 .where(is_active: true, is_generic: true)
                 .order('place') if params[:generic_only].present? && params[:generic_only] == true
          list = ElementKlass
                 .where(is_active: true)
                 .order('place') unless params[:generic_only].present? && params[:generic_only] == true

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
          att_ary = create_uploads(
            'Element',
            params[:att_id],
            params[:elfiles],
            params[:elInfo],
            current_user.id,
          ) if params[:elfiles].present? && params[:elInfo].present?

          (attach_ary << att_ary).flatten! unless att_ary&.empty?

          att_ary = create_uploads(
            'Segment',
            params[:att_id],
            params[:sefiles],
            params[:seInfo],
            current_user.id,
          ) if params[:sefiles].present? && params[:seInfo].present?

          (attach_ary << att_ary).flatten! unless att_ary&.empty?

          if params[:attfiles].present? || params[:delfiles].present? then
            att_ary = create_attachments(
              params[:attfiles],
              params[:delfiles],
              params[:att_type],
              params[:att_id],
              params[:attfilesIdentifier],
              current_user.id,
            )
          end
          (attach_ary << att_ary).flatten! unless att_ary&.empty?
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
        optional :sort_column, type: String, desc: 'sort by updated_at or selected layers property'
      end
      paginate per_page: 7, offset: 0, max_per_page: 100
      get do
        collection_id =
          if params[:collection_id]
            Collection
              .owned_by(user_ids)
              .find_by(id: params[:collection_id])&.id
          elsif params[:sync_collection_id]
            current_user
              .all_sync_in_collections_users
              .find_by(id: params[:sync_collection_id])&.collection&.id
          end

        scope =
          if collection_id
            Element
              .joins(:element_klass, :collections_elements)
              .where(
                element_klasses: { name: params[:el_type] },
                collections_elements: { collection_id: collection_id },
              )
          else
            Element.none
          end

        from = params[:from_date]
        to = params[:to_date]
        by_created_at = params[:filter_created_at] || false

        if params[:sort_column]&.include?('.')
          layer, field = params[:sort_column].split('.')

          element_klass = ElementKlass.find_by(name: params[:el_type])
          allowed_fields = element_klass.properties_release.dig('layers', layer, 'fields')&.pluck('field') || []

          if field.in?(allowed_fields)
            query = ActiveRecord::Base.sanitize_sql(
              [
                "LEFT JOIN LATERAL(
                  SELECT field->'value' AS value
                  FROM jsonb_array_elements(properties->'layers'->:layer->'fields') a(field)
                  WHERE field->>'field' = :field
                ) a ON true",
                { layer: layer, field: field },
              ],
            )
            scope = scope.joins(query).order('value ASC NULLS FIRST')
          else
            scope = scope.order(updated_at: :desc)
          end
        else
          scope = scope.order(updated_at: :desc)
        end

        scope = scope.created_time_from(Time.at(from)) if from && by_created_at
        scope = scope.created_time_to(Time.at(to) + 1.day) if to && by_created_at
        scope = scope.updated_time_from(Time.at(from)) if from && !by_created_at
        scope = scope.updated_time_to(Time.at(to) + 1.day) if to && !by_created_at

        reset_pagination_page(scope)

        generic_elements = paginate(scope).map do |element|
          Entities::ElementEntity.represent(
            element,
            displayed_in_list: true,
            detail_levels: ElementDetailLevelCalculator.new(user: current_user, element: element).detail_levels,
          )
        end
        { generic_elements: generic_elements }
      end

      desc 'Return serialized element by id'
      params do
        requires :id, type: Integer, desc: 'Element id'
      end
      route_param :id do
        before do
          error!('401 Unauthorized', 401) unless current_user.matrix_check_by_name('genericElement') &&
                                                 ElementPolicy.new(current_user, Element.find(params[:id])).read?
        end

        get do
          element = Element.find(params[:id])
          {
            element: Entities::ElementEntity.represent(
              element,
              detail_levels: ElementDetailLevelCalculator.new(user: current_user, element: element).detail_levels,
            ),
            attachments: Entities::AttachmentEntity.represent(element.attachments),
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
          created_by: current_user.id,
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

        present(
          element,
          with: Entities::ElementEntity,
          root: :element,
          detail_levels: ElementDetailLevelCalculator.new(user: current_user, element: element).detail_levels,
        )
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
          properties['eln'] = Chemotion::Application.config.version if properties['eln'] !=
                                                                       Chemotion::Application.config.version
          if element.klass_uuid !=
             properties['klass_uuid'] ||
             element.properties != properties ||
             element.name != params[:name]
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
            element: Entities::ElementEntity.represent(
              element,
              detail_levels: ElementDetailLevelCalculator.new(user: current_user, element: element).detail_levels,
            ),
            attachments: Entities::AttachmentEntity.represent(element.attachments),
          }
        end
      end
    end
  end
end
# rubocop:enable Metrics/ClassLength
# rubocop:enable Style/MultilineIfModifier
# rubocop:enable Metrics/BlockLength
# rubocop:enable Style/MultilineIfThen
