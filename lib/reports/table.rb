class Table
  attr_accessor :table_data, :table_size, :table_dimensions

  def initialize(dimension_x, dimension_y)
    @table_size = {x: dimension_x, y: dimension_y}
    @table_data = Array.new
    @table_dimensions = Array.new
  end

  def set_table_dimensions
    dim = 8250/@table_size[:y]
    @table_size[:y].times {@table_dimensions.push(dim)}
  end

  def add_line (*args)
    @table_data << args
  end
end
