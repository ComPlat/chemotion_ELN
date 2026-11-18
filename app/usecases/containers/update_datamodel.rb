# frozen_string_literal: true

module Usecases
  module Containers
    class UpdateDatamodel
      attr_reader :current_user

      def initialize(current_user)
        @current_user = current_user
        @variation_links = []
      end

      def update_datamodel(container, element: nil, creating: false)
        return element&.container unless current_user && container

        @element = element
        @variation_links.clear
        root_container = resolve_root(container, creating)
        @root_container = root_container&.root
        return element&.container unless writable_root?(root_container)

        update_description(root_container, container[:description])
        create_or_update_containers(container[:children], root_container, current_user) if container[:children].present?
        flush_variation_links(root_container)
        root_container
      end

      private

      def update_description(container, description)
        container.update!(description: description) unless description.nil?
      end

      def resolve_root(container, creating)
        @new_root_id = nil
        if creating || (container[:is_new] && @element && @element.container.nil? && writable_element?(@element))
          return create_root(creating: creating)
        end
        return if container[:is_new]

        Container.find_by(id: container[:id])
      end

      def create_root(creating:)
        root = Container.create!(container_type: 'root')
        @element.container = root unless creating
        @new_root_id = root.id
        root
      end

      def target_root?(container)
        @new_root_id.present? || @element.nil? || container == @element.container
      end

      def writable_root?(container)
        target_root?(container) && can_update_container?(container)
      end

      # rubocop:disable Metrics/AbcSize, Metrics/CyclomaticComplexity, Metrics/MethodLength, Metrics/PerceivedComplexity
      # rubocop:disable Metrics/BlockLength
      def create_or_update_containers(children, parent_container, current_user = {})
        return unless children
        return unless can_update_container?(parent_container)

        children.each do |child|
          if child[:is_deleted]
            delete_containers_and_attachments(child) unless child[:is_new]
            next
          end

          extended_metadata = child[:extended_metadata]
          if child[:container_type] == 'analysis'
            extended_metadata['content'] = if extended_metadata.key?('content')
                                             extended_metadata['content'].to_json
                                           else
                                             '{"ops":[{"insert":""}]}'
                                           end
          end

          if extended_metadata&.key?('general_description') && extended_metadata['general_description'].is_a?(Hash)
            extended_metadata['general_description'] = extended_metadata['general_description'].to_json
          end

          if child[:is_new]
            # Create container
            container = parent_container.children.create(
              name: child[:name],
              container_type: child[:container_type],
              description: child[:description],
              extended_metadata: extended_metadata,
            )
          else
            # Update container
            next unless (container = scoped_container(child[:id]))

            container.update!(
              name: child[:name],
              container_type: child[:container_type],
              description: child[:description],
              extended_metadata: extended_metadata,
            )
          end

          create_or_update_attachments(container, child[:attachments]) if child[:attachments]

          if child[:container_type] == 'dataset' && child[:dataset].present? && child[:dataset]['changed']
            container.save_dataset(dataset: child[:dataset], element: parent_container&.root&.containable, current_user: current_user) # rubocop:disable Layout/LineLength
          end
          create_or_update_containers(child[:children], container, current_user)
        end
      end

      def create_or_update_attachments(container, attachments)
        return if attachments.empty?

        can_update = can_update_container?(container)
        return unless can_update

        attachments.each do |att|
          attachment = if att[:is_new]
                         Attachment.where(key: att[:id], attachable_id: nil, created_for: current_user.id).last
                       else
                         Attachment.find_by(id: att[:id])
                       end
          next unless attachment && writable_attachment?(attachment)

          if att[:is_deleted]
            attachment.destroy!
            next
          end

          attachment.update!(attachable_id: container.id, attachable_type: 'Container') if container.present?
          next unless att[:is_new] && container.present?

          link = container.variation_link_for(attachment)
          @variation_links << link if link
        end
      end
      # rubocop:enable Metrics/AbcSize, Metrics/CyclomaticComplexity, Metrics/MethodLength, Metrics/PerceivedComplexity
      # rubocop:enable Metrics/BlockLength

      def flush_variation_links(root_container)
        return if @variation_links.empty? || root_container.nil?

        element = root_container.root_element
        return unless element.respond_to?(:assign_attachments_to_variations)

        element.assign_attachments_to_variations(@variation_links)
      end

      def delete_containers_and_attachments(container)
        target = scoped_container(container[:id])
        return unless target

        target.children.each { |child| delete_containers_and_attachments(id: child.id) }
        target.attachments.destroy_all
        target.destroy!
      end

      def scoped_container(id)
        @root_container&.descendants&.find_by(id: id)
      end

      def writable_attachment?(attachment)
        return attachment.created_for == current_user.id if attachment.attachable_id.nil?
        return writable_attachment_root?(attachment.attachable&.root) if attachment.attachable_type == 'Container'

        element = @element || @root_container&.root_element
        element.present? && attachment.attachable == element
      end

      def writable_attachment_root?(root)
        return false unless root
        return true if root == @root_container

        root == current_user.container && root.containable == current_user
      end

      def can_update_container?(container)
        root = container&.root
        return false unless root && root == @root_container
        return true if root.id == @new_root_id

        element = @element || root.containable
        element.present? && writable_element?(element)
      end

      def writable_element?(element)
        ElementPolicy.new(current_user, element).update?
      end
    end
  end
end
