# frozen_string_literal: true

class Versioning::Merger
  include ActiveModel::Model

  attr_accessor :versions

  def self.call(**args)
    new(**args).call
  end

  def call
    # sort versions with the latest changes in the first place
    versions.sort_by! { |version| -version[:time].to_i }

    grouped_versions = group_by_request(versions)

    merged_versions = []
    grouped_versions.each_with_index do |(_, v), index|
      changes = v.map do |v|
        {
          db_id: v[:db_id],
          klass_name: v[:klass_name],
          name: v[:name],
          fields: v[:changes],
        }
      end

      merged_versions << {
        id: grouped_versions.length - index,
        time: v.dig(0, :time),
        user: v.dig(0, :user),
        changes: changes,
      }
    end
    merged_versions
  end

  private

  # One entry per request, across the element and its sub-records. Changes saved outside a request (background
  # jobs, rake tasks) have no uuid; consecutive ones form one entry, so e.g. an element created by a job together
  # with its containers stays one entry, while a request in between keeps the entries apart and in time order.
  def group_by_request(sorted_versions)
    run = 0
    previous_uuid = :none
    sorted_versions.group_by do |version|
      uuid = version[:uuid]
      run += 1 if uuid.nil? && !previous_uuid.nil?
      previous_uuid = uuid
      uuid || [:without_request, run]
    end
  end
end
