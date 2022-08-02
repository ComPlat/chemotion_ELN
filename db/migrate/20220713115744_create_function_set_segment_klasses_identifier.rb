class CreateFunctionSetSegmentKlassesIdentifier < ActiveRecord::Migration[5.2]
  def change
    create_function :set_segment_klasses_identifier
  end
end
