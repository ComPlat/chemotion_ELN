# frozen_string_literal: true

module CellLineApiParamsHelpers
  extend Grape::API::Helpers

  params :cell_line_get_params do
    optional :collection_id, type: Integer, desc: 'Collection id'
    optional :sync_collection_id, type: Integer, desc: 'SyncCollectionsUser id'
    optional :filter_created_at, type: Boolean, desc: 'filter by created at or updated at'
    optional :from_date, type: Integer, desc: 'created_date from in ms'
    optional :to_date, type: Integer, desc: 'created_date to in ms'
  end

  params :cell_line_creation_params do
    optional :organism, type: String, desc: 'name of the donor organism of the cell'
    optional :tissue, type: String, desc: 'tissue from which the cell originates'
    requires :amount, type: Integer, desc: 'amount of cells'
    requires :unit, type: String, desc: 'unit of cell amount'
    requires :passage, type: Integer, desc: 'passage of cells'
    optional :disease, type: String, desc: 'deasease of cells'
    requires :material_names, type: String, desc: 'names of cell line e.g. name1;name2'
    requires :collection_id, type: Integer, desc: 'Collection of the cell line sample'
    optional :cell_type, type: String, desc: 'type of cells'
    optional :biosafety_level, type: String, desc: 'biosafety_level of cells'
    optional :growth_medium, type: String, desc: 'growth medium of cells'
    optional :variant, type: String, desc: 'variant of cells'
    optional :optimal_growth_temp, type: Float, desc: 'optimal_growth_temp of cells'
    optional :cryo_pres_medium, type: String, desc: 'cryo preservation medium of cells'
    optional :gender, type: String, desc: 'gender of donor organism'
    optional :material_description, type: String, desc: 'description of cell line concept'
    optional :contamination, type: String, desc: 'contamination of a cell line sample'
    requires :source, type: String, desc: 'source of a cell line sample'
    optional :name, type: String, desc: 'name of a cell line sample'
    optional :mutation, type: String, desc: 'mutation of a cell line'
    optional :description, type: String, desc: 'description of a cell line sample'
    optional :short_label, type: String, desc: 'short label of a cell line sample'
    requires :container, type: Hash, desc: 'root Container of element'
  end

  params :cell_line_update_params do
    requires :cell_line_sample_id, type: String, desc: 'id of the cell line to update'
    optional :organism, type: String, desc: 'name of the donor organism of the cell'
    optional :mutation, type: String, desc: 'mutation of a cell line'
    optional :tissue, type: String, desc: 'tissue from which the cell originates'
    requires :amount, type: Integer, desc: 'amount of cells'
    requires :unit, type: String, desc: 'unit of amount of cells'
    optional :passage, type: Integer, desc: 'passage of cells'
    optional :disease, type: String, desc: 'deasease of cells'
    optional :material_names, type: String, desc: 'names of cell line e.g. name1;name2'
    optional :collection_id, type: Integer, desc: 'Collection of the cell line sample'
    optional :cell_type, type: String, desc: 'type of cells'
    optional :biosafety_level, type: String, desc: 'biosafety_level of cells'
    optional :variant, type: String, desc: 'variant of cells'
    optional :optimal_growth_temp, type: Float, desc: 'optimal_growth_temp of cells'
    optional :cryo_pres_medium, type: String, desc: 'cryo preservation medium of cells'
    optional :gender, type: String, desc: 'gender of donor organism'
    optional :material_description, type: String, desc: 'description of cell line concept'
    optional :contamination, type: String, desc: 'contamination of a cell line sample'
    optional :source, type: String, desc: 'source of a cell line sample'
    optional :name, type: String, desc: 'name of a cell line sample'
    optional :description, type: String, desc: 'description of a cell line sample'
    requires :container, type: Hash, desc: 'root Container of element'
  end
end
