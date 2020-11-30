class AddViewSamplesCollections < ActiveRecord::Migration[4.2]
  def self.up
    execute "create or replace
    	view v_samples_collections as select
    		cols.id cols_id,
    		cols.user_id cols_user_id,
    		cols.sample_detail_level cols_sample_detail_level,
    		cols.wellplate_detail_level cols_wellplate_detail_level,
    		cols.shared_by_id cols_shared_by_id,
    		cols.is_shared cols_is_shared,
    		samples.id sams_id,
    		samples.name sams_name
    	from
    		collections cols
    	inner join collections_samples col_samples on
    		col_samples.collection_id = cols.id
    		and col_samples.deleted_at is null
    	inner join samples on
    		samples.id = col_samples.sample_id
    		and samples.deleted_at is null
    	where
    		cols.deleted_at is null;"
  end

  def self.down
    execute 'drop view v_samples_collections;'
  end
end
