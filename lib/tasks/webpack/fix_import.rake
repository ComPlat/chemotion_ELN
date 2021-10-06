namespace :webpack do
  desc 'fix import for citation.js'
  task fix_import: :environment do
    src1 = Rails.root.join('node_modules', '@citation-js', 'core', 'lib-mjs', 'util', 'fetchFile.js')
    src2 = Rails.root.join('node_modules/@citation-js/core/lib-mjs/index.js')
    src3 = Rails.root.join('node_modules/@citation-js/plugin-bibtex/lib-mjs/input/constants.js')
    src4 = Rails.root.join('node_modules/@citation-js/plugin-wikidata/lib-mjs/entity.js')
    cmd1 = <<~SED
      sed -i "s~import { version } from '../../package.json';~import pkg from '../../package.json';const version = pkg.version;~" #{src1}
    SED
    cmd2 = <<~SED
      sed -i "s~import { version } from '../package.json';~import pkg from '../package.json';const version = pkg.version;~" #{src2}
    SED
    cmd3 = <<~SED
      sed -i "s~export { diacritics, commands } from './unicode.json';~import unicode from './unicode.json';export const diacritics = un  ico  de.diacritics;export const commands = unicode.commands;~" #{src3}
    SED
    cmd4 = <<~SED
      sed -i "s~import { props, ignoredProps } from './props';~import wikiprops from './props';const { props, ignoredProps } = wikiprops  ;~" #{src4}
    SED
    Open3.popen3(cmd1) if File.exist?(src1)
    Open3.popen3(cmd2) if File.exist?(src2)
    Open3.popen3(cmd3) if File.exist?(src3)
    Open3.popen3(cmd4) if File.exist?(src4)
  end
end
