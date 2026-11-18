# frozen_string_literal: true

# Devices are soft-deleted (paranoia), but name_abbreviation and email kept
# their values, so the unique indexes and the uniqueness validations still
# blocked reuse of a deleted device's abbreviation/email.
# Release both fields for already-deleted devices, matching what
# Device#delete_data now does on destroy.
class ReleaseUniqueFieldsOnDeletedDevices < ActiveRecord::Migration[6.1]
  def up
    execute <<~SQL.squish
      UPDATE devices
      SET email = NULL, name_abbreviation = NULL
      WHERE deleted_at IS NOT NULL
        AND (email IS NOT NULL OR name_abbreviation IS NOT NULL)
    SQL
  end

  def down
    # Irreversible: the original email/name_abbreviation values are overwritten with
    # NULL and cannot be reconstructed, so fail fast rather than silently rolling back nothing.
    raise ActiveRecord::IrreversibleMigration
  end
end
