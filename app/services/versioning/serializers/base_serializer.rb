# frozen_string_literal: true

class Versioning::Serializers::BaseSerializer
  include ActiveModel::Model

  attr_accessor :record, :name

  def call
    Rails.cache.fetch("versions/#{record.cache_key}", version: record.cache_version) do
      result = [] # result data
      base = {} # track current version data

      return [] unless log_data

      log_data.versions.group_by { |version| version.data.dig('m', 'uuid') }.each do |uuid, versions|
        user_id = versions.first.data.dig('m', '_r')
        time = versions.first.data['ts'] / 1000

        changes = versions.each_with_object({}) do |version, hash|
          hash.merge!(version.changes)
        end

        changes_comparison_hash = {} # hash for changes comparison

        revertible = changes.none? { |key, _v| key == 'created_at' }
        changes.each do |key, value|
          next if value == base[key] # ignore if value is same as in last version
          next if blank?(base[key]) && blank?(value) # ignore if value is empty

          fields = field_definitions[key]
          next if fields.nil?

          fields = [fields] unless fields.is_a?(Array)
          fields.each do |field|
            formatter = field[:formatter] || default_formatter
            revertible_value_formatter = field[:revertible_value_formatter] || formatter
            old_value = formatter.call(key, base[key])
            new_value = formatter.call(key, value)
            current_value = formatter.call(key, record.read_attribute_before_type_cast(key))
            revertible_value = revertible_value_formatter.call(key, base[key])

            next if old_value == new_value # ignore if value is same as in last version
            next if old_value.blank? && new_value.blank? # ignore if value is empty or nil

            changes_comparison_hash[field[:name] || key] = {
              label: field[:label],
              old_value: old_value,
              new_value: new_value,
              current_value: current_value,
              kind: field[:kind] || :string,
              revert: (revertible && field[:revert]) || [],
              revertible_value: revertible_value,
            }
          end
        end
        base.merge!(changes) # merge changes with last version data for next iteration
        next if changes_comparison_hash.empty?

        result << {
          db_id: record.id,
          klass_name: klass_name, # record class (sampe, reaction, ...)
          name: name, # record name (uses as default the name attribute but in case the model doesn't have a name field or you want to change it)
          time: Time.zone.at(time), # timestamp of the change
          user: version_user_names_lookup[user_id], # user
          uuid: uuid, # request group
          changes: changes_comparison_hash, # changes hash
        }
      end

      result
    end
  end

  private

  def klass_name
    record.class.to_s
  end

  def blank?(value)
    value.blank? || value.in?(['(,)', '{}', []])
  end

  def version_user_names_lookup
    @version_user_names_lookup ||= begin
      ids = Set.new

      record.log_data.versions.each do |v|
        ids << v.data.dig('m', '_r')
        ids << v.changes['created_by'] if v.changes.key?('created_by')
        ids << v.changes['created_for'] if v.changes.key?('created_for')
      end

      User.with_deleted.where(id: ids).to_h { |u| [u.id, u.name] }
    end
  end

  delegate :log_data, to: :record

  def default_formatter
    ->(key, value) { record.instance_variable_get(:@attributes)[key].type.deserialize(value) }
  end

  def user_formatter
    ->(_key, value) { version_user_names_lookup[value] }
  end

  def jsonb_formatter(*attributes)
    ->(key, value) { default_formatter.call(key, value)&.dig(*attributes) }
  end

  def non_formatter
    ->(_key, value) { value }
  end

  def fix_malformed_value_formatter
    ->(key, value) { (value || '').start_with?('{') ? YAML.safe_load(value) : default_formatter.call(key, value) }
  end

  def svg_path_formatter(entity)
    lambda do |key, value|
      result = default_formatter.call(key, value)
      return result if result.blank?

      "/images/#{entity}/#{result}"
    end
  end
end
