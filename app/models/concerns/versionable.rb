# frozen_string_literal: true

# Versionable module
module Versionable
  extend ActiveSupport::Concern

  BLACKLISTED_ATTRIBUTES = %w[
    id
    created_at
    updated_at
    parent_id
    parent_type
    container_type
    attachable_id
    attachable_type
    sample_id
    reaction_id
    molecule_id
    molecule_name_id
    type
  ].freeze

  included do
    has_logidze
  end

  def versions_hash(record_name = name)
    return [] if log_data.nil?

    result = [] # result data
    base = {} # track current version data
    log_data.versions.each do |version|
      changes = version.changes # get changes for current version
      changes_comparison_hash = {} # hash for changes comparison
      changes.each do |key, value|
        next if key.in?(BLACKLISTED_ATTRIBUTES) # ignore uneeded keys
        next if value == base[key] # ignore if value is same as in last version
        next if base[key].blank? && value.blank? # ignore if value is empty or nil

        # parse value if needed
        old_value = version_value(key, base[key])
        new_value = version_value(key, value)

        if (old_value.is_a?(Hash) || new_value.is_a?(Hash)) && key != 'temperature'
          # fix nil cases
          old_value ||= {}
          new_value ||= {}
          base = old_value.merge(new_value) # hash with contains all keys
          label = version_label(key, base) # labels for hash
          kind = version_kind(key, base) # kinds of hash (numrange, date, string)

          base.each_key do |key|
            next if old_value[key] == new_value[key] # ignore if value is same as in last version
            next if old_value[key].blank? && new_value[key].blank? # ignore if value is empty or nil

            changes_comparison_hash[key] = {
              o: old_value[key],
              n: new_value[key],
              l: label[key],
              k: kind[key]
            }
          end
        else
          changes_comparison_hash[key] = {
            o: old_value,
            n: new_value,
            l: version_label(key), # label for attribute,
            k: version_kind(key) # kind of attribute (numrange, date, string)
          }
        end
      end
      base.merge!(changes) # merge changes with last version data for next iteration
      next if changes_comparison_hash.empty?

      result << {
        'k' => version_entity, # record kind (sampe, reaction, ...)
        'n' => record_name, # record name (uses as default the name attribute but in case the model doesn't have a name field or you want to change it)
        't' => Time.at(version.data['ts'] / 1000), # timestamp of the change
        'u' => version_user_names_lookup[version.data.dig('m', '_r')], # user
        'c' => changes_comparison_hash # changes hash
      }
    end

    result
  end

  private

  def version_user_names_lookup
    @version_user_names_lookup ||= begin
      ids = {}

      log_data.versions.each do |v|
        ids[v.data.dig('m', '_r')] ||= 1
        ids[v.changes['created_by']] ||= 1 if v.changes.key?('created_by')
        ids[v.changes['created_for']] ||= 1 if v.changes.key?('created_for')
      end

      User.with_deleted.where(id: ids.keys).map { |u| [u.id, u.name] }.to_h
    end
  end

  def version_value(attribute, value)
    return if value.nil?

    if self.class.name == 'Reaction' && attribute.in?(%w[description observation])
      YAML.load(value).to_json
    elsif attribute.in?(%w[created_by created_for])
      version_user_names_lookup[value]
    elsif self.class.name == 'Attachment' && attribute == 'aasm_state'
      value.humanize
    elsif self.class.name == 'ElementalComposition' && attribute == 'composition_type'
      ElementalComposition::TYPES[value.to_sym]
    elsif self.class.name == 'Sample' && attribute.in?(%w[boiling_point melting_point])
      value
    else
      @attributes[attribute].type.deserialize(value)
    end
  end

  def version_label(attribute, value_hash = {})
    case attribute
    when 'timestamp_start'
      'Start'
    when 'timestamp_stop'
      'Stop'
    when 'observation'
      'Additional information for publication and purification details'
    when 'temperature'
      'Temperature'
    when 'solvent'
      'Solvent'
    else
      if self.class.columns_hash[attribute].type.in?(%i[hstore jsonb])
        label_hash = {}

        value_hash.each_key do |key|
          value = if self.class.name == 'Container' && key == 'report'
                    'Add to Report'
                  elsif self.class.name == 'Sample' && attribute == 'stereo'
                    "#{attribute} #{key}".humanize
                  else
                    key.underscore.humanize
                  end

          label_hash.merge!(key => value)
        end

        label_hash
      else
        attribute.underscore.humanize
      end
    end
  end

  def version_kind(attribute, value_hash = {})
    if value_hash.present?
      kind_hash = {}

      value_hash.each_key do |key|
        value = if self.class.name == 'Container' && key == 'content' || self.class.name == 'Reaction' && key == 'ops'
                  :quill
                elsif self.class.name == 'Container' && key == 'kind'
                  :treeselect
                elsif self.class.name == 'Sample' && key == 'sample_svg_file'
                  :svg
                else
                  :string
                end

        kind_hash.merge!(key => value)
      end

      kind_hash
    elsif self.class.name == 'Reaction' && attribute.in?(%w[description observation])
      :quill
    elsif self.class.name == 'Reaction' && attribute == 'rxno'
      :treeselect
    else
      case attribute
      when 'created_at', 'updated_at', 'deleted_at'
        :date
      when 'melting_point', 'boiling_point'
        :numrange
      when 'solvent'
        :solvent
      when 'sample_svg_file'
        :svg
      when 'temperature'
        :temperature
      else
        :string
      end
    end
  end

  def version_entity
    case self.class.name
    when 'ReactionsStartingMaterialSample'
      'Starting material'
    when 'ReactionsReactantSample'
      'Reactant'
    when 'ReactionsSolventSample'
      'Solvent'
    when 'ReactionsPurificationSolventSample'
      'Purification solvent'
    when 'ReactionsProductSample'
      'Product'
    when 'Container'
      'Analysis'
    else
      self.class.name.underscore.humanize
    end
  end
end