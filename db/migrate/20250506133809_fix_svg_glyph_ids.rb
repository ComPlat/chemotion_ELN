require Rails.root.join('lib/tasks/support/svg_remap_glyph_ids.rb')

# This migration remaps the glyph ids and references in the svg files using unique ids
# @note It is irreversible because it modifies the SVG files directly.
# @note The transformation is idempotent and can be run multiple times
class FixSvgGlyphIds < ActiveRecord::Migration[6.1]
  def change
    # No rollback needed for this Migration
    # This migration is used to remap the glyph ids and references in the svg files using unique ids
    %w[Molecule Sample Reaction].each do |klass|
      SvgRemapGlyphIds.new(dry_run: true, class_names: [klass]).process
      SvgRemapGlyphIds.new(dry_run: false, class_names: [klass]).process
    rescue SvgRemapGlyphIdsError => e
      Rails.logger.error("Error in SVG remap glyph ids: #{e.message}")
    ensure
      puts "#{klass} SVGs curation: check log at #{SvgRemapGlyphIds.new.logger.instance_variable_get(:@logdev).filename} for details"
    end
  end
end
