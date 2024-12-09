# frozen_string_literal: true

# multiple upsert/delete for collections_elements and collection info tag update for associated element
module SequenceUtilities
  extend ActiveSupport::Concern
  included do
    # Reset the sequence of the table if the id is an Integer
    #  and the last id is less than the current sequence value
    def reset_sequence
      return unless self.class.column_type(:id) == :integer

      self.class.reset_sequence unless self.class.sequence_val <= self.class.last_id
    end
  end

  # rubocop:disable Metrics/BlockLength
  class_methods do
    # Get the last id of the table
    #
    # @return [Integer] the last id of the table
    def last_id
      (respond_to?(:with_deleted) ? with_deleted : all).maximum(:id) || 0
    end

    # Get the current value of the sequence
    # @return [Integer] the current value of the sequence
    def sequence_val
      ActiveRecord::Base.connection.execute("SELECT last_value FROM #{sequence_name};")
                        .first.fetch('last_value', nil)
    end

    # Get the type of the a column
    #
    # @param type [String, Symbol] the name of the column
    # @return [Symbol] the type of the column
    def column_type(name)
      columns_hash[name.to_s].type
    rescue NoMethodError
      logger.error("Column #{name} not found in #{table_name}")
      nil
    end

    # Reset the sequence of the table if the id is an Integer
    #
    # @param id [Integer] the id to reset the sequence to
    # @return [Boolean] true if the sequence was reset, false otherwise
    def reset_sequence(id = last_id)
      unless column_type(:id) == :integer
        logger.info("Not resetting sequence id for #{table_name} as id is not an integer")
        return false
      end

      if id >= last_id && id.positive?
        ActiveRecord::Base.connection.execute("SELECT setval('#{sequence_name}', #{id}, true);").first
        logger.info("Reset sequence id for #{table_name} to #{id}")
        true
      else
        logger.info("Not resetting sequence id for #{table_name} as given id <= max existing id")
        false
      end
    end
  end
  # rubocop:enable Metrics/BlockLength
end
