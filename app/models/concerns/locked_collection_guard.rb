# frozen_string_literal: true

# Protects system-locked collections (the per-user "All", "chemotion-repository.net" and
# "transferred" roots) from user-facing mutation. Once +is_locked+ is set, no user-facing path may
# rename the collection, move it in the tree, or clear the locked flag, and it cannot be deleted.
# System paths that legitimately create or restore such a collection use +create+ /
# +update_column(s)+, which do not run these guards.
module LockedCollectionGuard
  extend ActiveSupport::Concern

  # Attributes that are fixed for the lifetime of a locked collection.
  LOCKED_IMMUTABLE_ATTRIBUTES = %w[label position ancestry is_locked].freeze

  included do
    before_destroy :prevent_destroying_locked_collection, prepend: true
    validate :prevent_modifying_locked_collection, on: :update
  end

  private

  # Aborts +destroy+ (and soft-delete) of a locked collection. The only path that reaches this is
  # the user-facing +DELETE /collections/:id+ endpoint — no system path destroys a locked collection
  # (a +User+'s collections are not +dependent: :destroy+).
  def prevent_destroying_locked_collection
    return unless is_locked?

    errors.add(:base, 'A locked collection cannot be deleted')
    throw(:abort)
  end

  # Rejects an update that would rename, reposition, or unlock a locked collection. Keyed off the
  # persisted +is_locked+ value so that clearing the flag is itself blocked. +tabs_segment+ (UI view
  # state) is intentionally not protected and stays editable on the locked "All" collection.
  def prevent_modifying_locked_collection
    return unless is_locked_in_database

    (changed & LOCKED_IMMUTABLE_ATTRIBUTES).each do |attribute|
      errors.add(attribute, 'cannot be changed on a locked collection')
    end
  end
end
