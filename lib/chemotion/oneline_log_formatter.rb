# frozen_string_literal: true

module Chemotion
  class OnelineLogFormatter < Logger::Formatter
    def call(severity, time, programName, message)
      "#{time}, [#{severity}]: #{message} #{programName}".gsub("\n", ' | ') << "\n"
    end
  end
end
