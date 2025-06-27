# frozen_string_literal: true

# rubocop:disable Metrics/BlockLength
namespace :svg do
  desc 're-render SVG for molecules: ' \
       '- [which:{all|missing|openbabel},to: molecule.id(optional),to: molecule.id(optional)]; ' \
       '- updated_at tag stays unchanged; ' \
       '- missing, only reprocess when SVG file is missing; ' \
       '- openbabel: only if SVG was produced by openbabel;' \
       '- all: all SVGs are re-rendered;' \
       '- example: rake \'svg:molecule[missing]\''
  task :molecule, %i[which from to] => [:environment] do |_t, args|
    processor(model: Molecule, **args)
  end

  desc 're-render SVG for samples: [{all|missing|openbabel}, int(optional), int(optional)]'
  task :sample, %i[which from to] => [:environment] do |_t, args|
    processor(model: Sample, **args)
  end

  # rubocop:disable Metrics/AbcSize
  # rubocop:disable Metrics/PerceivedComplexity
  # rubocop:disable Metrics/CyclomaticComplexity
  def processor(**args)
    args[:which] ||= 'missing'
    message_header = build_message_header(**args)
    scope = build_scope(**args)

    puts "#{message_header}indigo rendering service seems to #{indigo_running ? '' : 'not'} be available"

    scope.find_each do |element|
      svg_path = element.send(:full_svg_path)
      svg_file_exists = svg_path.present? && File.file?(svg_path)

      message = "#{message_header}element #{element.id}"

      if svg_file_exists
        next if args[:which] == 'openbabel' && !File.read(svg_path).match?('Open Babel')
        next if args[:which] == 'missing'
      end

      if element.molfile.blank?
        puts "#{message} no molfile, no SVG\n"
        next
      end

      svg = IndigoService.new(element.molfile, 'image/svg+xml').render_structure
      if svg.blank? || svg.match('viewBox=\"0 0 0 0\"')
        puts "#{message} cannot build SVG\n"
        next
      end
      FileUtils.rm_f(svg_path) if svg_file_exists

      element.attach_svg(svg)
      element.save(touch: false)
      puts "#{message} SVG attached\n"
    end
    puts "#{message_header}done"
  end
  # rubocop:enable Metrics/AbcSize
  # rubocop:enable Metrics/PerceivedComplexity
  # rubocop:enable Metrics/CyclomaticComplexity

  def indigo_running
    info = IndigoService.new(nil).service_info
    return false unless info

    status = begin
      info.respond_to?(:status) ? info.status : info[:status]
    rescue StandardError
      nil
    end

    status == 200
  end

  def build_message_header(**args)
    raise accepted_args_message unless %w[all missing openbabel].include?(args[:which])

    "Reprocessing #{args[:which] || 'missing'} #{args[:model]} SVGs: "
  end

  def accepted_args_message
    'Accepted args are: which:{all|missing|openbabel} from:integer to:integer.' \
      "Example: rake 'svg:molecule[missing, 1, 100]'"
  end

  def build_scope(**args)
    raise unless %w[Sample Molecule].include?(args[:model].to_s)

    scope = args[:model].all
    scope = scope.where(id: args[:from].to_i..) if args[:from].present?
    scope = scope.where(id: ..args[:to].to_i) if args[:to].present?
    scope
  end
end
# rubocop:enable Metrics/BlockLength
