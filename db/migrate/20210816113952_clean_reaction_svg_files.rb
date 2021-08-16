# Remove unused reaction svg files from public/images/reactions/
class CleanReactionSvgFiles < ActiveRecord::Migration[5.2]
  def change
    return if Rails.env.test?
    path = Rails.public_path.join('images', 'reactions')
    first_two_chars = (0..255).map { |ftc| ftc.to_s(16) }
                              .map { |ftc| [ftc, 'temp-' + ftc] }
                              .flatten

    first_two_chars.each do |first_two|
      Dir[path.join(first_two + '*.svg')].each do |file_path|
        basename = File.basename(file_path)
        next if Reaction.find_by(reaction_svg_file: basename)

        File.delete(file_path) if File.exist?(file_path)
      end
    end
  end
end
