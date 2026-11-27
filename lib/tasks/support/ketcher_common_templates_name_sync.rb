# frozen_string_literal: true

require 'json'
require 'digest'
require 'fileutils'
require 'logger'

# Brings the template names (and search aliases kept in `notes`) of an instance's
# uploads/common_templates/instance.json in line with the git-tracked default file.
#
# Templates are matched by category + structure (molfile without its 3 header lines, which carry
# program/timestamp stamps that differ between exports), never by name, so renames are safe and
# templates an instance added itself are left untouched. Idempotent: the file is only written when
# something changed.
class KetcherCommonTemplatesNameSync
  TEMPLATES_DIR = Rails.root.join('uploads/common_templates')
  TEMPLATES_INSTANCE = TEMPLATES_DIR.join('instance.json')
  TEMPLATES_DEFAULT = Rails.public_path.join('json/ketcher_common_templates_default.json')

  # Notes values that may be replaced by the aliases from the default file.
  REPLACEABLE_NOTES = [nil, '', 'test note'].freeze

  # Known duplicates dropped from the default list: [category, structure key, icon_path or :any].
  # The category-15 pair has identical structures; only the copy without an icon is removed.
  REMOVED_DUPLICATES = [
    [2, 'ce2e590902c00521', :any],
    [15, '418b6d3223b7609c', nil],
  ].freeze

  # Templates added to the default list that older instances do not have yet.
  ADDED_TEMPLATES = [
    [19, '0b305e7fddfbf42e'],
  ].freeze

  Result = Struct.new(:templates, :renamed, :removed, :added, :unmatched, keyword_init: true) do
    def changed?
      (renamed + removed + added).positive?
    end
  end

  def self.structure_key(molfile)
    lines = molfile.to_s.gsub("\r\n", "\n").split("\n", -1).drop(3).map(&:rstrip)
    lines.pop while lines.last == ''
    Digest::SHA256.hexdigest(lines.join("\n"))[0, 16]
  end

  # True when the file exists and holds a JSON array (i.e. can be served to the templates panel).
  def self.valid_template_file?(path)
    File.exist?(path) && JSON.parse(File.read(path)).is_a?(Array)
  rescue JSON::ParserError, SystemCallError
    false
  end

  def self.call(instance_path: TEMPLATES_INSTANCE, default_path: TEMPLATES_DEFAULT, logger: Rails.logger)
    new(instance_path: instance_path, default_path: default_path, logger: logger).call
  end

  def initialize(instance_path:, default_path:, logger:)
    @instance_path = instance_path
    @default_path = default_path
    @logger = logger || Logger.new($stdout)
  end

  # Returns the Result, or nil when there is nothing to sync.
  def call
    return log_skip("#{@instance_path} not found") unless File.exist?(@instance_path)

    result = sync(read_json(@instance_path), read_json(@default_path))
    write(result.templates) if result.changed?
    log_result(result)
    result
  end

  # Pure transformation, exposed for specs.
  def sync(instance_templates, default_templates)
    defaults = default_templates.index_by { |t| key_for(t) }
    counts = { renamed: 0, removed: 0, added: 0 }
    unmatched = []

    templates = remove_duplicates(instance_templates, counts).map do |template|
      default = defaults[key_for(template)]
      if default
        apply_default(template, default, counts)
      else
        unmatched << template['name']
        template
      end
    end
    templates += missing_additions(templates, defaults, counts)

    Result.new(templates: templates, unmatched: unmatched, **counts)
  end

  private

  def key_for(template)
    [template['template_category_id'], self.class.structure_key(template['molfile'])]
  end

  def remove_duplicates(templates, counts)
    keys = templates.map { |t| key_for(t) }
    templates.each_with_index.reject do |template, index|
      duplicate = known_duplicate?(template, keys[index], keys.count(keys[index]))
      counts[:removed] += 1 if duplicate
      duplicate
    end.map(&:first)
  end

  # An icon-specific entry is only a duplicate while its twin (same structure) is still present.
  def known_duplicate?(template, key, same_structure_count)
    REMOVED_DUPLICATES.any? do |category, structure, icon|
      next false unless key == [category, structure]

      icon == :any || (template['icon_path'] == icon && same_structure_count > 1)
    end
  end

  def apply_default(template, default, counts)
    updated = template.merge('name' => default['name'])
    # Blank/placeholder notes follow the default (aliases, or cleared); real admin notes are kept.
    new_notes = default['notes'].presence
    if REPLACEABLE_NOTES.include?(template['notes']) && template['notes'].presence != new_notes
      updated['notes'] = new_notes
    end
    counts[:renamed] += 1 if updated != template
    updated
  end

  def missing_additions(templates, defaults, counts)
    present = templates.to_set { |t| key_for(t) }
    ADDED_TEMPLATES.filter_map do |key|
      next if present.include?(key) || !defaults.key?(key)

      counts[:added] += 1
      defaults[key]
    end
  end

  def read_json(path)
    data = JSON.parse(File.read(path))
    raise ArgumentError, "#{path} does not contain a JSON array" unless data.is_a?(Array)

    data
  end

  # Back up the previous file, then write via a temp file so a crash never leaves a half-written file.
  def write(templates)
    FileUtils.cp(@instance_path, "#{@instance_path}.bak")
    tmp = "#{@instance_path}.tmp"
    File.write(tmp, "#{JSON.pretty_generate(templates)}\n")
    File.rename(tmp, @instance_path)
  end

  def log_result(result)
    summary = "Ketcher common templates synced: #{result.renamed} updated, " \
              "#{result.removed} duplicates removed, #{result.added} added"
    summary += ' (no changes)' unless result.changed?
    @logger.info(summary)
    return if result.unmatched.empty?

    @logger.info("Ketcher common templates kept unchanged (not in default list): #{result.unmatched.join(', ')}")
  end

  def log_skip(reason)
    @logger.info("Ketcher common templates sync skipped: #{reason}")
    nil
  end
end
