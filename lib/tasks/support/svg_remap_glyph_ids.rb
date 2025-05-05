# frozen_string_literal: true

require 'logger'

# MoleculeStructureCurationError is a custom error class for molecule structure curation errors.
class SvgRemapGlyphIdsError < StandardError
  def initialize(message = nil)
    super(message || 'SVG: Remaping Glyph IDs error')
  end
end

# MoleculeStructureCuration is responsible for finding and fixing problematic molecules
# It will find all molecules that have a corrupted molfile due to wrong parsing of pubchem response
# and try to create correct molecules anew and update associated samples.
# @example: MoleculeStructureCuration.new.process

class SvgRemapGlyphIds
  LOGFILE = Rails.root.join('log/svg_remaping_glyph_ids.log')

  attr_reader :logger, :klasses, :molfile_matcher, :dry_run

  # @option [String] :logfile the path to the log file (default: log/svg_remaping_glyph_ids.log')
  # @option [Logger] :logger the logger to use (default: Rails.logger.new(logfile))
  # @option [Array<String|Symbole>] :class_names the classes to process (default: %i[Sample Molecule Reaction])
  # @option [String] :molfile_matcher the string to match in the molfile (default: 'INDIGO-') to infere 
  #   the source of the svg
  # @option [Boolean] :dry_run if true, do not write the remaped svg to the file (default: false)
  def initialize(logfile: LOGFILE, logger: nil, class_names: %i[Sample Molecule Reaction], dry_run: false,
                 molfile_matcher: 'INDIGO-')
    @logger = logger || Logger.new(logfile)
    @klasses = (class_names.map(&:to_s) & %w[Sample Molecule Reaction]).map(&:constantize)
    @molfile_matcher = molfile_matcher
    sanitize_molfile_like_param
    @dry_run = dry_run
  end

  # Main function to process the molecules
  def process
    log_message(:start)
    klasses.each do |klass|
      @klass = klass
      log_message(:for_klass)
      map_entities
    end
    log_message(:done)
  rescue StandardError => e
    logger.error("Error in SVG remap glyph ids: #{e.message}")
    raise SvgRemapGlyphIdsError, "SVG remap glyph ids failed: #{e.message}"
  end

  private

  def log_message(type)
    case type
    when :start
      logger.info("########### STARTING SVG remap glyph ids for #{klasses.join(', ')}")
    when :done
      logger.info("########## DONE SVG remap glyph ids for #{klasses.join(', ')}")
    when :for_klass
      logger.info("Processing #{@klass}: #{entities.count} records to check")
    end
  rescue NoMethodError => e
    logger.error("Error in log_message: #{e.message}")
  end

  def map_entities
    entities.find_each do |entity|
      next unless (path = entity.send(:full_svg_path))

      svg = path.read
      remaped_svg = Chemotion::Sanitizer.scrub_svg(svg, remap_glyph_ids: true)
      path.write(remaped_svg) unless dry_run
      logger.info("SVG remap glyph ids for #{entity.class} #{entity.id} done")
    rescue StandardError => e
      logger.error("SVG remap glyph ids for #{entity.class} #{entity.id} failed: #{e.message}")
      raise SvgRemapGlyphIdsError, "SVG remap glyph ids for #{entity.class} #{entity.id} failed: #{e.message}"
    end
  end

  # This method is used to find all entities for which the molfile,
  # and thus the svg, originate from Indigo
  # @param klass [Class] the class of the entity to search for, either Sample or Molecule
  # @return [ActiveRecord::Relation] the entities that have a molfile containing 'INDIGO-'
  def entities(klass = @klass)
    return Reaction.joins(reactions_samples: :sample).where('samples.molfile like ?', molfile_matcher) if klass == Reaction

    klass.where('molfile like ?', molfile_matcher)
  end

  # sanitize AR query parameter for like query
  # @param param [String] the parameter to sanitize
  # @return [String] the sanitized parameter
  def sanitize_molfile_like_param(param = @molfile_matcher)
    @molfile_matcher = "%#{ActiveRecord::Base.sanitize_sql_like(param)}%" if param.is_a?(String)
  end
end
