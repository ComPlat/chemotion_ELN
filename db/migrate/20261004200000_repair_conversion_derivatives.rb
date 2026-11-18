# frozen_string_literal: true

# Repairs the TIFF +conversion+ derivative entries an earlier LoadImage wrote without +storage+
# and +metadata+ (see RepairConversionDerivativesTask). Shrine cannot load such an entry, and the
# attachment entity now reads the attacher for every attachment, so an unrepaired entry would
# make the whole sample or reaction fail to load. Running it as a migration makes the repair part
# of every deploy instead of a manual step.
#
# Idempotent: it only selects entries without +storage+. Where the converted PNG is not
# reachable from the host running the migration, the entry is removed and the next preview
# converts the TIFF again.
class RepairConversionDerivatives < ActiveRecord::Migration[6.1]
  def up
    results = RepairConversionDerivativesTask.execute!(dry_run: false)
    say "repaired #{results.size} conversion derivative entr#{results.size == 1 ? 'y' : 'ies'}"
  end

  # Nothing to undo: the old entries could not be loaded anyway.
  def down; end
end
