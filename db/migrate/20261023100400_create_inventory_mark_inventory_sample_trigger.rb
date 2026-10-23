# frozen_string_literal: true

class CreateInventoryMarkInventorySampleTrigger < ActiveRecord::Migration[6.1]
  def change
    create_function :inventory_mark_inventory_sample
    create_trigger :inventory_mark_inventory_sample_trg, on: :collections_samples
  end
end
