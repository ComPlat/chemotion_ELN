# frozen_string_literal: true

module Entities
  class InboxEntity < ApplicationEntity
    DATASETS_PER_PAGE = 35
    MAX_ATTACHMENTS = 50

    expose(
      :id,
      :name,
      :children,
      :children_count,
      :container_type,
      :inbox_count,
      :unlinked_attachments,
    )

    private

    def children
      depth = options[:root_container] ? 1 : 2
      start_index, end_index = calculate_indices

      parent_objects = object.hash_tree(limit_depth: depth)[object].to_a
      sorted_parents = sort_parent_objects(parent_objects)

      parents_slice = sorted_parents[start_index..end_index]

      serialize_children(parents_slice.to_h)
    end

    def calculate_indices
      dataset_page = (options[:dataset_page] || 1).to_i
      start_index = (dataset_page - 1) * DATASETS_PER_PAGE
      end_index = start_index + DATASETS_PER_PAGE - 1
      [start_index, end_index]
    end

    # here the datasets within the deviceBoxes are being sorted

    def sort_parent_objects(parent_objects)
      sorted_parents = parent_objects.sort_by { |container, _| container.send(options[:dataset_sort_column]) }
      options[:dataset_sort_column].eql?('created_at') ? sorted_parents.reverse : sorted_parents
    end

    def serialize_children(container_tree_hash)
      container_tree_hash.map do |container, subcontainers|
        current_attachments = all_descendants_attachments.select { |att| att.attachable_id == container.id }

        {
          id: container.id,
          name: container.name,
          container_type: container.container_type,
          attachments: current_attachments,
          created_at: I18n.l(container.created_at, format: :eln_timestamp),
          children: serialize_children(subcontainers).compact,
        }
      end
    end

    def children_count
      object.children.size
    end

    def unlinked_attachments
      Attachment.where(
        attachable_type: 'Container',
        attachable_id: nil,
        created_for: object&.containable&.id,
      ).order("#{options[:sort_column]} #{options[:sort_direction]}")
    end

    def all_descendants_attachments
      @all_descendants_attachments ||= Attachment.where_container(object.child_ids)
                                                 .where("id IN (
                                                         SELECT id
                                                         FROM attachments AS sub_attachments
                                                         WHERE sub_attachments.attachable_id = attachments.attachable_id
                                                         LIMIT 50
                                                       )").order("#{options[:sort_column]} #{options[:sort_direction]}")
    end

    def inbox_count
      inbox_obj = options[:root_container] ? object : object.parent
      Container.where(id: inbox_obj.descendant_ids)
               .joins(children: :attachments)
               .count('attachments.id') +
        unlinked_attachments.size.to_i
    end
  end
end
