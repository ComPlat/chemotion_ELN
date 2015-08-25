# create initial test users
u = User.create!(email: 'test@ninjaconcept.com', password: 'ninjaconcept', password_confirmation: 'ninjaconcept')
hattori = User.create!(email: 'hattori@ninjaconcept.com', password: 'ninjaconcept', password_confirmation: 'ninjaconcept')
momochi = User.create!(email: 'momochi@ninjaconcept.com', password: 'ninjaconcept', password_confirmation: 'ninjaconcept')

collection_1 = Collection.create!(label: 'Collection #1', user_id: u.id)
subcollection_1 = Collection.create!(label: 'Subcollection of #1', user_id: u.id, parent: collection_1)
grand_child = Collection.create!(label: 'Grandchild', user_id: u.id, parent: subcollection_1)
collection_2 = Collection.create!(label: 'Collection #2', user_id: u.id)
collection_3 = Collection.create!(label: 'Collection #3', user_id: u.id)
collection_4 = Collection.create!(label: 'Collection #4', user_id: u.id)

# create some reactions
reaction_1 = Reaction.create(name: 'Reaction 1')
reaction_2 = Reaction.create(name: 'Reaction 2')
reaction_3 = Reaction.create(name: 'Reaction 3')
reaction_4 = Reaction.create(name: 'Reaction 4')
reaction_5 = Reaction.create(name: 'Reaction 5')
reaction_6 = Reaction.create(name: 'Reaction 6')

# create some shared collections
# shared_collection_1 = Collection.create!(is_shared: true, label: 'My project with Hattori', user_id: hattori.id, shared_by_id: u.id)
# shared_collection_2 = Collection.create!(is_shared: true, label: 'My project with Momochi', user_id: momochi.id, shared_by_id: u.id)

molfiles = []
molfiles << <<-MOLFILE
Molecule Name
  TheRing 0   0.00000     0.00000     0
[Insert Comment Here]
 10 11  0  0  0  0  0  0  0  0  1 V2000
   -0.4330    0.2500    0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0
    0.4330   -0.2500    0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0
    0.4330   -1.2500    0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0
   -0.4330   -1.7500    0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0
   -1.2990   -1.2500    0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0
   -1.2990   -0.2500    0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0
   -0.4330    1.2500    0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0
    0.4330    1.7500    0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0
    1.2990    1.2500    0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0
    1.2990    0.2500    0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0
  1  2  1  0  0  0  0
  2  3  1  0  0  0  0
  3  4  1  0  0  0  0
  4  5  1  0  0  0  0
  5  6  1  0  0  0  0
  6  1  1  0  0  0  0
  1  7  1  0  0  0  0
  7  8  1  0  0  0  0
  8  9  1  0  0  0  0
  9 10  1  0  0  0  0
 10  2  1  0  0  0  0
M  END
MOLFILE

molfiles << <<-MOLFILE
H2O Water 7732185
##CCCBDB 8251509:58
Geometry Optimized at HF/STO-3G
  3  2  0  0  0  0  0  0  0  0    V2000
    0.0000    0.0000    0.1271 O  0000000000000000000
    0.0000    0.7580   -0.5085 H  0000000000000000000
    0.0000   -0.7580   -0.5085 H  0000000000000000000
  1  2  1  0     0  0
  1  3  1  0     0  0
M  END
MOLFILE

molfiles << <<-MOLFILE
C6H4 (E)-Hexa-1,5-diyne-3-ene 16668681
##CCCBDB 8251510:05
Geometry Optimized at HF/STO-3G
 10  9  0  0  0  0  0  0  0  0    V2000
   -0.3290    0.5751    0.0000 C  0000000000000000000
    0.3290   -0.5751    0.0000 C  0000000000000000000
    0.3290    1.8708    0.0000 C  0000000000000000000
   -0.3290   -1.8708    0.0000 C  0000000000000000000
   -1.4147    0.5870    0.0000 H  0000000000000000000
    1.4147   -0.5870    0.0000 H  0000000000000000000
    0.8570    2.9180    0.0000 C  0000000000000000000
   -0.8570   -2.9180    0.0000 C  0000000000000000000
    1.3357    3.8690    0.0000 H  0000000000000000000
   -1.3357   -3.8690    0.0000 H  0000000000000000000
  1  2  2  0     0  0
  1  3  1  0     0  0
  1  5  1  0     0  0
  2  4  1  0     0  0
  2  6  1  0     0  0
  3  7  3  0     0  0
  4  8  3  0     0  0
  7  9  1  0     0  0
  8 10  1  0     0  0
MOLFILE

# create some molecules
molecule_1 = Molecule.create!(inchikey: '1', iupac_name: 'MOL 168', molecule_svg_file: '168.svg', molfile: molfiles[0])
molecule_2 = Molecule.create!(inchikey: '2', iupac_name: 'MOL 171', molecule_svg_file: '171.svg', molfile: molfiles[1])
molecule_3 = Molecule.create!(inchikey: '3', iupac_name: 'MOL 361', molecule_svg_file: '361.svg', molfile: molfiles[2])


# create some samples
sample_1 = Sample.create!(name: 'Sample 1', molecule: molecule_1)
sample_2 = Sample.create!(name: 'Sample 2', molecule: molecule_2)
sample_3 = Sample.create!(name: 'Sample 3', molecule: molecule_3)
sample_4 = Sample.create!(name: 'Sample 4', molecule: molecule_1)
sample_5 = Sample.create!(name: 'Sample 5', molecule: molecule_2)
sample_6 = Sample.create!(name: 'Sample 6', molecule: molecule_3)
sample_7 = Sample.create!(name: 'Sample 7', molecule: molecule_1)
sample_8 = Sample.create!(name: 'Sample 8', molecule: molecule_2)

# associate samples with reactions
ReactionsStartingMaterialSample.create!(reaction: reaction_1, sample: sample_1)
ReactionsReactantSample.create!(reaction: reaction_1, sample: sample_2)
ReactionsProductSample.create!(reaction: reaction_1, sample: sample_3)

ReactionsStartingMaterialSample.create!(reaction: reaction_2, sample: sample_3)
ReactionsReactantSample.create!(reaction: reaction_2, sample: sample_2)
ReactionsProductSample.create!(reaction: reaction_2, sample: sample_1)

# associate samples with collections
CollectionsSample.create!(sample: sample_1, collection: collection_1)
CollectionsSample.create!(sample: sample_2, collection: collection_1)
CollectionsSample.create!(sample: sample_3, collection: collection_1)
CollectionsSample.create!(sample: sample_4, collection: collection_1)
CollectionsSample.create!(sample: sample_2, collection: subcollection_1)
CollectionsSample.create!(sample: sample_5, collection: subcollection_1)
CollectionsSample.create!(sample: sample_6, collection: subcollection_1)
CollectionsSample.create!(sample: sample_1, collection: grand_child)
CollectionsSample.create!(sample: sample_7, collection: grand_child)
CollectionsSample.create!(sample: sample_8, collection: grand_child)

# CollectionsSample.create!(sample: sample_1, collection: shared_collection_1)
# CollectionsSample.create!(sample: sample_2, collection: shared_collection_2)
# CollectionsSample.create!(sample: sample_3, collection: shared_collection_2)

# associate samples with reactions
CollectionsReaction.create!(reaction: reaction_1, collection: collection_1)
CollectionsReaction.create!(reaction: reaction_2, collection: collection_1)
CollectionsReaction.create!(reaction: reaction_3, collection: collection_1)
CollectionsReaction.create!(reaction: reaction_4, collection: grand_child)
CollectionsReaction.create!(reaction: reaction_5, collection: subcollection_1)
CollectionsReaction.create!(reaction: reaction_6, collection: subcollection_1)
