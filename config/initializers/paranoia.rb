# frozen_string_literal: true

# Revert paranoia 3.x's collection-dependent really_destroy! from `.find_each`
# back to 2.6's `.each`.
#
# paranoia 3.x loads collection dependents with `find_each`, which forces batch
# ordering by primary key (ORDER BY id). That overrides an association's own order
# and breaks any association combining a custom SELECT with a matching ORDER BY —
# notably Labimotion's :segments (`select('DISTINCT ON (element_type,
# segment_klass_id) *').order(element_type, segment_klass_id, id)`): the DISTINCT ON
# prefix no longer matches the forced `ORDER BY id`, so Postgres raises
# "SELECT DISTINCT ON expressions must match initial ORDER BY expressions"
# (e.g. ReallyDestroyTask really-destroying a sample/reaction that has segments).
#
# paranoia 2.6.0 used `.each` here (no reordering), which the app relied on. No
# paranoia version supports both Rails 7.1 and `.each`, so restore it via patch.
# Method body is verbatim from paranoia 3.1.0 with only the collection loop
# changed; re-check on paranoia upgrades. See DEV_RAILS_UPGRADE_7-1.md (Incident A-4).
require 'paranoia'

module Paranoia
  def really_destroy!(update_destroy_attributes: true)
    with_transaction_returning_status do
      run_callbacks(:real_destroy) do
        @_disable_counter_cache = paranoia_destroyed?
        dependent_reflections = self.class.reflections.select do |name, reflection|
          reflection.options[:dependent] == :destroy
        end
        if dependent_reflections.any?
          dependent_reflections.each do |name, reflection|
            association_data = send(name)
            # has_one association can return nil
            # .paranoid? will work for both instances and classes
            next unless association_data && association_data.paranoid?

            if reflection.collection?
              # .each (paranoia 2.6) instead of .find_each: preserves the
              # association's own order so DISTINCT ON associations don't break.
              next association_data.with_deleted.each do |record|
                record.really_destroy!(update_destroy_attributes: update_destroy_attributes)
              end
            end
            association_data.really_destroy!(update_destroy_attributes: update_destroy_attributes)
          end
        end
        update_columns(paranoia_destroy_attributes) if update_destroy_attributes
        destroy_without_paranoia
      end
    end
  end
end
