# frozen_string_literal: true

module Entities
  class LiteratureEntity < ApplicationEntity
    expose(
      :id,
      :title,
      :type,
      :url,
    )
    expose_timestamps

    # see Literature.group_by_element
    expose :count, if: ->(instance, options) { options[:with_element_count] }

    # see Literature.add_user_info
    expose(
      :literal_id,
      :user_id,
      :litype,
      :user_name,
      if: ->(instance, options) { options[:with_user_info] }
    )
    expose(
      :literal_id,
      :element_type,
      :element_id,
      :litype,
      :user_id,
      :user_name,
      :short_label,
      :name,
      :external_label,
      if: ->(instance_options) { options[:with_element_and_user_info] }
    )
    expose_timestamps(
      timestamp_fields: [:element_updated_at],
      if: ->(instance, options) { options[:with_element_and_user_info] }
      )
    
    def type
      'literature'
    end
  end
end
