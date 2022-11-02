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

    class PermanentMetaWithTransaction < MetaWithoutTransaction
      private

      def pg_clear_meta_param; end
    end
  end
end
