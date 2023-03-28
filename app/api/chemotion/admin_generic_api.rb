# frozen_string_literal: true

module Chemotion
  class AdminGenericAPI < Grape::API # rubocop:disable Metrics/ClassLength
    resource :admin_generic do # rubocop:disable Metrics/BlockLength
      namespace :update_element_template do
        desc 'update Generic Element Properties Template'
        params do
          requires :id, type: Integer, desc: 'Element Klass ID'
          optional :label, type: String, desc: 'Element Klass Label'
          requires :properties_template, type: Hash
          optional :is_release, type: Boolean, default: false
        end
        post do
          klass = ElementKlass.find(params[:id])
          uuid = SecureRandom.uuid
          properties = params[:properties_template]
          properties['uuid'] = uuid
          properties['eln'] = Chemotion::Application.config.version
          properties['klass'] = 'ElementKlass'
          klass.properties_template = properties
          klass.save!
          klass.reload
          klass.create_klasses_revision(current_user.id) if params[:is_release] == true

          present klass, with: Entities::ElementKlassEntity
        end
      end

      namespace :create_element_klass do
        desc 'create Generic Element Properties Template'
        params do
          requires :name, type: String, desc: 'Element Klass Name'
          requires :label, type: String, desc: 'Element Klass Label'
          requires :klass_prefix, type: String, desc: 'Element Klass Short Label Prefix'
          optional :icon_name, type: String, desc: 'Element Klass Icon Name'
          optional :desc, type: String, desc: 'Element Klass Desc'
          optional :properties_template, type: Hash, desc: 'Element Klass properties template'
        end
        post do
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
          klass_names_file = Rails.root.join('config/klasses.json')
          klasses = ElementKlass.where(is_active: true)&.pluck(:name) || []
          bytes_written = File.write(klass_names_file, klasses)
          if bytes_written == klasses.length
            puts "File successfully written"
          else
            puts "Error writing file"
          end
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

      namespace :de_active_element_klass do
        desc 'activate or inactive Generic Element Klass'
        params do
          requires :klass_id, type: Integer, desc: 'Element Klass ID'
          requires :is_active, type: Boolean, desc: 'Active or Inactive Klass'
        end
        post do
          klass = ElementKlass.find(params[:klass_id])
          klass&.update!(is_active: params[:is_active])
          klass_dir = File.join(Rails.root, 'config')
          !File.directory?(klass_dir) && FileUtils.mkdir_p(klass_dir)
          klass_names_file = File.join(klass_dir, 'klasses.json')
          klasses = ElementKlass.where(is_active: true)&.pluck(:name) || []
          File.write(klass_names_file, klasses)
          load Rails.root.join('config/klasses.json')


          present klass, with: Entities::ElementKlassEntity
        end
      end

      namespace :delete_element_klass do
        desc 'delete Generic Element Klass'
        params do
          requires :klass_id, type: Integer, desc: 'Element Klass ID'
        end
        post do
          klass = ElementKlass.find(params[:klass_id])
          klass&.destroy!

          klass_dir = File.join(Rails.root, 'config')
          !File.directory?(klass_dir) && FileUtils.mkdir_p(klass_dir)
          klass_names_file = File.join(klass_dir, 'klasses.json')
          klasses = ElementKlass.where(is_active: true)&.pluck(:name) || []
          File.write(klass_names_file, klasses)

          status 201
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
          @klass = ElementKlass.find(params[:element_klass])
          error!('Klass is invalid. Please re-select.', 500) if @klass.nil?
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

          {} # FE does not use the result
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
        end
        after_validation do
          @segment = SegmentKlass.find(params[:id])
          error!('Segment is invalid. Please re-select.', 500) if @segment.nil?
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

          {} # FE does not use the result
        end
      end

      namespace :de_active_segment_klass do
        desc 'activate or inactive Generic Segment Klass'
        params do
          requires :id, type: Integer, desc: 'Segment Klass ID'
          requires :is_active, type: Boolean, desc: 'Active or Inactive Segment'
        end
        after_validation do
          @segment = SegmentKlass.find(params[:id])
          error!('Segment is invalid. Please re-select.', 500) if @segment.nil?
        end
        post do
          present @segment&.update!(is_active: params[:is_active]), with: Entities::SegmentKlassEntity
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

      namespace :list_segment_klass do
        desc 'list Generic Segment Klass'
        params do
          optional :is_active, type: Boolean, desc: 'Active or Inactive Segment'
        end
        get do
          list = params[:is_active].present? ? SegmentKlass.where(is_active: params[:is_active]) : SegmentKlass.all
          list.order(place: :asc)

          present list, with: Entities::SegmentKlassEntity, root: 'klass'
        end
      end

      namespace :update_segment_template do
        desc 'update Generic Segment Properties Template'
        params do
          requires :id, type: Integer, desc: 'Segment Klass ID'
          requires :properties_template, type: Hash
          optional :is_release, type: Boolean, default: false
        end
        after_validation do
          @segment = SegmentKlass.find(params[:id])
          error!('Segment is invalid. Please re-select.', 500) if @segment.nil?
        end
        post do
          uuid = SecureRandom.uuid
          properties = params[:properties_template]
          properties['uuid'] = uuid
          properties['eln'] = Chemotion::Application.config.version
          properties['klass'] = @segment.class.name

          @segment.properties_template = properties
          @segment.save!
          @segment.reload
          @segment.create_klasses_revision(current_user.id) if params[:is_release] == true

          present @segment, with: Entities::SegmentKlassEntity
        end
      end

      # TODO: Endpoint is currently unused
      namespace :delete_segment_klass do
        desc 'delete Generic Segment Klass'
        route_param :id do
          before do
            @segment = SegmentKlass.find(params[:id])
          end
          delete do
            @segment&.destroy!
          end
        end
      end

      namespace :delete_klass_revision do
        desc 'delete Generic Element Klass'
        params do
          requires :id, type: Integer, desc: 'Revision ID'
          requires :klass_id, type: Integer, desc: 'Klass ID'
          requires :klass, type: String, desc: 'Klass', values: %w[ElementKlass SegmentKlass DatasetKlass]
        end
        post do
          revision = "#{params[:klass]}esRevision".constantize.find(params[:id])
          klass = params[:klass].constantize.find_by(id: params[:klass_id]) unless revision.nil?
          error!('Revision is invalid.', 404) if revision.nil?
          error!('Can not delete the active revision.', 405) if revision.uuid == klass.uuid
          revision&.destroy!

          status 201
        end
      end

      namespace :list_dataset_klass do
        desc 'list Generic Dataset Klass'
        params do
          optional :is_active, type: Boolean, desc: 'Active or Inactive Dataset'
        end
        get do
          list = params[:is_active].present? ? DatasetKlass.where(is_active: params[:is_active]) : DatasetKlass.all
          list.order(place: :asc)

          present list, with: Entities::DatasetKlassEntity, root: 'klass'
        end
      end

      namespace :de_active_dataset_klass do
        desc 'activate or inactive Generic Dataset Klass'
        params do
          requires :id, type: Integer, desc: 'Dataset Klass ID'
          requires :is_active, type: Boolean, desc: 'Active or Inactive Dataset'
        end
        after_validation do
          @dataset = DatasetKlass.find(params[:id])
          error!('Dataset is invalid. Please re-select.', 500) if @dataset.nil?
        end
        post do
          @dataset&.update!(is_active: params[:is_active])

          {} # result is not used by FE
        end
      end

      namespace :update_dataset_template do
        desc 'update Generic Dataset Properties Template'
        params do
          requires :id, type: Integer, desc: 'Dataset Klass ID'
          requires :properties_template, type: Hash
          optional :is_release, type: Boolean, default: false
        end
        after_validation do
          @klass = DatasetKlass.find(params[:id])
          error!('Dataset is invalid. Please re-select.', 500) if @klass.nil?
        end
        post do
          uuid = SecureRandom.uuid
          properties = params[:properties_template]
          properties['uuid'] = uuid
          properties['eln'] = Chemotion::Application.config.version
          properties['klass'] = @klass.class.name
          @klass.properties_template = properties
          @klass.save!
          @klass.reload
          @klass.create_klasses_revision(current_user.id) if params[:is_release] == true

          present @klass, with: Entities::DatasetKlassEntity
        end
      end
    end
  end
end
