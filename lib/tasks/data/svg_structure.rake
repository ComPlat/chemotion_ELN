# frozen_string_literal: true

require Rails.root.join('lib/tasks/support/svg_remap_glyph_ids.rb')

namespace :data do
  namespace :svg do
    desc 'Fix glyph ids unicity and references to them in SVG files'
    task fix_glyph_ids: :environment do
      puts 'Remapping glyph ids and references to them in SVG files ...'
      curator = SvgRemapGlyphIds.new
      curator.process
      puts "Done. Check the log file at #{curator.logger.instance_variable_get(:@logdev).filename} for details."
    end
  end
end
