# frozen_string_literal: true

module Usecases
  module Containers
    class UpdateDatamodel
      attr_reader :current_user

      def initialize(current_user)
        @current_user = current_user
        @variation_links = []
        @root_container = nil
        @tree_ids = nil
        @access = Usecases::Attachments::Access.new(current_user)
      end

      def update_datamodel(container)
        root_container = resolve_root(container)
        # Only apply the client tree when the root is one the caller may update; otherwise the root is
        # returned unchanged (a new/empty or orphan container) or refused (another element's root).
        return root_container unless apply_tree_to?(container, root_container)

        # Snapshot the saved tree once; membership is then tested in memory (in_tree?) instead of a
        # subtree query per node. New containers created in this request are never checked against it.
        @tree_ids = ([root_container.id] + root_container.descendant_ids).to_set

        unless container[:description].nil?
          root_container[:description] = container[:description]
          root_container.save!
        end
        create_or_update_containers(container[:children], root_container, current_user) if container[:children].present?
        flush_variation_links(root_container)
        root_container
      end

      private

      # Resolve the root the client refers to: a freshly created one for a new container, otherwise the
      # existing row (or nil when none is referenced). Stored for the in-tree snapshot.
      #
      # @return [Container, nil]
      def resolve_root(container)
        # TODO: check this logic, not sure this is still needed + containable_type should not be null
        @root_container = if container[:is_new]
                            Container.create(container_type: container[:containable_type]) # should be 'root'
                          else
                            Container.find_by(id: container[:id])
                          end
      end

      # Whether the client's tree may be applied to +root_container+.
      #
      # @raise [Errors::Unauthorized] when the root belongs to a live element the user may not update,
      #   so `element.container = update_datamodel(...)` cannot adopt another element's root.
      # @return [Boolean] false for a missing root or a rootless/orphan existing root (adoptable as
      #   before, but the client's children are not applied to orphan data); true otherwise.
      def apply_tree_to?(container, root_container)
        return false if root_container.nil?

        element = root_container.root.containable
        if element
          unless ElementPolicy.new(current_user, element).update?
            raise Errors::Unauthorized, 'container tree does not belong to an updatable element'
          end

          return true
        end

        container[:is_new] || false
      end

      # rubocop:disable Metrics/AbcSize, Metrics/CyclomaticComplexity, Metrics/MethodLength, Metrics/PerceivedComplexity
      # rubocop:disable Metrics/BlockLength
      def create_or_update_containers(children, parent_container, current_user = {})
        return unless children

        children.each do |child|
          if child[:is_deleted]
            delete_container_subtree(child[:id]) unless child[:is_new]
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
            next unless (container = Container.find_by(id: child[:id]))
            # Only existing containers that belong to the saved tree may be updated; an id outside it is
            # skipped together with its attachments and children.
            next unless in_tree?(container)

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

        # The destination container was created or verified in-tree by create_or_update_containers.

        attachments.each do |att|
          attachment = if att[:is_new]
                         Attachment.where(key: att[:id], attachable: nil).last
                       else
                         Attachment.where(id: att[:id]).last
                       end
          next unless attachment
          # Gate both the move and the destroy through the shared write rule: an attachment is acted on
          # only when the caller may already write it — their own unattached upload (incl. inbox), or one
          # on an element they may edit. For a new upload this is the only ownership check (the query
          # matches by key alone).
          next unless @access.write?(attachment)

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

      # Destroy a container and its whole subtree, but only when it belongs to the tree being saved.
      # The real database subtree is used, not the client-supplied +children+, so the deletion stays
      # within the saved element's own subtree and covers every real child. Attachments are destroyed
      # explicitly because Container#attachments has no dependent: :destroy.
      def delete_container_subtree(child_id)
        container = Container.find_by(id: child_id)
        return unless in_tree?(container)

        subtree = container.self_and_descendants.to_a
        ids = subtree.map(&:id)
        Attachment.where(attachable_type: 'Container', attachable_id: ids).destroy_all
        # Per-record destroy so each fires before_destroy :destroy_datasetable; closure_tree clears the
        # hierarchy rows for whichever node is removed, so the order among them does not matter.
        subtree.each(&:destroy)
      end

      # True when +container+ is the saved root or one of its descendants, tested against the
      # snapshot taken in update_datamodel (the +container.present?+ guard keeps a nil find_by safe).
      def in_tree?(container)
        container.present? && @tree_ids.present? && @tree_ids.include?(container.id)
      end
    end
  end
end
