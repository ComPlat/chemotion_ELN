# frozen_string_literal: true

# Create generic datasets revision migration
class GenericOptionsMigration < ActiveRecord::Migration
  # ElementKlass
  class ElementKlass < ActiveRecord::Base
    ElementKlass.reset_column_information
  end
  # SegmentKlass
  class SegmentKlass < ActiveRecord::Base
    SegmentKlass.reset_column_information
  end
  # DatasetKlass
  class DatasetKlass < ActiveRecord::Base
    DatasetKlass.reset_column_information
  end
  # ElementKlassesRevision
  class ElementKlassesRevision < ActiveRecord::Base
    ElementKlassesRevision.reset_column_information
  end
  # SegmentKlassesRevision
  class SegmentKlassesRevision < ActiveRecord::Base
    SegmentKlassesRevision.reset_column_information
  end
  # DatasetKlassesRevision
  class DatasetKlassesRevision < ActiveRecord::Base
    DatasetKlassesRevision.reset_column_information
  end
  # Element
  class Element < ActiveRecord::Base
    Element.reset_column_information
  end
  # Dataset
  class Segment < ActiveRecord::Base
    Segment.reset_column_information
  end
  # Dataset
  class Dataset < ActiveRecord::Base
    Dataset.reset_column_information
  end
  # ElementsRevision
  class ElementsRevision < ActiveRecord::Base
    ElementsRevision.reset_column_information
  end
  # SegmentsRevision
  class SegmentsRevision < ActiveRecord::Base
    SegmentsRevision.reset_column_information
  end
  # DatasetsRevision
  class DatasetsRevision < ActiveRecord::Base
    DatasetsRevision.reset_column_information
  end

  def change
    %w[ElementKlass SegmentKlass DatasetKlass].each do |klasses|
      klasses.constantize.find_each do |klass|
        pt = klass.properties_template
        select_options = pt['select_options']
        select_options&.map { |k, v| select_options[k] = { desc: k, options: v } }
        pt['select_options'] = select_options || {}
        pr = klass.properties_release
        select_options_r = pr['select_options']
        select_options_r&.map { |k, v| select_options_r[k] = { desc: k, options: v } }
        pr['select_options'] = select_options_r || {}
        klass.update_columns(properties_template: pt, properties_release: pr)
      end
    end

    %w[ElementKlassesRevision SegmentKlassesRevision DatasetKlassesRevision].each do |klasses|
      klasses.constantize.find_each do |klass|
        pr = klass.properties_release
        select_options = pr['select_options']
        select_options&.map { |k, v| select_options[k] = { desc: k, options: v } }
        pr['select_options'] = select_options || {}
        klass.update_columns(properties_release: pr)
      end
    end

    %w[Element Segment Dataset ElementsRevision SegmentsRevision DatasetsRevision].each do |klasses|
      klasses.constantize.find_each do |klass|
        pr = klass.properties
        select_options = pr['select_options']
        select_options&.map { |k, v| select_options[k] = { desc: k, options: v } }
        pr['select_options'] = select_options || {}
        klass.update_columns(properties: pr)
      end
    end
  end
end
