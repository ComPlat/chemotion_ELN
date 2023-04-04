# frozen_string_literal: true

module Entities
  class LiteratureEntity < ApplicationEntity
    expose! :id
    expose! :title
    expose! :type
    expose! :url
    expose! :refs
    expose! :doi
    expose! :isbn

    expose_timestamps

    # see Literature.group_by_element
    expose :count, if: :with_element_count

    # see Literature.with_user_info
    with_options(if: :with_user_info) do
      expose! :literal_id
      expose! :litype
      expose! :user_id
      expose! :user_name
    end

    # see Literature.with_element_and_user_info
    with_options(if: :with_element_and_user_info) do
      expose! :element_id
      expose! :element_type
      expose! :external_label
      expose! :literal_id
      expose! :litype
      expose! :name
      expose! :short_label
      expose! :user_id
      expose! :user_name
      expose_timestamps(timestamp_fields: [:element_updated_at])
    end

    private

    def type
      'literature'
    end
  end
end
