# frozen_string_literal: true

require Rails.root.join('lib/ketcher_service/render_svg.rb')

# rubocop:disable Rails/Output
module Chemotion
  # Unified SVG renderer with fallback chain:
  # 1. IndigoService (if enabled)
  # 2. KetcherService (if Indigo fails or is disabled)
  # 3. OpenBabelService (if both fail)
  class SvgRenderer
    # Renders SVG from molfile using the full fallback chain:
    # Indigo -> Ketcher -> OpenBabel
    #
    # @param struct [String] The molfile structure to render
    # @return [String, nil] The rendered SVG, or nil if all services fail
    def self.render_svg_from_molfile(struct)
      rendered_svg = indigo_service(struct)
      return rendered_svg if rendered_svg

      rendered_svg = ketcher_service(struct)
      return rendered_svg if rendered_svg

      open_babel_service(struct)
    end

    # Attempts to render SVG using IndigoService
    #
    # @param struct [String] The molfile structure to render
    # @return [String, nil] The rendered SVG, or nil if rendering fails or is disabled
    def self.indigo_service(struct)
      if IndigoService.disabled?
        puts '❌ IndigoService is disabled, falling back to KetcherService'
        return nil
      end

      rendered_svg = IndigoService.new(struct, 'image/svg+xml').render_structure
      if rendered_svg.present?
        puts '✅ SVG rendered using IndigoService'
        return rendered_svg
      end

      nil
    end

    # Attempts to render SVG using KetcherService
    #
    # @param struct [String] The molfile structure to render
    # @return [String, nil] The rendered SVG, or nil if rendering fails or is disabled
    def self.ketcher_service(struct)
      if KetcherService.disabled?
        puts '❌ KetcherService is disabled, falling back to OpenBabelService'
        return nil
      end

      rendered_svg = render_svg(struct)
      if rendered_svg.present?
        puts '✅ SVG rendered using KetcherService'
        rendered_svg
      else
        puts 'KetcherService returned nil or empty, falling back to OpenBabelService'
        nil
      end
    rescue StandardError => e
      Rails.logger.error("KetcherService exception: #{e.message}")
      nil
    end

    # Attempts to render SVG using OpenBabelService
    #
    # @param struct [String] The molfile structure to render
    # @return [String, nil] The rendered SVG, or nil if rendering fails
    def self.open_babel_service(struct)
      rendered_svg = OpenBabelService.svg_from_molfile(struct)
      if rendered_svg.present?
        puts '✅ SVG rendered using OpenBabelService'
        rendered_svg
      else
        puts 'OpenBabelService returned nil or empty.'
        nil
      end
    rescue StandardError => e
      Rails.logger.error("❌ OpenBabelService failed: #{e.message}")
      nil
    end

    # Renders SVG from molfile using Ketcher service only
    #
    # @param molfile [String] The molfile structure to render
    # @return [String, nil] The rendered and processed SVG, or nil if rendering fails
    def self.render_svg(molfile)
      rendered_svg = KetcherService::RenderSvg.svg(molfile)
      return nil if rendered_svg.blank?

      svg = KetcherService::SVGProcessor.new(rendered_svg)
      svg.centered_and_scaled_svg
    rescue StandardError => e
      Rails.logger.error("Chemotion::SvgRenderer failed: #{e.message}")
      nil
    end
  end
  # rubocop:enable Rails/Output
end
