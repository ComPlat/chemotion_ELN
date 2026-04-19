# frozen_string_literal: true

# Backfills the inbox transfer flags introduced in commit 3c5609301 (PR #2837)
# for every existing profile:
#   * inbox_auto   => false  (automatic transfer disabled by default)
#   * inbox_manual => true   (manual transfer enabled by default)
#
# Uses jsonb_set in raw SQL so we touch rows in a single statement and avoid
# instantiating the Profile model, which runs validations and callbacks that
# are irrelevant to a data backfill.
class SetDefaultInboxTransferFlagsInProfiles < ActiveRecord::Migration[6.1]
  def up
    execute(<<~SQL.squish)
      UPDATE profiles
      SET data = jsonb_set(
        jsonb_set(
          COALESCE(data, '{}'::jsonb),
          '{inbox_auto}',
          'false'::jsonb,
          true
        ),
        '{inbox_manual}',
        'true'::jsonb,
        true
      )
      WHERE NOT (data ? 'inbox_auto')
         OR NOT (data ? 'inbox_manual')
    SQL
  end

  def down
    execute(<<~SQL.squish)
      UPDATE profiles
      SET data = data - 'inbox_auto' - 'inbox_manual'
    SQL
  end
end
