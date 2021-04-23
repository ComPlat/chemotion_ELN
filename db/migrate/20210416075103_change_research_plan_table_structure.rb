class ChangeResearchPlanTableStructure < ActiveRecord::Migration
  class ResearchPlan < ActiveRecord::Base
  end

  class ResearchPlanTableSchema < ActiveRecord::Base
  end

  def change
    ResearchPlan.find_each do |research_plan_item|
      tables = research_plan_item.body.select { |e| e['type'] == 'table' } 
      unless tables.nil? || tables.empty?
        tables.each do |table|
          columns = table['value']['columns']
          new_columns = []
          columns.each do |column|
            key = column['key']
            new_columns.push(column.merge({
              "sort": nil,
              "colId": key,
              "field": key,
              "pivot": false,
              "width": 200,
              "pinned": nil,
              "aggFunc": nil,
              "rowDrag": true,
              "editable": true,
              "rowGroup": false,
              "sortable": true,
              "cellClass": 'cell-figure',
              "resizable": true,
              "sortIndex": nil,
              "cellEditor": 'agTextCellEditor',
              "headerName": key,
              "pivotIndex": nil,
              "rowGroupIndex": nil
            }))
          end
          table['value']['columns'] = new_columns
        end
      end
      research_plan_item.save!
    end

    ResearchPlanTableSchema.find_each do |research_plan_table_schema_item|
      columns = research_plan_table_schema_item['value']['columns']
      new_columns = []
      columns.each do |column|
            key = column['key']
            new_columns.push(column.merge({
              "sort": nil,
              "colId": key,
              "field": key,
              "pivot": false,
              "width": 200,
              "pinned": nil,
              "aggFunc": nil,
              "rowDrag": true,
              "editable": true,
              "rowGroup": false,
              "sortable": true,
              "cellClass": 'cell-figure',
              "resizable": true,
              "sortIndex": nil,
              "cellEditor": 'agTextCellEditor',
              "headerName": key,
              "pivotIndex": nil,
              "rowGroupIndex": nil
            }))
      end
      research_plan_table_schema_item['value']['columns'] = new_columns
      research_plan_table_schema_item.save!
    end
  end
end
