# Ontologies are not actual seeds. They are configurable data mirroring the actual setup in the automation lab.
# Ontologies are meant to change (albeit rarely) over the course of time and will need to be re-imported when they do.
# Also they are meant to be obtained via an SFTP server (sort of implemented but SFTP server not available yet).
#
# Anyway we have a reasonable initial set of ontologies in the repository and we will import them into the DB here.
#
Import::ReactionProcessEditor::ImportOntologies.new.execute
