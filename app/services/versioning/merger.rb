# frozen_string_literal: true

class Versioning::Merger
  include ActiveModel::Model

  # Changes saved without a uuid that are further apart than this belong to separate History entries.
  RUN_GAP = 1.minute

  attr_accessor :versions

  def self.call(**args)
    new(**args).call
  end

  def call
    # Latest first, by the full timestamp; ties keep their input order, so the result doesn't depend on an
    # unstable sort.
    sorted = versions.each_with_index.sort_by { |version, index| [-version[:time].to_r, index] }.map(&:first)
    grouped_versions = group_by_request(sorted)

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

  # One entry per request, across the element and its sub-records. Changes saved without a uuid (older history,
  # rake tasks, the console) are grouped into runs instead, so e.g. an element created together with its containers
  # stays one entry. A run ends at a request, at a gap of more than RUN_GAP, or when a record would appear in it
  # twice, so an entry never holds two changes of the same record.
  def group_by_request(sorted_versions)
    run = 0
    previous = nil
    records = Set.new
    sorted_versions.group_by do |version|
      unless version[:uuid]
        record = version.values_at(:klass_name, :db_id)
        if starts_new_run?(previous, version, records.include?(record))
          run += 1
          records.clear
        end
        records << record
      end
      previous = version
      version[:uuid] || [:without_request, run]
    end
  end

  def starts_new_run?(previous, version, record_already_in_run)
    previous.nil? || previous[:uuid].present? || record_already_in_run || previous[:time] - version[:time] > RUN_GAP
  end
end
