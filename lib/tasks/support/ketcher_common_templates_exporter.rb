# frozen_string_literal: true

require 'json'
require 'logger'

class KetcherCommonTemplatesExporter
  TABLE_NAME = 'ketcherails_common_templates'
  TEMPLATES_DIR = Rails.root.join('uploads/common_templates')
  PUBLIC_DIR = Rails.public_path.join('json')
  # Templates specific to the instance
  TEMPLATES_INSTANCE = TEMPLATES_DIR.join('instance.json')
  # Default templates - git tracked - to be used if the database table is not available or empty
  TEMPLATES_DEFAULT = PUBLIC_DIR.join('ketcher_common_templates_default.json')
  # The template files in the public directory,
  #  public/json/ketcher_common_templates.json
  TEMPLATES_PUBLIC = PUBLIC_DIR.join('ketcher_common_templates')

  LOGFILE = 'log/ketcher_common_templates.log'

  def self.export(logfile: LOGFILE, logger: nil)
    new(logfile: logfile, logger: logger).export
  end

  def initialize(logfile:, logger: nil)
    @logger = logger || Logger.new(logfile)
  end

  def export
    if table_exists?(TABLE_NAME)
      ketcherails_common_template_class = Class.new(ApplicationRecord) { self.table_name = TABLE_NAME }
      templates = ketcherails_common_template_class.all.as_json
      source = 'database'
    elsif File.exist?(TEMPLATES_DEFAULT)
      templates = File.empty?(TEMPLATES_DEFAULT) ? [] : JSON.parse(File.read(TEMPLATES_DEFAULT))
      source = 'file'
    else
      @logger.warn "Fallback file not found: #{TEMPLATES_DEFAULT}"
      templates = []
    end

    FileUtils.mkdir_p(TEMPLATES_DIR)
    File.write(TEMPLATES_INSTANCE, JSON.pretty_generate(templates))

    @logger.info "#{templates.length} Common Templates exported from #{source || 'fallback'} to #{TEMPLATES_INSTANCE}"
  end
end

def table_exists?(table_name)
  ActiveRecord::Base.connection.data_source_exists?(table_name)
rescue StandardError
  false
end
