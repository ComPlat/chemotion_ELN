module Template
  class ReactionsReport < ReactionContent
    def initialize(ids, settings)
      @ids = ids
      @settings = settings
      @report = Report::RTFReport.new { }
    end

    def get_rtf_data
      process
      return @report
    end

    def process
      @ids.each do |id|
        @reaction = Reaction.find(id)
        title
        description if @settings.index("description")
        reaction_svg if @settings.index("reaction")
        materials if @settings.index("material")
        properties if @settings.index("properties")
        tlc_control if @settings.index("tlc-control")
        literatures if @settings.index("literature")
        reaction_ending
      end
    end
  end
end
