# frozen_string_literal: true

# Use case for reconciling a sample's persisted components with a client payload.
# Normalizes the payload once, then deletes rows the payload no longer references
# and creates/updates the rest. This is the single entry point shared by the
# standalone component API and the reaction material-update flow so the
# delete-before-create ordering lives in exactly one place.
module Usecases
  module Components
    class Reconcile
      def initialize(sample, components)
        @sample = sample
        @components = Create.normalize(components)
      end

      def execute!
        # Delete first so the keep-list only needs to consider rows that already
        # exist in the DB (identified by their integer ids). Newly added
        # components (string ids like 'new_1') are inserted by Create afterwards
        # and are therefore unaffected by the deletion step.
        DeleteRemovedComponents.new(@sample.id, @components).execute!
        Create.new(@sample, @components).execute!
      end
    end
  end
end
