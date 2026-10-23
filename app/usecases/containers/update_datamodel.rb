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
        # TODO: check this logic, not sure this is still needed + containable_type should not be null
        root_container = if container[:is_new]
                           Container.create(
                             # name: "root",
                             container_type: container[:containable_type], # should be 'root'
                           )
                         else
                           Container.find_by id: container[:id]
                           # root_container.name = "root" #if it is created from client.side
                         end
        # root_container.save!
        # ODOT
        # The whole tree is scoped to this root: the client may only touch containers and attachments
        # that belong to the element being saved. Authorize the root once, then the per-node checks
        # (in_tree? / Access#write?) keep every mutation inside it.
        @root_container = root_container
        return root_container unless can_update_root?(container, root_container)

        # Snapshot the saved tree once; membership is then tested in memory (in_tree?) instead of a
        # subtree query per node. New containers created in this request are never checked against it.
        @tree_ids = ([@root_container.id] + @root_container.descendant_ids).to_set

        unless container[:description].nil? || root_container.nil?
          root_container[:description] = container[:description]
          root_container.save!
        end
        create_or_update_containers(container[:children], root_container, current_user) if container[:children].present?
        flush_variation_links(root_container)
        root_container
      end

      private

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
            # Only existing containers that belong to the saved tree may be updated; a foreign id is
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
          # Gate both the move and the destroy: the caller may only act on an attachment they could
          # already write — their own unattached upload (incl. inbox), or one on an element they may
          # edit — never one belonging to another user's element. For a new upload this is the only
          # ownership check (the query matches by key alone).
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
      # The real database subtree is used, not the client-supplied +children+, so a crafted tree can
      # neither reach outside the saved element nor skip a real child. Attachments are destroyed
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

      # Authorize the root of the tree being saved. A root created in this request is allowed; an
      # existing one is allowed only when its element is updatable by the user. A rootless/orphan
      # container (no containable) is denied — it must not be a blanket allow.
      def can_update_root?(container_params, root_container)
        return false if root_container.nil?
        return true if container_params[:is_new]

        element = root_container.root.containable
        return false if element.nil?

        ElementPolicy.new(current_user, element).update?
      end

      # True when +container+ is the saved root or one of its descendants, tested against the
      # snapshot taken in update_datamodel (the +container.present?+ guard keeps a nil find_by safe).
      def in_tree?(container)
        container.present? && @tree_ids.present? && @tree_ids.include?(container.id)
      end
    end
  end
end
