# frozen_string_literal: true

# Make grape-entity's OutputBuilder delegate is_a?/kind_of? to the wrapped object.
#
# OutputBuilder is a SimpleDelegator that serializable_hash returns for nested
# exposures. Upstream (through grape-entity 1.1.0, the latest) fakes Hash-ness with
# `klass == output.class` (exact class only), so it answers is_a?(Hash) but NOT
# is_a?(Enumerable / Comparable / ActiveSupport::DeepMergeable) — even though the
# wrapped Hash is all of those.
#
# Rails <= 7.0 guarded deep-merge recursion with is_a?(Hash) (satisfied), but
# Rails 7.1 checks is_a?(DeepMergeable) instead — which the exact-class fake fails,
# so deep_merge silently REPLACED an OutputBuilder instead of merging into it.
# Delegating kind_of? to __getobj__ reports every ancestor of the underlying
# Hash/Array, restoring deep-merge (and correct type checks) everywhere. The
# Hash/Array distinction is preserved (output.class stays Hash or Array).
# No released grape-entity fixes this. See DEV_RAILS_UPGRADE_7-1.md (Incident A-5).
require 'grape_entity'

Grape::Entity::Exposure::NestingExposure::OutputBuilder.class_eval do
  def kind_of?(klass)
    __getobj__.is_a?(klass) || super
  end
  alias_method :is_a?, :kind_of?
end
