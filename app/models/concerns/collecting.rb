# frozen_string_literal: true

# multiple upsert/delete for collections_elements and collection info tag update for associated element
module Collecting
  extend ActiveSupport::Concern

  # rubocop:disable Metrics/BlockLength
  included do
    class << self
      # Foreign key for the associated element model
      # @return [String, nil] the name of foreign key in the table for the associated element.
      # @note This method expect the current AR model to represent a join table between
      #   the Collection model and another element model:
      #   The model should only have 2 reflections with one being with Collection.
      # @example
      #   "CollectionsSample.element_foreign_key"              #=> "sample_id"
      #   "Labimotion::CollectionsElement.element_foreign_key" #=> "element_id"
      #   "CollectionsCellline.element_foreign_key             #=> "cellline_sample_id"
      def element_foreign_key
        reflections.find { |key, _| key != 'collection' }&.last&.foreign_key
      end

      # AR model for the associated element
      # @return [Class<ActiveRecord>, nil] ActiveRecord model for the associated element.
      # @example
      #   "CollectionsSample.element_klass"              #=> "Sampl"
      #   "Labimotion::CollectionsElement.element_klass" #=> "Labimotion::Element"
      #   "CollectionsCellline.element_klass             #=> "CelllineSample"
      # @note (see #element_foreign_key)
      def element_klass
        reflections.find { |key, _| key != 'collection' }&.last&.klass
      end

      # Build the list of paired foreign_key ids for a sql statement
      # @param element_ids [Array<Integer>] list of element ids
      # @param collection_ids [Array<Integer>] list of collection ids
      # @return [String] SQL list of (element_id, collection_id) pairs
      # @example
      #  "value_list_sql([1, 2], [3, 4])" #=> "(1, 3), (1, 4), (2, 3), (2, 4)"
      # @todo make private
      def paired_id_list_sql(element_ids, collection_ids)
        return '' if element_ids.empty? || collection_ids.empty?

        element_ids.product(collection_ids).map { |pair| "(#{pair.join(',')})" }.join(',')
      end

      # upserts elements in collections
      # @param element_ids [Array<Integer>, Integer] list of element ids
      # @param collection_ids [Array<Integer>, Integer] list of collection ids
      # @note only process ids of existing element and collection records where deleted_at is nil
      def insert_in_collection(element_ids, collection_ids)
        element_ids = element_klass.where(id: element_ids).pluck(:id)
        collection_ids = Collection.where(id: collection_ids).pluck(:id)
        return if (values = paired_id_list_sql(element_ids, collection_ids)).blank?

        sql = <<~SQL.squish
          INSERT INTO #{table_name} (#{element_foreign_key}, collection_id)
          VALUES #{values}
          ON CONFLICT (#{element_foreign_key}, collection_id)
          DO UPDATE SET deleted_at = null
        SQL
        db_exec_query(sql)
      end

      def delete_sql
        @delete_sql ||= <<~SQL.squish
          UPDATE #{table_name} SET deleted_at = Now()
          WHERE #{table_name}.collection_id in (?) AND #{table_name}.deleted_at is null AND #{table_name}.#{element_foreign_key}
        SQL
      end

      def delete_in_collection(element_ids, collection_ids)
        sql = sanitize_sql(["#{delete_sql} IN (?)", collection_ids, element_ids])
        db_exec_query(sql)
      end

      def db_exec_query(sql)
        ActiveRecord::Base.connection.exec_query(sql)
      end

      # Static upsert without checking associated and element collection tag update
      def static_create_in_collection(element_ids, collection_ids)
        # upsert in target collection
        insert_in_collection(element_ids, collection_ids)
        # update element tag with collection info
        update_tag_by_element_ids(element_ids)
      end

      def update_tag_by_element_ids(element_ids)
        element_klass.includes(:tag).where(id: element_ids).select(:id)
                     .each { |el| el.update_tag!(collection_tag: true) }
      end

      handle_asynchronously :update_tag_by_element_ids

      def queue_name
        'collecting'
      end

      def delete_in_collection_by_ui_state(**args)
        sql = if args[:checkedAll]
                sanitize_sql(["#{delete_sql} NOT IN (?)", args[:collection_ids], args[:uncheckedIds]])
              else
                sanitize_sql(["#{delete_sql} IN (?)", args[:collection_ids], args[:checkedIds]])
              end
        db_exec_query(sql)
      end

      def update_tag_by_ui_state(**args)
        statement = "WHERE collection_id in (?) AND #{table_name}.#{element_foreign_key}"
        if args[:checkedAll]
          statement += ' NOT IN (?)'
          ids = args[:uncheckedIds]
        else
          statement += ' IN (?)'
          ids = args[:checkedIds]
        end
        element_klass.join_collections_element.includes(:tag)
                     .where(statement, args[:collection_ids], ids)
                     .find_each { |el| el.update_tag!(collection_tag: true) }
      end
    end
    # rubocop:enable Metrics/BlockLength
  end
end
