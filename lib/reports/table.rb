class Table
  attr_accessor :table_data

  def initialize(dimension_x, dimension_y)
    @table_size = {x: dimension_x, y: dimension_y}
    @table_data = Array.new
  end

  def add_line (*args)
    @table_data << args
  end
end
