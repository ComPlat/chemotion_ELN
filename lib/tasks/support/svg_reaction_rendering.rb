# Rerender SVG for given reaction if the file is missing or empty.
class SvgReactionRendering
  attr_reader :missing, :all

  SVG_DIR = Rails.public_path.join('images/reactions').freeze
  LOGFILE = Rails.root.join('log/svg_reaction_rerendering.log').freeze

  def initialize(missing: true, all: false, logger: nil, logfile: LOGFILE, verbose: false)
    @missing = missing
    @all = all
    @logger = logger || Logger.new(logfile)
  end


  def render
    @logger.info("Starting SVG rendering for Reactions. Missing: #{missing}, All: #{all}")
    Reaction.find_each(order: :asc) do |reaction|
      if svg_file_present?(reaction.reaction_svg_file) && !all
        @logger.info("Skipping Reaction #{reaction.id}") if @verbose
        next
      end

      reaction_svg_file = reaction.send(:update_svg_file!)
      reaction.update_columns(reaction_svg_file: reaction_svg_file)
      @logger.info("Rendered SVG for Reaction #{reaction.id}")
    rescue StandardError => e
      @logger.error("Rendering SVG for Reaction #{reaction.id} failed: #{e.message}")
      #raise "Rendering SVG for Reaction #{reaction.id} failed: #{e.message}"
    end
  end

  def svg_file_present?(filename)
    return false if filename.blank? || !filename.end_with?('.svg')

    File.file?(SVG_DIR.join(filename))
  end
end
