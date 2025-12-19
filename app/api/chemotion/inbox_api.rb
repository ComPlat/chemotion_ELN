# frozen_string_literal: true

module Chemotion
  class InboxAPI < Grape::API
    helpers ParamsHelpers

    helpers do
      def build_sort_params(params_sort_column)
        sort_column = params_sort_column.eql?('created_at') ? params_sort_column : 'filename'
        sort_direction = sort_column.eql?('created_at') ? 'DESC' : 'ASC'
        { sort_column: sort_column, sort_direction: sort_direction }
      end
    end

    resource :inbox do
      params do
        requires :cnt_only, type: Boolean, desc: 'return count number only'
        optional :sort_column, type: String, desc: 'sort by creation time or name',
                               values: %w[created_at name],
                               default: 'name'
      end

      paginate per_page: 20, offset: 0, max_per_page: 50

      get do
        current_user.container = Container.create(name: 'inbox', container_type: 'root') unless current_user.container

        if params[:cnt_only]
          present current_user.container, with: Entities::InboxEntity,
                                          root_container: true,
                                          root: :inbox,
                                          only: [:inbox_count]
        else
          sort_params = build_sort_params(params[:sort_column])

          scope = current_user.container.children.order(:name)

          reset_pagination_page(scope)

          device_boxes = paginate(scope).map do |device_box|
            Entities::InboxEntity.represent(device_box, root_container: true)
          end

          inbox_service = InboxService.new(current_user.container)
          present inbox_service.to_hash(device_boxes, sort_params, true)
        end
      end

      desc 'Return files by subcontainer ID'
      params do
        requires :container_id, type: Integer, desc: 'subcontainer ID'
        optional :dataset_page, type: Integer, desc: 'Pagination number'
        optional :sort_column, type: String, desc: 'sort by creation time or name',
                               values: %w[created_at name],
                               default: 'name'
      end

      get 'containers/:container_id' do
        if current_user.container.present?
          container = current_user.container.children.find params[:container_id]

          dataset_sort_column = params[:sort_column].presence || 'name'
          sort_params = build_sort_params(params[:sort_column])

          Entities::InboxEntity.represent(container,
                                          root_container: false,
                                          dataset_page: params[:dataset_page],
                                          dataset_sort_column: dataset_sort_column,
                                          sort_column: sort_params[:sort_column],
                                          sort_direction: sort_params[:sort_direction],
                                          root: :inbox)
        end
      end

      desc 'Returns unlinked attachments for inbox'
      params do
        optional :sort_column, type: String, desc: 'sort unlinked attachments by creation time or name',
                               values: %w[created_at name],
                               default: 'name'
      end

      get 'unlinked_attachments' do
        sort_params = build_sort_params(params[:sort_column])

        inbox_service = InboxService.new(current_user.container)
        present inbox_service.to_hash(nil, sort_params, false)
      end

      resource :samples do
        desc 'search samples from user by'
        params do
          requires :search_string, type: String, desc: 'Search String'
        end
        get do
          samples = InboxSearchElements.call(
            search_string: params[:search_string],
            current_user: current_user,
            element: :sample,
          )

          res = samples.map do |s|
            {
              id: s.id,
              name: s.name,
              short_label: s.short_label,
              type: s.reactions_samples.map do |rs|
                rs.type.sub(/^Reactions/, '').sub('Sample', '')
              end.first,
            }
          end

          { samples: res }
        end

        desc 'assign attachment to sample'
        params do
          requires :attachment_id, type: Integer, desc: 'Attachment ID'
        end
        before do
          @sample = Sample.find(params[:sample_id])
          error!('401 Unauthorized', 401) unless ElementPolicy.new(current_user, @sample).update?
          @attachment = Attachment.find(params[:attachment_id])
          error!('401 Unauthorized', 401) unless @attachment.created_for == current_user.id
        end
        post ':sample_id' do
          analysis_name = @attachment.filename.chomp(File.extname(@attachment.filename))

          dataset = @sample.container.analyses_container.create_analysis_with_dataset!(name: analysis_name)

          @attachment.update!(attachable: dataset)

          @link = "#{Rails.application.config.root_url}/mydb/collection/all/sample/#{@sample.id}"

          Message.create_msg_notification(
            channel_subject: Channel::ASSIGN_INBOX_TO_SAMPLE,
            message_from: current_user.id,
            data_args: { filename: @attachment.filename, info: "#{@sample.short_label} #{@sample.name}" },
            url: @link,
            level: 'success',
          )

          present dataset, with: Entities::ContainerEntity, root: :container
        end
      end

      resource :reactions do
        desc 'search reactions from user by'
        params do
          requires :search_string, type: String, desc: 'Search String'
        end
        get do
          reactions = InboxSearchElements.call(
            search_string: params[:search_string],
            current_user: current_user,
            element: :reaction,
          )

          res = reactions.map do |r|
            {
              id: r.id,
              name: r.name,
              short_label: r.short_label,
              type: '',
            }
          end
          { reactions: res }
        end

        desc 'assign attachment to reaction'
        params do
          requires :attachment_id, type: Integer, desc: 'Attachment ID'
        end
        before do
          @reaction = Reaction.find(params[:reaction_id])
          error!('401 Unauthorized', 401) unless ElementPolicy.new(current_user, @reaction).update?
          @attachment = Attachment.find(params[:attachment_id])
          error!('401 Unauthorized', 401) unless @attachment.created_for == current_user.id
        end
        post ':reaction_id' do
          analysis_name = @attachment.filename.chomp(File.extname(@attachment.filename))

          dataset = @reaction.container.analyses_container.create_analysis_with_dataset!(name: analysis_name)

          @attachment.update!(attachable: dataset)

          @link = "#{Rails.application.config.root_url}/mydb/collection/all/reaction/#{@reaction.id}"

          Message.create_msg_notification(
            channel_subject: Channel::ASSIGN_INBOX_TO_SAMPLE,
            message_from: current_user.id,
            data_args: { filename: @attachment.filename, info: "#{@reaction.short_label} #{@reaction.name}" },
            url: @link,
            level: 'success',
          )

          present dataset, with: Entities::ContainerEntity, root: :container
        end
      end
    end
  end
end
