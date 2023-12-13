class AddSampleSvgAnnotationFileToSamples < ActiveRecord::Migration[6.1]
  def change
    add_column :samples, :sample_svg_annotation_file, :string
  end
end
