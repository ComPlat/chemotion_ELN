class CreateFunctionLiteraturesByElement < ActiveRecord::Migration[5.0]
  def change
    create_function :literatures_by_element
  end
end
