class CreateTriggerSetSegmentKlassesIdentifier < ActiveRecord::Migration[5.2]
  def change
    create_trigger :set_segment_klasses_identifier, on: :segment_klasses
  end
end
