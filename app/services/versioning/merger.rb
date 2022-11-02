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

    grouped_versions = versions.group_by { |version| version[:uuid] }

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
end
