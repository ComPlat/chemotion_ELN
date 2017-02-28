class CreateElementTags < ActiveRecord::Migration
  def self.up
    create_table :element_tags do |t|
      t.string  :taggable_type
      t.integer :taggable_id
      t.jsonb   :taggable_data

      t.timestamps
    end

    add_index :element_tags, :taggable_id

    ActiveRecord::Base.connection.schema_cache.clear!
    Sample.reset_column_information
    ElementTag.reset_column_information

    Sample.find_each do |sample|
      # Populate Sample - Collection tag
      et = ElementTag.new
      et.taggable_id = sample.id
      et.taggable_type = "Sample"

      collections = sample.collections.where.not(label: 'All')
      collection_labels = collections.map { |c|
        collection_id =
          if c.is_synchronized
            SyncCollectionsUser.where(collection_id: c.id).first.id
          else
            c.id
          end

        {
          name: c.label, is_shared: c.is_shared, user_id: c.user_id,
          id: collection_id, shared_by_id: c.shared_by_id,
          is_synchronized: c.is_synchronized
        }
      }.uniq

      # Populate Sample - Reaction tag
      associated_reaction = [
        sample.reactions_as_starting_material,
        sample.reactions_as_product
      ].flatten.compact.uniq

      reaction_id = nil
      if associated_reaction.count > 0
        reaction_id = associated_reaction.first.id
      end

      # Populate Sample - Analyses tag
      analyses = nil
      if sample.analyses.count > 0
        group = sample.analyses.map(&:extended_metadata)
                      .map {|x| x.extract!("kind", "status") }
                      .group_by{|x| x["status"]}
        analyses = group.map { |key, val|
          new_val = val.group_by{|x| x["kind"]}.map{|k, v| [k, v.length]}
          [key.to_s.downcase, new_val.to_h]
        }.to_h
      end

      et.taggable_data = {
        collection_labels: collection_labels,
        reaction_id: reaction_id,
        analyses: analyses
      }
      et.save!
    end

    Reaction.find_each do |reaction|
      # Populate Reaction - Collection tag
      collections = reaction.collections.where.not(label: 'All')
      collection_labels = collections.map { |c|
        collection_id =
          if c.is_synchronized
            SyncCollectionsUser.where(collection_id: c.id).first.id
          else
            c.id
          end

        {
          name: c.label, is_shared: c.is_shared, user_id: c.user_id,
          id: collection_id, shared_by_id: c.shared_by_id,
          is_synchronized: c.is_synchronized
        }
      }.uniq

      et = ElementTag.new
      et.taggable_id = reaction.id
      et.taggable_type = "Reaction"
      et.taggable_data = {
        collection_labels: collection_labels
      }
      et.save!
    end

    Wellplate.find_each do |wellplate|
      # Populate Reaction - Collection tag
      collections = wellplate.collections.where.not(label: 'All')
      collection_labels = collections.map { |c|
        collection_id =
          if c.is_synchronized
            SyncCollectionsUser.where(collection_id: c.id).first.id
          else
            c.id
          end

        {
          name: c.label, is_shared: c.is_shared, user_id: c.user_id,
          id: collection_id, shared_by_id: c.shared_by_id,
          is_synchronized: c.is_synchronized
        }
      }.uniq

      et = ElementTag.new
      et.taggable_id = wellplate.id
      et.taggable_type = "Wellplate"
      et.taggable_data = {
        collection_labels: collection_labels
      }
      et.save!
    end

    Screen.find_each do |screen|
      # Populate Reaction - Collection tag
      collections = screen.collections.where.not(label: 'All')
      collection_labels = collections.map { |c|
        collection_id =
          if c.is_synchronized
            SyncCollectionsUser.where(collection_id: c.id).first.id
          else
            c.id
          end

        {
          name: c.label, is_shared: c.is_shared, user_id: c.user_id,
          id: collection_id, shared_by_id: c.shared_by_id,
          is_synchronized: c.is_synchronized
        }
      }.uniq

      et = ElementTag.new
      et.taggable_id = screen.id
      et.taggable_type = "Screen"
      et.taggable_data = {
        collection_labels: collection_labels
      }
      et.save!
    end
  end

  def self.down
    drop_table :element_tags
  end
end
