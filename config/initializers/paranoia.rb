# frozen_string_literal: true

# paranoia 3.x's collection-dependent really_destroy! uses `find_each`, forcing ORDER BY id,
# which breaks associations with a custom SELECT+ORDER BY (Labimotion's :segments DISTINCT ON →
# "SELECT DISTINCT ON expressions must match initial ORDER BY"). No paranoia version supports
# both Rails 7.1 and `.each`, so patch it back — body verbatim from 3.1.0 bar the collection
# loop; re-check on paranoia upgrades.
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
              # .each (paranoia 2.6), not .find_each: keeps the association's order (DISTINCT ON).
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
