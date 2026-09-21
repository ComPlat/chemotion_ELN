# frozen_string_literal: true

# grape-entity's OutputBuilder (a SimpleDelegator serializable_hash returns for nested
# exposures) fakes Hash-ness by exact class only, so it fails is_a?(DeepMergeable) — which
# Rails 7.1's deep_merge checks, silently replacing the builder instead of merging into it.
# Delegate kind_of? to the wrapped object.
require 'grape_entity'

Grape::Entity::Exposure::NestingExposure::OutputBuilder.class_eval do
  def kind_of?(klass)
    __getobj__.is_a?(klass) || super
  end
  alias_method :is_a?, :kind_of?
end
