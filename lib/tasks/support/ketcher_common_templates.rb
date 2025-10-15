# frozen_string_literal: true

require 'json'
require 'logger'

class CommonTemplateExporter
  TABLE_NAME = 'ketcherails_common_templates'
  MODEL_CLASS = 'KetcherailsCommonTemplate'.constantize
  OUTPUT_DIR = 'public/common_templates'
  OUTPUT_FILE = File.join('uploads/common_templates', 'user.json')
  DEFAULT_TEMPLATES_PATH = File.join('uploads/common_templates', 'default.json')
  LOGFILE = 'log/ketcher_common_templates.log'

  def self.export(logfile: LOGFILE, logger: nil)
    new(logfile: logfile, logger: logger).export
  end

  def initialize(logfile:, logger: nil)
    @logger = logger || Logger.new(logfile)
  end

  def export
    if table_exists?(TABLE_NAME) && MODEL_CLASS.exists?
      templates = MODEL_CLASS.all.as_json
      source = 'database'
    elsif File.exist?(DEFAULT_TEMPLATES_PATH)
      templates = File.empty?(DEFAULT_TEMPLATES_PATH) ? [] : JSON.parse(File.read(DEFAULT_TEMPLATES_PATH))
      source = 'file'
    else
      @logger.warn "Fallback file not found: #{DEFAULT_TEMPLATES_PATH}"
      templates = []
    end

    FileUtils.mkdir_p(File.dirname(OUTPUT_FILE))
    File.write(OUTPUT_FILE, JSON.pretty_generate(templates))
    @logger.info "#{templates.length} Common Templates exported from #{source || 'fallback'} to #{OUTPUT_FILE}"
  end
end

def table_exists?(table_name)
  ActiveRecord::Base.connection.data_source_exists?(table_name)
rescue StandardError
  false
end
