## 💡 Ketcher2 Surface Chemistry (K2SC) feature technical documentation 💡

This document helps developers understand how the K2SC feature is implemented using the Ket2 Editor API provided within the Ket2 instance. Two built-in Ketcher2 features are used to form a polymer template: Atom with Alias and Image.

### ⭐ Basic idea:  
All K2SC atoms should have an alias, which is composed of three parts. The third part of the alias represents the index of the imagesList. When an atom is moved or deleted, the third part of the alias can be used to identify which image, corresponding to that index in the imagesList, should be moved.

#### &#9733; Molfile with polymers   
First, the list of polymers is extracted (set aside) and removed from the original molfile. The molfile is then converted to the Ket2 format using the Ketcher-editor API. At this point, we have:  
1️⃣ A list of polymers, such as "11 12 13", where the numbers represent the atom count in the molfile (atoms without an 's' are beads, and atoms with an 's' are surfaces).  
2️⃣ The molfile in Ket2 format.  
Next, considering the list of polymers, images are pushed into nodes, and aliases are built for atoms labeled "A". For each new template added, a counter, named image_used_counter, is maintained to relate images to atoms.

### ⭐ Ket2 Events
Implementation is built on event-listeners which are triggered inside the ket2 canvas. Here is a list of events used in implementation:   
✔️ Load canvas -> open, saveMolecule  
✔️ Add Atom -> on new atom, mol, paste, delete  
✔️ Move Atom -> on atom move
✔️ Delete Atom -> on atom delete, on molecule delete  
✔️ Delete Image -> on image delete  
✔️ _selection -> holds selected structure  

### ⭐ Key: 
✔️ templates starts from 1  
✔️ Image counter starts from 0  

### ⭐ Few frequently used functions from Editors API
Here are some functions available in Editor API which are frequently used for K2SC:  
✔️ Editor: editor._structureDef.editor  
✔️ Indigo service inside Editor: editor._structureDef.editor.indigo  
✔️ Set New Data: editor.structureDef.editor.setMolecule  
✔️ To get Ket2 Format: editor.structureDef.editor.getKet  
✔️ Convert format: editor._structureDef.editor.indigo.convert  

### ⭐ Alias Patterns:
✔️ Two parts: t_01 => p1: t(prefix), p2: template id  
✔️ Three Parts: t_01_01 => t_01 => p1: t(prefix), p2: template id, p3: Image index  
    &#9733; examples: **t_01, t_02, t_02_0, t_01_1**   
    **&#9733; &#9733; :** On every new template added **image_used_counter** is incremented by one

### ⭐ Understand Main events and Execution

### &#9733; Event => Add atom:
When a new template is added to the canvas. A link is created between an image and atom(with alias).
These main components of a template:  
✔️ Atom with label(A) -- all k2SC atoms should have label:A  
✔️ Alias(t_templateid) -- All atoms should have an alias  
✔️ Image -- alias third part is an index of image in the nodes [patterns](#Alias-Patterns) data.  

  #### Add atom flow (in-order):  
  ✔️ Add atom should be with label A  
  ✔️ Added atom should have an alias: for example t_01  
  ✔️ Get the latest added image index  
  ✔️ Update the alias of atom as: t_templateid_imageindex(t_1_0)   
  ✔️ MoveTemplate: which place an image on alias atom  
      Having a correct index of the image is very import to maintain template coordination

### &#9733; Event => Move atom (in-order):
  Once an atom is added with correct alias:  
✔️ On atom move, get the alias of moved atom  
✔️ Pick the location [x,y,z] of the moved atom and based on alias third part which is an index from the image list.  
✔️ Update the location of image  
✔️ Save & MoveTemplate: a helper function which keeps all templates in-sync

### &#9733; Event => Delete Atom (in-order):
  When an atom is deleted:  
✔️ grab the atom deleted with its alias  
✔️ identify the image based on third part of the alias  
✔️ remove the image index from imageList  
✔️ reset all aliases and rebase. All alises should be consistent 0,1,2,3,4,5    
✔️ Save & MoveTemplate: a helper function which keeps all templates in-sync

### &#9733; Event => Delete Image (in-order):
  When an image is deleted:  
✔️ Get deleted image index from _selection variable  
✔️ Find an alias which has the image index number as third part  
✔️ Delete that atom  
✔️ reset all aliases and should be consistent  
✔️ Save & MoveTemplate: a helper function which keeps all templates in-sync

### &#9733; Event => Load canvas:  
Event called when a file is loaded or when setMolecule function is called.

### ⭐ A structure in action
An example of some actions.   
#### Action Add Atom
📋 Initials: image_count: -1, imageList:[],     
🚀 Add Atom 1: Alisa: t_01_0, imageList: [0], image_count: 0   
🚀 Add Atom 2: Alisa: t_01_1, imageList: [0, 1], image_count: 1  
🚀 Add Atom 3: Alisa: t_02_2, imageList: [0, 1, 2], image_count: 2   
📋 Aliases: [t_01_0, t_01_1, t_01_2], imageList: [0,1, 2], image_count: 2 

#### Action Delete Atom
🗑️ Delete Atom 1: 0  
📋 Aliases: [t_01_1, t_01_2], imageList: [1, 2], image_count: 1  
🚀 Rebase all aliases:    
📋 Aliases: [t_01_0, t_01_1], imageList: [0, 1], image_count: 1    

#### Extra Information on molfile

M  END
> <PolymersList>
0s/0.24-2.29 5/4/0.46-0.46
> <TextNode>
5#ea82s#t_4_1#text1Content
8#ea82g#t_4_1#text2Content
> </TextNode>
$$$$

#### 5/4/0.46-0.46 Explain parts of a polymerList identifier
part 1: atom index
part 2: template id from the templates datasource
part 3: Height-width

#### 5#ea82s#t_4_1#text-content Explain parts of a text Node
part 1: atom index
part 2: key id for text-node in ketcher format
part 3: Alias of the atom, text is connect with.
part 4: Content of Text-Node
