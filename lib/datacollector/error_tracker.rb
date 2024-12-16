# frozen_string_literal: true

module Datacollector
  # Cached Error class using File Active::Support::Cache::FileStore
  # Log if particular files/folder could not be processed to skip then in the next Run
  class ErrorTracker
    DATACOLLECTOR_ERROR_EXPIRATION = 1.week
    DATACOLLECTOR_ERROR_PATH = 'tmp/datacollector_error'

    def self.digest_from(arg, time)
      Digest::SHA256.hexdigest(arg.to_s + time.to_i.to_s)
    end

    def initialize(namespace = nil)
      @namespace = namespace.to_s
    end

    # The cache object
    #
    # @return [ActiveSupport::Cache::FileStore]
    def cache
      @cache ||= ActiveSupport::Cache::FileStore.new(
        DATACOLLECTOR_ERROR_PATH,
        expires_in: DATACOLLECTOR_ERROR_EXPIRATION,
        namespace: @namespace,
      )
    end

    # Find a record by error_code
    def digest_from(arg, time)
      self.class.digest_from(arg, time)
    end

    delegate :increment, :read, :write, :exist?, to: :cache

    def find(error_code)
      exist?(error_code) && increment(error_code)
    end

    def find_or_create(error_code)
      exist?(error_code) ? increment(error_code) : write(error_code, 0)
    end

    def find_by_path(path, mtime)
      error_code = digest_from(path, mtime)
      find(error_code)
    end

    def find_or_create_by_path(path, mtime)
      error_code = digest_from(path, mtime)
      find_or_create(error_code)
    end
  end
end
