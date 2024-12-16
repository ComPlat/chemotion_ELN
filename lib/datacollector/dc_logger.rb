# frozen_string_literal: true

module Datacollector
  # Class to log messages to log/datacollector.log
  class DCLogger
    def initialize(context = 'Datacollector')
      @log = Logger.new(Rails.root.join('log/datacollector.log').to_s)
      @context = context
      @format = lambda do |subcontext, msg = nil|
        "#{@context} - #{subcontext} >> #{msg}\n".encode('UTF-8', invalid: :replace, undef: :replace, replace: '?')
      end
    end

    def info(subcontext, message = nil)
      @log.info(@format.call(subcontext, message))
    end

    def error(subcontext, message = nil)
      @log.error(@format.call(subcontext, message))
    end
  end
end
