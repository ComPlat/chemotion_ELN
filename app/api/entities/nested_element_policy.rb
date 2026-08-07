# frozen_string_literal: true

module Entities
  # Nested grape-entity representations inherit the parent options hash, including
  # +policy+. For research plans, screens, and wellplates this PR needs each nested
  # element to answer +can_update+/+can_copy+ from its own ElementPolicy rather than
  # the parent's. Other ApplicationEntity subclasses (e.g. SampleEntity nested under
  # Reaction/Wellplate) keep the pre-existing parent-policy inheritance.
  module NestedElementPolicy
    extend ActiveSupport::Concern

    private

    def element_policy
      policy = options[:policy]
      return policy unless policy.is_a?(ElementPolicy)
      return policy if policy.record == object

      ElementPolicy.new(policy.user, object)
    end
  end
end
