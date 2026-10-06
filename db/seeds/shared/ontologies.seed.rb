# Ontologies are not actual seeds.
# 
# They are configurable data mirroring the actual setup in the automation lab.
#
# Ontologies are meant to change (albeit rarely) over the course of time. By now we have created an Editor for the
# Ontologies in the ReactionProcessEditor UI so they can be managed and edited there.
#
# This is a reasonable initial set of ontologies checked in to the repository and
# we will import them into the DB with the seeds. 
#
#
Import::ReactionProcessEditor::ImportOntologies.new.execute
