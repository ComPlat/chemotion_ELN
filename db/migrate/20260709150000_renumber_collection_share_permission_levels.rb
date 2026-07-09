# frozen_string_literal: true

# Renumbers collection_shares.permission_level from the legacy ladder onto the redesigned one.
#
#   legacy                              new
#   0 read                              0 read_elements
#   1 write                             1 edit_elements
#   2 share (propagate elements only)   2 add_elements
#   3 delete                            3 remove_elements
#   4 import                            4 manage_shares
#   5 pass ownership (frontend value)   5 pass_ownership
#   6 pass ownership (backend value)
#
# The redesign swaps the relative order of "share" and "add", so no mapping is capability-preserving.
# The one below never grants a *more destructive* capability than the row already held:
#
#   0 -> 0  identity
#   1 -> 1  identity
#   2 -> 1  legacy "share" only propagated elements; it could neither add to nor unlink from the
#           collection. Propagation is now bundled into rung 2 (add_elements), so granting new 2
#           would hand these shares an add-right they never had. Drop to edit instead.
#   3 -> 3  legacy "delete" could unlink; it gains add_elements, which is strictly less destructive
#           than the unlink it already held.
#   4 -> 3  legacy "import" could add *and* unlink -> exactly new rung 3.
#   5 -> 5  identity
#   6 -> 5  the post-#2783 backend value for pass_ownership; the gap at 5 is now closed.
#
# Separately, everyone who held legacy 3 or 4 loses the ability to destroy element records:
# destruction became owner-only (ElementPolicy#destroy?). Unlinking from the collection is unaffected.
#
# The map is idempotent: it only ever produces {0, 1, 3, 5}, each of which is its own fixed point.
# (New rungs 2 and 4 are simply unused by migrated data until someone grants them explicitly.)
class RenumberCollectionSharePermissionLevels < ActiveRecord::Migration[6.1]
  UP_MAP = { 0 => 0, 1 => 1, 2 => 1, 3 => 3, 4 => 3, 5 => 5, 6 => 5 }.freeze

  # Best-effort inverse. Lossy: the up-map collapses 2->1, 4->3 and 6->5, so those origins are gone.
  # New rung 2 (add_elements) maps back to legacy 4 (import) and new rung 4 (manage_shares) has no
  # legacy equivalent, so it also lands on legacy 4 — the highest legacy non-ownership rung.
  DOWN_MAP = { 0 => 0, 1 => 1, 2 => 4, 3 => 3, 4 => 4, 5 => 6 }.freeze

  def up
    apply_map(UP_MAP)
    say "renumbered #{report_counts} (legacy -> redesigned ladder)"
    say 'shares at legacy 3/4 keep unlink rights but lose element destruction (now owner-only)'
  end

  def down
    apply_map(DOWN_MAP)
    say "reverted #{report_counts} (redesigned -> legacy ladder; lossy, see migration comment)"
  end

  private

  # Rewrites every row in one statement so no value is remapped twice.
  def apply_map(map)
    cases = map.map { |from, to| "WHEN #{from.to_i} THEN #{to.to_i}" }.join(' ')
    execute(<<~SQL.squish)
      UPDATE collection_shares
      SET permission_level = CASE permission_level #{cases} ELSE permission_level END
    SQL
  end

  def report_counts
    rows = select_all(
      'SELECT permission_level, COUNT(*) AS count FROM collection_shares GROUP BY permission_level ORDER BY 1',
    )
    return 'no collection_shares' if rows.count.zero?

    rows.map { |row| "#{row['count']}x level #{row['permission_level']}" }.join(', ')
  end
end
