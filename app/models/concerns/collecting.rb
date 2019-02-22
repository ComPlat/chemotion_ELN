# multiple upsert/delete for collections_elements and collection info tag update for associated element
module Collecting
  extend ActiveSupport::Concern

  included do
    class << self
      def delete_in_collection(element_ids, collection_ids)
        sql = sanitize_sql(["#{delete_sql} IN (?)", collection_ids, element_ids])
        db_exec_query(sql)
      end

      def insert_in_collection(element_ids, collection_ids)
        eids = [element_ids].flatten.select(&:present?).map(&:to_i).uniq
        cids = [collection_ids].flatten.select(&:present?).map(&:to_i).uniq
        return unless eids.present? and cids.present?
        values = eids.map { |eid|
          cids.map { |cid|
            "(#{eid},#{cid})"
          }.join(',')
        }.join(',')
        sql = <<~SQL
          INSERT INTO #{table_name} (#{table_name[12..-2]}_id, collection_id)
          VALUES #{values}
          ON CONFLICT (#{table_name[12..-2]}_id, collection_id)
          DO UPDATE SET deleted_at = null
        SQL
        db_exec_query(sql)
      end

      def delete_sql
        @delete_statement ||= <<~SQL
          UPDATE #{table_name} SET deleted_at = Now()
          WHERE #{table_name}.collection_id in (?) AND #{table_name}.deleted_at is null AND #{table_name}.#{table_name[12..-2]}_id
        SQL
      end

      def db_exec_query(sql)
        ActiveRecord::Base.connection.exec_query(sql)
      end

      # Static upsert without checking associated and element colleciton tag update
      def static_create_in_collection(element_ids, collection_ids)
        # upsert in target collection
        insert_in_collection(element_ids, collection_ids)
        # update element tag with collection info
        update_tag_by_element_ids(element_ids)
      end

      def update_tag_by_element_ids(element_ids)
        name[11..-1].constantize.includes(:tag).where(id: element_ids).select(:id)
            .each { |el| el.update_tag!(collection_tag: true) }
      end

      handle_asynchronously :update_tag_by_element_ids

      def delete_in_collection_by_ui_state(**args)
        sql = if args[:checkedAll]
                sanitize_sql(["#{delete_sql} NOT IN (?)", args[:collection_ids], args[:uncheckedIds]])
              else
                sanitize_sql(["#{delete_sql} IN (?)", args[:collection_ids], args[:checkedIds]])
              end
        db_exec_query(sql)
      end

      def update_tag_by_ui_state(**args)
        element_klass = name[11..-1].constantize
        statement = "WHERE collection_id in (?) AND #{table_name}.#{table_name[12..-2]}_id"
        if args[:checkedAll]
          statement += ' NOT IN (?)'
          ids = args[:uncheckedIds]
        else
          statement += ' IN (?)'
          ids = args[:checkedIds]
        end
        element_klass.join_collections_element.includes(:tag)
                     .where(statement, args[:collection_ids], ids)
                     .each { |el| el.update_tag!(collection_tag: true) }
      end
    end
  end
end
