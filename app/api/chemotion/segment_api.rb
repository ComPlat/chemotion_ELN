module Chemotion
  class SegmentAPI < Grape::API
    include Grape::Kaminari
    helpers GenericHelpers

    resource :segments do
      namespace :klasses do
        desc 'get segment klasses'
        params do
          optional :element, type: String, desc: 'Klass Element, e.g. Sample, Reaction, Mof,...'
        end
        get do
          list = SegmentKlass.joins(:element_klass).where(klass_element: params[:element], is_active: true) if params[:element].present?
          list = SegmentKlass.joins(:element_klass).where(is_active: true) unless params[:element].present?
          present list.sort_by(&:place), with: Entities::SegmentKlassEntity, root: 'klass'
        end
      end

      namespace :list_segment_klass do
        desc 'list Generic Segment Klass'
        params do
          optional :is_active, type: Boolean, desc: 'Active or Inactive Segment'
        end
        get do
          list = SegmentKlass.where(is_active: params[:is_active]) if params[:is_active].present?
          list = SegmentKlass.all unless params[:is_active].present?
          present list.sort_by(&:place), with: Entities::SegmentKlassEntity, root: 'klass'
        end
      end

      namespace :create_segment_klass do
        desc 'create Generic Segment Klass'
        params do
          requires :label, type: String, desc: 'Segment Klass Label'
          requires :element_klass, type: Integer, desc: 'Element Klass Id'
          optional :desc, type: String, desc: 'Segment Klass Desc'
          optional :place, type: String, desc: 'Segment Klass Place', default: '100'
          optional :properties_template, type: Hash, desc: 'Element Klass properties template'
        end
        after_validation do
          authenticate_admin!('segments')
          @klass = fetch_klass('ElementKlass', params[:element_klass])
        end
        post do
          place = params[:place]
          begin
            place = place.to_i if place.present? && place.to_i == place.to_f
          rescue StandardError
            place = 100
          end

          uuid = SecureRandom.uuid
          template = { uuid: uuid, layers: {}, select_options: {} }
          attributes = declared(params, include_missing: false)
          attributes[:properties_template]['uuid'] = uuid if attributes[:properties_template].present?
          template = attributes[:properties_template].present? ? attributes[:properties_template] : template
          template['eln'] = Chemotion::Application.config.version
          template['klass'] = 'SegmentKlass'
          attributes.merge!(properties_template: template, element_klass: @klass, created_by: current_user.id, place: place)
          attributes[:uuid] = uuid
          attributes[:released_at] = DateTime.now
          attributes[:properties_release] = attributes[:properties_template]
          klass = SegmentKlass.create!(attributes)
          klass.reload
          klass.create_klasses_revision(current_user.id)
        rescue ActiveRecord::RecordInvalid => e
          { error: e.message }
        end
      end

      namespace :update_segment_klass do
        desc 'update Generic Segment Klass'
        params do
          requires :id, type: Integer, desc: 'Segment Klass ID'
          optional :label, type: String, desc: 'Segment Klass Label'
          optional :desc, type: String, desc: 'Segment Klass Desc'
          optional :place, type: String, desc: 'Segment Klass Place', default: '100'
          optional :identifier, type: String, desc: 'Segment Identifier'
        end
        after_validation do
          authenticate_admin!('segments')
          @segment = fetch_klass('SegmentKlass', params[:id])
        end
        post do
          place = params[:place]
          begin
            place = place.to_i if place.present? && place.to_i == place.to_f
          rescue StandardError
            place = 100
          end
          attributes = declared(params, include_missing: false)
          attributes.delete(:id)
          attributes[:place] = place
          @segment&.update!(attributes)
        end
      end
    end
  end
end
