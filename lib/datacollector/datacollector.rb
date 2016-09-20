class DataCollector

  def check_for_new_data
    #load collectors
    collectors.each |collector| do
      collector.execute
    end
  end

end
