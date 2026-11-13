# frozen_string_literal: true

Logidze.ignore_log_data_by_default = true

module Logidze
  module Meta
    def with_responsible!(responsible_id)
      return if responsible_id.nil?

      meta = { Logidze::History::Version::META_RESPONSIBLE => responsible_id, 'uuid' => SecureRandom.uuid }
      PermanentMetaWithTransaction.wrap_with(meta, &proc {})
    end

    def clear_responsible!
      PermanentMetaWithTransaction.wrap_with({}, &proc {})
    end

    # Starts a version uuid without a responsible user, for work outside a request (e.g. a background job), so the
    # History tab groups the versions it saves into one entry.
    def with_uuid!
      PermanentMetaWithTransaction.wrap_with({ 'uuid' => SecureRandom.uuid }, &proc {})
    end

    # Whether the current connection already has a version uuid set, e.g. by the request a job runs inline in.
    def uuid_set?
      meta = ActiveRecord::Base.connection.select_value("SELECT current_setting('logidze.meta', true)")
      meta.present? && JSON.parse(meta).key?('uuid')
    rescue JSON::ParserError
      false
    end

    class PermanentMetaWithTransaction < MetaWithoutTransaction
      private

      def pg_clear_meta_param; end
    end
  end
end
