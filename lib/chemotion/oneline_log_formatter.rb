# frozen_string_literal: true

module Chemotion
  # Namespaced under Chemotion so the file path (lib/chemotion/…) matches the
  # constant under the Zeitwerk lib root. DEV_RAILS_UPGRADE_7-0.md §0a.
  class OnelineLogFormatter < Logger::Formatter
    def call(severity, time, programName, message)
      "#{time}, [#{severity}]: #{message} #{programName}".gsub("\n", ' | ') << "\n"
    end
  end
end
