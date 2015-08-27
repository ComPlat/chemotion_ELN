class Report::Header
  attr_accessor :experiment, :owner, :created_date, :printed_date, :status

  def build params
    params.each {|k,v| send("#{k}=",v)}
  end
end
