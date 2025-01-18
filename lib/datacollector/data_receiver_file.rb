# frozen_string_literal: true

# A class as a file data collector
class DataReceiverFile < DatacollectorFile

  def initialize(filename, temp_file_path)
    super filename, false
    @path = temp_file_path
  end

end