# frozen_string_literal: true

class LockTransferredCollections < ActiveRecord::Migration[6.1]
  # The "transferred" collection MoveToCollectionJob creates under a user's locked
  # "chemotion-repository.net" root is system-managed like the roots it sits beside, but it was
  # created unlocked. Every guard that should keep it in place keys off is_locked —
  # LockedCollectionGuard treats ancestry as immutable on a locked row, and
  # Usecases::Collections::UpdateTree only accepts unlocked ids in a tree payload — so an unlocked
  # "transferred" could be re-rooted by a collection-tree save and leave the repository subtree.
  #
  # The lock is written through SQL: LockedCollectionGuard rejects changes to is_locked on a locked
  # row, and this statement is what makes these rows locked.
  #
  # "transferred" is not a reserved label — a user can create their own collection with that name —
  # so the lock is keyed on the parent being a locked repository root, never on the label alone. That
  # narrows it but does not make it exact: a row a user placed directly under their repository root
  # and named "transferred" is indistinguishable from the job's, and locking it makes it permanently
  # un-renamable and un-deletable. Accepted here, unlike for the root-level case below, because no UI
  # path offers that parent (the repository root is a sidebar header, not a node in the collection
  # tree) and +Usecases::Collections::Create+ now refuses a locked parent outright, so the population
  # is bounded to rows created through the API before this change.
  # +is_locked IS NOT TRUE+ rather than += false+: the column is nullable with no NOT NULL
  # constraint, and a NULL there is as unlocked as a false.

  REPOSITORY_LABEL = 'chemotion-repository.net'
  TRANSFERRED_LABEL = 'transferred'

  def up
    report_root_level_candidates

    say_with_time 'locking "transferred" collections under a locked repository root' do
      execute(<<~SQL.squish)
        UPDATE collections c
        SET is_locked = true
        FROM collections repo
        WHERE c.label = '#{TRANSFERRED_LABEL}'
          AND c.is_locked IS NOT TRUE
          AND c.deleted_at IS NULL
          AND c.ancestry = '/' || repo.id || '/'
          AND repo.label = '#{REPOSITORY_LABEL}'
          AND repo.is_locked
          AND repo.deleted_at IS NULL;
      SQL
    end
  end

  private

  # Reported, never moved. A root-level collection labelled "transferred" is indistinguishable from
  # one a user created themselves — the label is not reserved — and re-parenting somebody's own
  # collection into the repository subtree and locking it there is worse than leaving an escaped one
  # where it is, especially as #down cannot tell the two apart either.
  def report_root_level_candidates
    escaped = select_values(<<~SQL.squish)
      SELECT c.id FROM collections c
      WHERE c.label = '#{TRANSFERRED_LABEL}'
        AND c.ancestry = '/'
        AND c.is_locked IS NOT TRUE
        AND c.deleted_at IS NULL
        AND EXISTS (
          SELECT 1 FROM collections repo
          WHERE repo.user_id = c.user_id
            AND repo.label = '#{REPOSITORY_LABEL}'
            AND repo.is_locked
            AND repo.deleted_at IS NULL
        )
    SQL
    escaped.each do |id|
      say "collection ##{id} is a root-level \"transferred\" collection: check by hand whether it " \
          'escaped the repository subtree and belongs back under it'
    end
  end

  def down
    # Raised rather than logged: a `down` that returns normally reports success and drops the
    # schema_migrations row while the data change stays applied.
    raise ActiveRecord::IrreversibleMigration,
          'LockTransferredCollections is not reversible (locked rows are indistinguishable).'
  end
end
