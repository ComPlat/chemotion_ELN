module Template
  class ReactionReport < ReactionContent
    def initialize(id)
      @id = id
      @report = Report::RTFReport.new { }
    end

    def get_rtf_data
      process
      return @report
    end

    def process
      @reaction = Reaction.find(@id)
      title
      description
      reaction_svg
      materials
      properties
      tlc_control
      literatures
    end
  end
end
