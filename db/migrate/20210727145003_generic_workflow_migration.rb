# frozen_string_literal: true

# Create generic workflow migration
class GenericWorkflowMigration < ActiveRecord::Migration[6.1]
  def change
    add_column :elements, :properties_release, :jsonb, null: true unless column_exists? :elements, :properties_release
    add_column :segments, :properties_release, :jsonb, null: true unless column_exists? :segments, :properties_release
    add_column :datasets, :properties_release, :jsonb, null: true unless column_exists? :datasets, :properties_release
    add_column :elements_revisions, :properties_release, :jsonb, null: true unless column_exists? :elements_revisions, :properties_release
    add_column :segments_revisions, :properties_release, :jsonb, null: true unless column_exists? :segments_revisions, :properties_release
    add_column :datasets_revisions, :properties_release, :jsonb, null: true unless column_exists? :datasets_revisions, :properties_release

    %w[Labimotion::ElementKlass Labimotion::SegmentKlass Labimotion::ElementKlassesRevision Labimotion::SegmentKlassesRevision].each do |klasses|
      klasses.constantize.find_each do |klass|
        properties_release = klass.properties_release
        (properties_release['layers'] || {}).keys.each do |key|
          properties_release['layers'][key]['layer'] = properties_release['layers'][key]['key']
          properties_release['layers'][key]['wf'] = false if properties_release['layers'][key]['wf'].nil?
        end
        klass.update_columns(properties_release: properties_release)
      end
    end

    %w[Labimotion::Element Labimotion::Segment Labimotion::Dataset Labimotion::ElementsRevision Labimotion::SegmentsRevision Labimotion::DatasetsRevision].each do |els|
      els.constantize.find_each do |el|
        properties = el.properties
        (properties['layers'] || {}).keys.each do |key|
          properties['layers'][key]['layer'] = properties['layers'][key]['key']
          properties['layers'][key]['wf'] = false if properties['layers'][key]['wf'].nil?
        end
        klass = Labimotion::ElementKlassesRevision.find_by(uuid: el.klass_uuid) if %w[Labimotion::Element Labimotion::ElementsRevision].include?(els)
        klass = Labimotion::SegmentKlassesRevision.find_by(uuid: el.klass_uuid) if %w[Labimotion::Segment Labimotion::SegmentsRevision].include?(els)
        klass = Labimotion::DatasetKlassesRevision.find_by(uuid: el.klass_uuid) if %w[Labimotion::Dataset Labimotion::DatasetsRevision].include?(els)
        properties_release = klass.present? ? klass.properties_release : properties
        el.update_columns(properties: properties, properties_release: properties_release)
      end
    end
  end
end
