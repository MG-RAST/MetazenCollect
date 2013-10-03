/*
 * 	TODO:
 *
 * 	CLEANUP
 * 
 * 	- clean up data structures for
 * 		- controlled vocabularies
 *  	- form definitions
 *  	- user data
 * 
 *  - create module for data management
 * 		- send / receive API
 * 		- store / load disk
 * 		- send email
 * 	- unique checks
 * 
 * 	FEATURES
 * 
 * 	- add cloud storage option for google drive
 * 	- add more form element types
 *  - create horizontal vs vertical data entry metaphor
 *  - add form creation / manipulation metaphor
 * 	- add dynamic defaults (e.g. prefix with concatenated counter)
 * 
 * 	TESTING
 * 
 * 	- add documentation
 * 	- check platform differences
 * 	- polishing of UI elements
 * 	- minimize number of clicks
 * 
 */

//FormView Component Constructor
function FormView() {

	// initialize self
	var self = Ti.UI.createView({
		backgroundColor: '#000000'
	});
	
	// initialize the formComponents module
	var FormComponents = require('ui/common/FormComponents');
	var formComponents = new FormComponents();
	
	// set the list of handled field types
	var fieldTypes = ['text',
					  'geolocation',
					  'image',
					  'list',
					  'filterlist',
					  'boolean',
					  'date'];
	var fieldValidations = ['-',
							'controlled vocabulary',
							'formatted string'];
	
	// check file structure
	// the template directory holds all templates the user has downloaded
	var templateDir = Ti.Filesystem.getFile(Ti.Filesystem.applicationDataDirectory, 'templates');
	if (! templateDir.exists()) {
	    templateDir.createDirectory();
	}
	var templateFiles = templateDir.getDirectoryListing();
	
	// the cv directory holds all controlled vocabularies the user has downloaded
	var cvDir = Ti.Filesystem.getFile(Ti.Filesystem.applicationDataDirectory, 'cvs');
	if (! cvDir.exists()) {
	    cvDir.createDirectory();
	}
	var cvFiles = cvDir.getDirectoryListing();
	
	// the data dir has a subdirectory for each template, filled with data files for
	// the according template
	var dataDir = Ti.Filesystem.getFile(Ti.Filesystem.applicationDataDirectory, 'data');
	if (! dataDir.exists()) {
	    dataDir.createDirectory();
	}
	var formInstances = [];
	var instanciatedTemplates = dataDir.getDirectoryListing();
	for(i=0;i<instanciatedTemplates.length;i++){
		var currentFormInstances = Ti.Filesystem.getFile(Ti.Filesystem.applicationDataDirectory+'/data', instanciatedTemplates[i]).getDirectoryListing();
		for (h=0;h<currentFormInstances.length;h++){
			formInstances.push(currentFormInstances[h] + ' [' + instanciatedTemplates[i] + ']');
		}
	}

	// initialize variables that hold the current form-definition, required cvs and the entered data
	var formDefinition = {};
	var controlledVocabularies = {};
	var entryData = [];
	
	// initialize state variables	
	var currentFormName = null;
	var currentTemplateName = null;
	var currentDatasetIndex = 0;
	var currentDataset = {};
	var currentField = null;
	var currentGroup = null;
	var currentCV = null;
	var orientation = 'vertical';
	
	// set layout variables
	var buttonSideMargin = 5;
	var buttonTopMargin  = 40;
	var searchFieldWidth = 200;
	var firstRowOffset   = 75;
	var backTitle        = 'back';

	/*
	 * 
	 * 	VIEW FUNCTIONS
	 * 
	 */   	
	 
	// show the options to select an existing template instance or show the available templates
	self.showFormInstanceSelect = function(){
		for(i=self.children.length-1;i>-1;i--){
			self.remove(self.children[i]);
		}
		var buttons = formComponents.buttonMenu(['spacer','start new form','view/edit data','manage templates','manage CVs']);
		buttons['start new form'].addEventListener('click',self.showTemplateSelect);
		self.add(buttons['start new form']);
		buttons['view/edit data'].addEventListener('click',self.showFormSelect);
		self.add(buttons['view/edit data']);
		buttons['manage templates'].addEventListener('click',self.manageTemplates);
		self.add(buttons['manage templates']);
		buttons['manage CVs'].addEventListener('click',self.manageCVs);
		self.add(buttons['manage CVs']);
				
		var label = Ti.UI.createLabel({
			color: '#ffffff',
			text: 'Welcome to MetazenCollect',
			height:'auto',
			width:'auto',
			top: 10
		});
		self.add(label);
	};
	
	// show a list of the created form instances
	self.showFormSelect = function(){
		var formSelectView = Ti.UI.createView({
			top: 0,
			backgroundColor: '#000000',
			width: '100%',
			height: '100%',
			zIndex: 1
		});
		
		var fs = formComponents.filterSelect({ view: formSelectView, items: formInstances });
		for (i=0;i<fs.length;i++){
			fs[i].bound = i;
			fs[i].addEventListener('click', function(){
				var i = this.bound;
				currentFormName = formInstances[i].substr(0,formInstances[i].lastIndexOf('[') - 1);
				currentTemplateName = formInstances[i].substr(formInstances[i].lastIndexOf('[')+1, formInstances[i].length - formInstances[i].lastIndexOf('[') - 2);
				formSelectView.getParent().remove(formSelectView);
				self.loadForm();
			});
		}
		
		self.add(formSelectView);
	};
	
	self.showTemplateSelect = function(){
		var templateSelectView = Ti.UI.createView({
			top: 0,
			backgroundColor: '#000000',
			width: '100%',
			height: '100%',
			zIndex: 1
		});
		
		var currentTemplateInstances = Ti.Filesystem.getFile(Ti.Filesystem.applicationDataDirectory+'/data', currentTemplateName).getDirectoryListing();
		var fs = formComponents.filterSelect({ view: templateSelectView, items: templateFiles });
		for (i=0;i<fs.length;i++){
			fs[i].bound = i;
			fs[i].addEventListener('click', function(){
				currentTemplateName = templateFiles[this.bound];
				var dialog = formComponents.alertDialog({
					title: 'Enter form name'
				});
				dialog.addEventListener('click', function(e){
					if(e.index==0){
						for (i=0;i<currentTemplateInstances.length;i++){
							if(currentTemplateInstances[i]==e.text){
								alert('a form with that name already exists');
								dialog.show();
								return false;
							}
						}
						currentFormName = e.text;
						Ti.Filesystem.getFile(Ti.Filesystem.applicationDataDirectory+'/data/'+currentTemplateName+'/'+currentFormName).write(JSON.stringify([]));
						formInstances.push(currentFormName + ' ['+currentTemplateName+']');
						self.loadForm();
						templateSelectView.getParent().remove(templateSelectView);
					}
				});
				dialog.show();
			});
		}
		
		self.add(templateSelectView);
	};
	
	self.showTemplateInstanceSelect = function(){
		var templateSelectView = Ti.UI.createView({
			top: 0,
			backgroundColor: '#000000',
			width: '100%',
			height: '100%',
			zIndex: 1
		});
		
		var currentTemplateInstances = Ti.Filesystem.getFile(Ti.Filesystem.applicationDataDirectory+'/data', currentTemplateName).getDirectoryListing();
		currentTemplateInstances.unshift('');
		var fs = formComponents.filterSelect({ view: templateSelectView, items: currentTemplateInstances });
		fs[0].remove(fs[0].children[0]);
		var newForm = Ti.UI.createTextField({
		    width: searchFieldWidth,
		    left: buttonSideMargin,
		    hintText: 'enter new form name',
		    height: 'auto',
		    color: '#000000',
		    backgroundColor: '#ffffff',
		    borderStyle: Ti.UI.INPUT_BORDERSTYLE_ROUNDED
		});
		var newButton = Ti.UI.createButton({
			title: 'create',
			left: 220
		});
		formComponents.styleButton(newButton);
		newButton.addEventListener('click',function(e){
			// check if the chosen name is unique
			for (i=0;i<currentTemplateInstances.length;i++){
				if(currentTemplateInstances[i]==newForm.value){
					alert('a form with that name already exists');
					return false;
				}
			}
			currentFormName = newForm.value;
			Ti.Filesystem.getFile(Ti.Filesystem.applicationDataDirectory+'/data/'+currentTemplateName+'/'+currentFormName).write(JSON.stringify([]));
			self.loadForm();
			templateSelectView.getParent().remove(templateSelectView);
		});
		fs[0].add(newForm);
		fs[0].add(newButton);
		for (i=1;i<fs.length;i++){
			fs[i].bound = i;
			fs[i].addEventListener('click', function(){
				// an existing form was selected, load it
				var i = this.bound;
				currentFormName = currentTemplateInstances[i];
				templateSelectView.getParent().remove(templateSelectView);
				self.loadForm();
			});
		}
		
		self.add(templateSelectView);
	};
	
	// show the template editor
	self.templateEditor = function(){
		var editorView = Ti.UI.createView({
			top: 0,
			backgroundColor: '#000000',
			width: '100%',
			height: '100%',
			zIndex: 1
		});

		var titleLabel = Ti.UI.createLabel({
			text: 'Edit Template: '+currentTemplateName,
			top: 10,
			width: 'auto',
			height: 'auto',
			color: '#ffffff'
		});
		editorView.add(titleLabel);

		var buttons = formComponents.buttonMenu(['spacer','general properties','groups','fields','export to email','export to MG-RAST', 'spacer2', 'back']);
		buttons['general properties'].addEventListener('click',function(){
			self.generalPropertyEditor();
			editorView.getParent().remove(editorView);
		});
		editorView.add(buttons['general properties']);
		buttons['groups'].addEventListener('click',function(){
			self.groupEditor();
			editorView.getParent().remove(editorView);
		});
		editorView.add(buttons['groups']);
		buttons['fields'].addEventListener('click',function(){
			self.fieldEditor();
			editorView.getParent().remove(editorView);
		});
		editorView.add(buttons['fields']);
		buttons['export to email'].addEventListener('click',function(){
			alert('hello world');
		});
		editorView.add(buttons['export to email']);
		buttons['export to MG-RAST'].addEventListener('click',function(){
			alert('schmello world');
		});
		editorView.add(buttons['export to MG-RAST']);
		buttons['back'].addEventListener('click',function(){
			editorView.getParent().remove(editorView);
		});
		editorView.add(buttons['back']);

		self.add(editorView);
	};
	
	// show the group editor
	self.groupEditor = function(){
		var listView = Ti.UI.createView({
			top: 0,
			backgroundColor: '#000000',
			width: '100%',
			height: '100%',
			zIndex: 2
		});
		
		var titleLabel = Ti.UI.createLabel({
			text: formDefinition.name,
			top: 10,
			width: 'auto',
			height: 'auto',
			color: 'white',
			left: buttonSideMargin
		});
		listView.add(titleLabel);
	
		var okButton = Ti.UI.createButton({
			top: 5,
			right: buttonSideMargin,
		    title: backTitle
		});
		formComponents.styleButton(okButton);
		okButton.addEventListener('click', function(){
			self.templateEditor();
			listView.getParent().remove(listView);
		});
		listView.add(okButton);
		
		var tr1 = Ti.UI.create2DMatrix();
		tr1 = tr1.rotate(90);
		var tr2 = Ti.UI.create2DMatrix();
		tr2 = tr2.rotate(270);
		
		var array = [];
		for (var i=0;i<formDefinition.groups.length;i++){
			var label = Ti.UI.createLabel({
				color: '#000000',
				text: formDefinition.groups[i].label,
				height:'auto',
				width:'auto'
			});
			
			var upButton =  Ti.UI.createButton({
				left: buttonSideMargin,
				style:Ti.UI.iPhone.SystemButton.DISCLOSURE,
				transform:tr2,
				bound:i,
				bubbleParent: false
			});
			upButton.addEventListener('click', function(){
				var x = formDefinition.groups[this.bound];
				formDefinition.groups[this.bound] = formDefinition.groups[this.bound-1];
				formDefinition.groups[this.bound-1] = x;
				Ti.Filesystem.getFile(Ti.Filesystem.applicationDataDirectory+'/templates/'+currentTemplateName).write(JSON.stringify(formDefinition));
				self.groupEditor();
				listView.getParent().remove(listView);
			});
			var downButton =  Ti.UI.createButton({
				right: buttonSideMargin,
				style:Ti.UI.iPhone.SystemButton.DISCLOSURE,
				transform:tr1,
				bound: i,
				bubbleParent: false
			});
			downButton.addEventListener('click', function(){
				var x = formDefinition.groups[this.bound];
				formDefinition.groups[this.bound] = formDefinition.groups[this.bound+1];
				formDefinition.groups[this.bound+1] = x;
				Ti.Filesystem.getFile(Ti.Filesystem.applicationDataDirectory+'/templates/'+currentTemplateName).write(JSON.stringify(formDefinition));
				self.groupEditor();
				listView.getParent().remove(listView);
			});
			var row = Titanium.UI.createTableViewRow({
				height:46,
				backgroundColor: '#ffffff',
				bound: i
			});
			row.addEventListener('click', function(){
				currentGroup = formDefinition.groups[this.bound];
				self.editGroup();
			});
			row.add(label);
			if (i>0) {
				row.add(upButton);
			}
			if (i<formDefinition.groups.length-1){
				row.add(downButton);
			}
			array.push(row);
		}
		
		var newText = Ti.UI.createTextField({
			color: '#000000',
			hintText: 'new group name',
			height:'auto',
			width:210,
			left: buttonSideMargin,
			top: buttonTopMargin,
		    borderStyle: Ti.UI.INPUT_BORDERSTYLE_ROUNDED
		});
		var newTextButton = Ti.UI.createButton({
			title: 'create',
			right: buttonSideMargin,
			top: buttonTopMargin
		});
		newTextButton.addEventListener('click',function(){
			if (newText.value.length){
				formDefinition.groups.push({
					name: newText.value,
					label: newText.value,
					description: "",
					fields: []
				});
				Ti.Filesystem.getFile(Ti.Filesystem.applicationDataDirectory+'/templates/'+currentTemplateName).write(JSON.stringify(formDefinition));
				listView.getParent().remove(listView);
				self.groupEditor();
			} else {
				alert('you need to enter a name for the group');
			}
		});
		formComponents.styleButton(newTextButton);
		listView.add(newTextButton);
		listView.add(newText);
		
		var tableView = Ti.UI.createTableView({
			top: firstRowOffset,
			data: array,
			style:Titanium.UI.iPhone.TableViewStyle.GROUPED
		});
			
		listView.add(tableView);
		
		self.add(listView);
	};
	
	self.editGroup = function(){
		var editGroupView = Ti.UI.createScrollView({
			top: 0,
			zIndex: 2,
			backgroundColor: '#000000',
			width: '100%',
			height: '100%'
		});
	
		var okButton = Ti.UI.createButton({
			top: 5,
			right: buttonSideMargin,
		    title: backTitle
		});
		formComponents.styleButton(okButton);
		okButton.addEventListener('click', function(){
			Ti.Filesystem.getFile(Ti.Filesystem.applicationDataDirectory+'/templates/'+currentTemplateName).write(JSON.stringify(formDefinition));
			self.groupEditor();
			editGroupView.getParent().remove(editGroupView);
		});
		editGroupView.add(okButton);
		
		var titleLabel = Ti.UI.createLabel({
			text: currentGroup.name,
			top: 10,
			width: 'auto',
			height: 'auto',
			color: 'white',
			left: buttonSideMargin
		});
		editGroupView.add(titleLabel);
		
		var tr1 = Ti.UI.create2DMatrix();
		tr1 = tr1.rotate(90);
		var tr2 = Ti.UI.create2DMatrix();
		tr2 = tr2.rotate(270);
		
		var array = [];
		for (i in currentGroup.fields){
			if (currentGroup.fields.hasOwnProperty(i)) {
				var label = Ti.UI.createLabel({
					color: '#000000',
					text: formDefinition.fields[currentGroup.fields[i]].label,
					height:'auto',
					width:'auto'
				});
			
				var upButton =  Ti.UI.createButton({
					left: buttonSideMargin,
					style:Ti.UI.iPhone.SystemButton.DISCLOSURE,
					transform:tr2,
					bound:i,
					bubbleParent: false
				});
				upButton.addEventListener('click', function(){
					var x = currentGroup.fields[this.bound];
					currentGroup.fields[this.bound] = currentGroup.fields[this.bound-1];
					currentGroup.fields[this.bound-1] = x;
					Ti.Filesystem.getFile(Ti.Filesystem.applicationDataDirectory+'/templates/'+currentTemplateName).write(JSON.stringify(formDefinition));
					self.editGroup();
					editGroupView.getParent().remove(editGroupView);
				});
				var downButton =  Ti.UI.createButton({
					right: buttonSideMargin,
					style:Ti.UI.iPhone.SystemButton.DISCLOSURE,
					transform:tr1,
					bound: i,
					bubbleParent: false
				});
				downButton.addEventListener('click', function(){
					var x = currentGroup.fields[this.bound];
					currentGroup.fields[this.bound] = currentGroup.fields[this.bound+1];
					currentGroup.fields[this.bound+1] = x;
					Ti.Filesystem.getFile(Ti.Filesystem.applicationDataDirectory+'/templates/'+currentTemplateName).write(JSON.stringify(formDefinition));
					self.editGroup();
					editGroupView.getParent().remove(editGroupView);
				});
				var row = Titanium.UI.createTableViewRow({
					height:46,
					backgroundColor: '#ffffff',
					bound: i
				});
				row.addEventListener('click', function(){
					
					var dialog = Ti.UI.createOptionDialog({
					  cancel: 0,
					  options: ['Cancel', 'OK'],
					  selectedIndex: 0,
					  destructive: 1,
					  title: 'Remove this field?'
					});
					dialog.bound = this.bound;
					dialog.addEventListener('click',function(e){
					    if (e.index == 1){
					    	currentGroup.fields.splice(this.bound, 1);
					    	Ti.Filesystem.getFile(Ti.Filesystem.applicationDataDirectory+'/templates/'+currentTemplateName).write(JSON.stringify(formDefinition));
							self.editGroup();
							editGroupView.getParent().remove(editGroupView);
					    }
					});
					dialog.show();
				});
				row.add(label);
				if (i>0) {
					row.add(upButton);
				}
				if (i<formDefinition.groups.length-1){
					row.add(downButton);
				}
				array.push(row);
			}
		}
		
		// select box
		var availableFields = [];
		var availFieldsHash = {};
		for (i in formDefinition.fields){
			if (formDefinition.fields.hasOwnProperty(i)){
				availFieldsHash[i] = 1;
			}
		}
		for (i=0;i<formDefinition.groups.length;i++){
			for (h=0;h<formDefinition.groups[i].fields.length;h++){
				delete availFieldsHash[formDefinition.groups[i].fields[h]];
			}
		}
		for (i in availFieldsHash){
			if (availFieldsHash.hasOwnProperty(i)){
				availableFields.push(i);
			}
		}
		
		var selectView = Ti.UI.createScrollView({
			top: 0,
			backgroundColor: '#000000',
			width: '100%',
			height: '100%',
			zIndex: 3
		});

		var addNewButton =  Ti.UI.createButton({
			title: 'add field',
			width: 100,
			height: 30,
			left: buttonSideMargin,
			top: buttonTopMargin
		});
		formComponents.styleButton(addNewButton);
		addNewButton.addEventListener('click', function(e){
			if (availableFields.length>0){
				editGroupView.add(selectView);
				formComponents.filterSelect({
					view: selectView,
					items: availableFields,
					callback: function(field){
						currentGroup.fields.push(field);
						Ti.Filesystem.getFile(Ti.Filesystem.applicationDataDirectory+'/templates/'+currentTemplateName).write(JSON.stringify(formDefinition));
						self.editGroup();
						editGroupView.getParent().remove(editGroupView);
					}
				});
			} else {
				alert('all fields of this form are already in use');
			}
		});
		editGroupView.add(addNewButton);
		
		var renameGroup =  Ti.UI.createButton({
			title: 'rename',
			width: 100,
			height: 30,
			top: buttonTopMargin
		});
		formComponents.styleButton(renameGroup);
		renameGroup.addEventListener('click', function(e){
			var dialog = formComponents.alertDialog({
				title: 'Enter new group name'
			});
			dialog.addEventListener('click', function(e){
				if(e.index==0){
					for (i=0;i<formDefinition.groups.length;i++){
						if(formDefinition.groups[i].name==e.text){
							alert('a group with that name already exists');
							dialog.show();
							return false;
						}
					}
					currentGroup.label = e.text;
					currentGroup.name = e.text;
					Ti.Filesystem.getFile(Ti.Filesystem.applicationDataDirectory+'/templates/'+currentTemplateName).write(JSON.stringify(formDefinition));
					
					self.editGroup();
					editGroupView.getParent().remove(editGroupView);
				}
			});
			dialog.show();
		});
		editGroupView.add(renameGroup);
		
		var delGroup =  Ti.UI.createButton({
			title: 'delete group',
			width: 100,
			height: 30,
			right: buttonSideMargin,
			top: buttonTopMargin
		});
		formComponents.styleButton(delGroup);
		delGroup.addEventListener('click', function(e){
			var dialog = Ti.UI.createOptionDialog({
				  cancel: 0,
				  options: ['Cancel', 'OK'],
				  selectedIndex: 0,
				  destructive: 1,
				  title: 'Remove this group?'
				});
				dialog.addEventListener('click',function(e){
				    if (e.index == 1){
				    	if (formDefinition.groups.length==1){
				    		alert("The last group of a template cannot be deleted.");
				    	} else {
				    		for (var i=0;i<formDefinition.groups.length;i++){
				    			if (formDefinition.groups[i].name == currentGroup.name) {
				    				formDefinition.groups.splice(i,1);
				    				break;
				    			}
				    		}
				    		Ti.Filesystem.getFile(Ti.Filesystem.applicationDataDirectory+'/templates/'+currentTemplateName).write(JSON.stringify(formDefinition));
				    		alert("group deleted");
				    		currentGroup = formDefinition.groups[0];
				    		
				    		self.editGroup();
							editGroupView.getParent().remove(editGroupView);
				    	}
				    }
				});
				dialog.show();
		});
		editGroupView.add(delGroup);
		
		var tableView = Ti.UI.createTableView({
			top: firstRowOffset,
			data: array,
			style:Titanium.UI.iPhone.TableViewStyle.GROUPED
		});
			
		editGroupView.add(tableView);
		
		self.add(editGroupView);
	};
	
	// show the general property editor
	self.generalPropertyEditor = function(){
		var propertySelectView = Ti.UI.createView({
			top: 0,
			backgroundColor: '#000000',
			width: '100%',
			height: '100%',
			zIndex: 1
		});
		
		var labellist = formComponents.labelList({view: propertySelectView, start: 55, labels: [
			'name',
			'label',
			'description'
		]});
		
		var cancelButton = Ti.UI.createButton({
			title: 'cancel',
			top: 10,
			left: buttonSideMargin
		});
		cancelButton.addEventListener('click',function(){
			self.templateEditor();
			propertySelectView.getParent().remove(propertySelectView);
		});
		formComponents.styleButton(cancelButton);
		
		var okButton = Ti.UI.createButton({
			title: 'store',
			top: 10,
			right: buttonSideMargin
		});
		okButton.addEventListener('click',function(){
			formDefinition.name = nameField.value;
			formDefinition.label = labelField.value;
			formDefinition.description = descriptionField.value;
			Ti.Filesystem.getFile(Ti.Filesystem.applicationDataDirectory+'/templates/'+currentTemplateName).write(JSON.stringify(formDefinition));
			alert('changes stored');
			self.templateEditor();
			propertySelectView.getParent().remove(propertySelectView);
		});
		formComponents.styleButton(okButton);
		
		propertySelectView.add(cancelButton);
		propertySelectView.add(okButton);
		
		var nameField = Ti.UI.createTextField({
			borderStyle: Ti.UI.INPUT_BORDERSTYLE_ROUNDED,
			color: '#000000',
			top: labellist.positions[0],
			left: 120,
			width: searchFieldWidth,
			value: formDefinition.name || formDefinition.label,
			height: 'auto'
		});
		propertySelectView.add(nameField);
		
		var labelField = Ti.UI.createTextField({
			borderStyle: Ti.UI.INPUT_BORDERSTYLE_ROUNDED,
			color: '#000000',
			top: labellist.positions[1],
			left: 120,
			width: searchFieldWidth,
			value: formDefinition.label,
			height: 'auto'
		});
		propertySelectView.add(labelField);
		
		var ownerField = Ti.UI.createTextField({
			borderStyle: Ti.UI.INPUT_BORDERSTYLE_ROUNDED,
			color: '#000000',
			top: labellist.positions[2],
			left: 120,
			width: searchFieldWidth,
			value: formDefinition.owner,
			height: 'auto'
		});
		propertySelectView.add(ownerField);
		
		var descriptionField = Ti.UI.createTextArea({
			borderStyle: Ti.UI.INPUT_BORDERSTYLE_ROUNDED,
			color: '#000000',
			top: labellist.positions[3],
			left: 120,
			width: searchFieldWidth,
			value: formDefinition.description,
			height: 'auto'
		});
		propertySelectView.add(descriptionField);
		
		self.add(propertySelectView);
	};
	
	// show a list of fields available in the current template
	// and allow updating and adding of new fields
	self.fieldEditor = function(){
		var fieldSelectView = Ti.UI.createView({
			top: 0,
			backgroundColor: '#000000',
			width: '100%',
			height: '100%',
			zIndex: 1
		});
		
		var fields = [];
		for (i in formDefinition.fields){
			if (formDefinition.fields.hasOwnProperty(i)){
				fields.push(i);
			}
		}
		fields = fields.sort();
		var fs = formComponents.filterSelect({ cancelTitle: backTitle, cancel: self.templateEditor, view: fieldSelectView, items: fields, skipRows: 1 });
		var newForm = Ti.UI.createTextField({
		    width: searchFieldWidth,
		    left: buttonSideMargin,
		    hintText: 'enter new field name',
		    height: 'auto',
		    color: '#000000',
		    borderStyle: Ti.UI.INPUT_BORDERSTYLE_ROUNDED,
		    top: buttonTopMargin
		});
		var newButton = Ti.UI.createButton({
			title: 'create',
			right: buttonSideMargin,
			top: buttonTopMargin
		});
		formComponents.styleButton(newButton);
		newButton.addEventListener('click',function(e){
			// check if the chosen name is unique
			if (formDefinition.hasOwnProperty(newForm.value)){
				alert("a field with this name already exists");
				return false;
			}
			formDefinition.fields[newForm.value] = {label:newForm.value,description:'',value:null,type:'text',validation:'none'};
			Ti.Filesystem.getFile(Ti.Filesystem.applicationDataDirectory+'/templates/'+currentTemplateName).write(JSON.stringify(formDefinition));
			currentField = newForm.value;
			self.editField();
			fieldSelectView.getParent().remove(fieldSelectView);
		});
		fieldSelectView.add(newForm);
		fieldSelectView.add(newButton);
		for (i=0;i<fs.length;i++){
			fs[i].bound = i;
			fs[i].addEventListener('click', function(){
				// an existing field was selected, load it
				var i = this.bound;
				currentField = fields[i];
				self.editField();
				fieldSelectView.getParent().remove(fieldSelectView);
			});
		}
		
		self.add(fieldSelectView);
	};
	
	// edit / create an actual field in the template
	self.editField = function(){
		var scrollView = Ti.UI.createScrollView({
			top: 0,
			backgroundColor: '#000000',
			width: '100%',
			height: '100%',
			zIndex: 2
		});
		
		var field = formDefinition.fields[currentField];
		
		var labellist = formComponents.labelList({view: scrollView, labels: [
			'name',
			'label',
			'type',
			'validation',
			'default value',
			'description'			
		]});
		
		var nameField = Ti.UI.createTextField({
			borderStyle: Ti.UI.INPUT_BORDERSTYLE_ROUNDED,
			color: '#000000',
			top: labellist.positions[0],
			left: 120,
			width: searchFieldWidth,
			value: field.name || field.label,
			height: 'auto'
		});
		scrollView.add(nameField);
		
		var labelField = Ti.UI.createTextField({
			borderStyle: Ti.UI.INPUT_BORDERSTYLE_ROUNDED,
			color: '#000000',
			top: labellist.positions[1],
			left: 120,
			width: searchFieldWidth,
			value: field.label || field.name,
			height: 'auto'
		});
		scrollView.add(labelField);
		
		var typeField = Ti.UI.createTextField({
			borderStyle: Ti.UI.INPUT_BORDERSTYLE_ROUNDED,
			color: '#000000',
			top: labellist.positions[2],
			left: 120,
			width: searchFieldWidth,
			value: field.type,
			editable: false,
			height: 'auto'
		});
		typeField.addEventListener('click',function(){
			formComponents.select({
				items: fieldTypes,
				rootWindow: self,
				callback: function(value){
					typeField.value = value;
				}
			});
		});
		scrollView.add(typeField);
		
		var validationField = Ti.UI.createTextField({
			borderStyle: Ti.UI.INPUT_BORDERSTYLE_ROUNDED,
			color: '#000000',
			top: labellist.positions[3],
			left: 120,
			width: searchFieldWidth,
			value: field.validation,
			height: 'auto'
		});
		validationField.addEventListener('click',function(){
			formComponents.select({
				items: fieldValidations,
				rootWindow: self,
				callback: function(value){
					validationField.value = value;
				}
			});
		});
		scrollView.add(validationField);
		
		var defaultField = Ti.UI.createTextField({
			borderStyle: Ti.UI.INPUT_BORDERSTYLE_ROUNDED,
			color: '#000000',
			top: labellist.positions[4],
			left: 120,
			width: searchFieldWidth,
			value: field.value,
			height: 'auto'
		});
		scrollView.add(defaultField);
		
		var descriptionField = Ti.UI.createTextArea({
			borderWidth: 2,
			borderColor: '#bbb',
			borderRadius: 5,
			color: '#000000',
			top: labellist.positions[5],
			left: 120,
			width: searchFieldWidth,
			fontSize: 24,
			value: field.description,
			height: 100
		});
		scrollView.add(descriptionField);
		
		var cancelButton = Ti.UI.createButton({
			title: "cancel",
			top: 400,
			left: buttonSideMargin
		});
		formComponents.styleButton(cancelButton);
		cancelButton.addEventListener('click',function(){
			self.fieldEditor();
			scrollView.getParent().remove(scrollView);
		});
		scrollView.add(cancelButton);
		
		var okButton = Ti.UI.createButton({
			title: 'ok',
			top: 400,
			right: buttonSideMargin
		});
		okButton.addEventListener('click',function(){
			formDefinition.fields[currentField].label = labelField.value;
			formDefinition.fields[currentField].description = descriptionField.value;
			formDefinition.fields[currentField].value = defaultField.value;
			formDefinition.fields[currentField].validation = validationField.value;
			formDefinition.fields[currentField].type = typeField.value;
			Ti.Filesystem.getFile(Ti.Filesystem.applicationDataDirectory+'/templates/'+currentTemplateName).write(JSON.stringify(formDefinition));
			alert('updated');
			self.fieldEditor();
			scrollView.getParent().remove(scrollView);
		});
		formComponents.styleButton(okButton);
		scrollView.add(okButton);
		
		self.add(scrollView);
	};
	
	// load an existing form into memory and check if all dependencies are available
	// if everything is ok, show the data entry selection view
	self.loadForm = function(){
		var templateLoaded = self.loadTemplate();
		if (! templateLoaded){
			// the template could not be loaded
			return false;
		}
		
		// the template is loaded, load the user data
		var formFile = Ti.Filesystem.getFile(Ti.Filesystem.applicationDataDirectory+'/data/'+currentTemplateName+'/'+currentFormName);
		entryData = JSON.parse(formFile.read().text);
		currentDataset = entryData[0] || {};
		currentDatasetIndex = 0;
		
		// now iterate through the form to check for CVs
		var missingCVs = [];
		for (i in formDefinition.fields){
			if (formDefinition.fields.hasOwnProperty(i)){
				if (formDefinition.fields[i].validation.substr(0,3).toLowerCase()=='cv-'){
					var cv = formDefinition.fields[i].validation.substr(3).toLowerCase();
					if (controlledVocabularies.hasOwnProperty(cv)){
						continue;
					}
					var cvFile = Ti.Filesystem.getFile(Ti.Filesystem.applicationDataDirectory+'/cvs/'+cv);
					if (cvFile.read()){
						controlledVocabularies[cv] = JSON.parse(cvFile.read().text);
						continue;
					}
					missingCVs.push(cv);
				}
			}
		}
		if (missingCVs.length){
			alert("The following controlled vocabularies used by your form could not be found:\n"+missingCVs.join("\n"));
			return false;
		} else {
			self.showFormOptions();
		}
	};

	// load an existing template from user device into memory, check all dependencies
	// and let the user pick a name for their form if this is a new template
	self.loadTemplate = function(){
		var templateAvailable = false;
		var templateFile = null;
		for (i=0;i<templateFiles.length;i++){
			if (templateFiles[i]==currentTemplateName) {
				templateAvailable = true;
				templateFile = Ti.Filesystem.getFile(Ti.Filesystem.applicationDataDirectory + '/templates/' + currentTemplateName);
				break;
			}
		}
		if (templateAvailable){
			formDefinition = JSON.parse(templateFile.read().text);
			return true;
		} else {
			alert('The requested template "'+currentTemplateName+'" is not available on this device.');
			return false;
		}
	};
	
	// show a list of available controlled vocabularies and allow CV creation
	// also allow CV modification for locally stored CVs
	self.manageTemplates = function(){
		var manageTemplateView = Ti.UI.createScrollView({
			top: 0,
			zIndex: 2,
			backgroundColor: '#000000',
			width: '100%',
			height: '100%'
		});
	
		var okButton = Ti.UI.createButton({
			top: 5,
			right: buttonSideMargin,
		    title: backTitle
		});
		formComponents.styleButton(okButton);
		okButton.addEventListener('click', function(){
			manageTemplateView.getParent().remove(manageTemplateView);
			self.showFormInstanceSelect();
		});
		manageTemplateView.add(okButton);
		
		var titleLabel = Ti.UI.createLabel({
			text: "Templates",
			top: 5,
			left: buttonSideMargin,
			width: 'auto',
			height: 'auto',
			color: '#ffffff'
		});
		manageTemplateView.add(titleLabel);
		
		var array = [];
		
		var addNewButton =  Ti.UI.createButton({
			title: 'new',
			width: 120,
			height: 30,
			left: buttonSideMargin,
			top: buttonTopMargin
		});
		formComponents.styleButton(addNewButton);
		addNewButton.addEventListener('click', function(e){
			var dialog = formComponents.alertDialog({
				title: 'Enter template name'
			});
			dialog.addEventListener('click', function(e){
				if(e.index==0){
					for (i=0;i<templateFiles.length;i++){
						if(templateFiles[i]==e.text){
							alert('a template with that name already exists');
							dialog.show();
							return false;
						}
					}
					currentTemplateName = e.text;
					formDefinition = { "name": currentTemplateName,
									   "label": currentTemplateName,
									   "owner": "public",
									   "description": "a custom form",
									   "fields": {},
									   "groups": [{"name": "main", "label":"main","description":"main group","fields":[]}]};
					Ti.Filesystem.getFile(Ti.Filesystem.applicationDataDirectory+'/templates/'+currentTemplateName).write(JSON.stringify(formDefinition));
					var tdir = Ti.Filesystem.getFile(Ti.Filesystem.applicationDataDirectory+'/data/',currentTemplateName);
					if (! tdir.exists()) {
			 		   tdir.createDirectory();
					}
					templateFiles.push(currentTemplateName);
					self.templateEditor();
					manageTemplateView.getParent().remove(manageTemplateView);
				}
			});
			dialog.show();
		});
		
		manageTemplateView.add(addNewButton);
		
		var syncButton =  Ti.UI.createButton({
			title: 'check server',
			width: 120,
			height: 30,
			top: buttonTopMargin,
			right: buttonSideMargin
		});
		formComponents.styleButton(syncButton);
		syncButton.addEventListener('click', function(e){
			self.downloadTemplates();
			self.manageTemplates();
			manageTemplateView.getParent().remove(manageTemplateView);
		});
		
		manageTemplateView.add(syncButton);
		
		var sortedTemplates = templateFiles.sort();
		for (var i=0;i<sortedTemplates.length;i++){
			var label = Ti.UI.createLabel({
				color: '#000000',
				text: sortedTemplates[i],
				height:'auto',
				width:'auto'
			});
			var row = Titanium.UI.createTableViewRow({
				height:46,
				backgroundColor: '#ffffff',
				bound: sortedTemplates[i]
			});
			row.addEventListener('click', function(){
				currentTemplateName = this.bound;
				self.loadTemplate();
				self.templateEditor();
				manageTemplateView.getParent().remove(manageTemplateView);
			});
			row.add(label);
			array.push(row);
		}
		
		var tableView = Ti.UI.createTableView({
			top: firstRowOffset,
			data: array,
			style:Titanium.UI.iPhone.TableViewStyle.GROUPED
		});
			
		manageTemplateView.add(tableView);
		
		self.add(manageTemplateView);
	};
		
	// download the templates available on the server
	self.downloadTemplates = function(){
		var templateView = Ti.UI.createScrollView({
			top: 0,
			backgroundColor: '#000000',
			width: '100%',
			height: '100%',
			zIndex: 1
		});
		
 		self.add(templateView);
 		
 		/*
 		 This section needs to be modified to load a list of all available templates on the server versus only the mgrast default one
 		 */ 
		var templateURL = "http://localhost/cgi-bin/api.cgi/validation/template/cd1d90ca-1023-4c51-8770-ed9b1f91e6b5";
		var client = Ti.Network.createHTTPClient({
	     	onload : function(e) {
	     		var response = JSON.parse(this.responseText);
	     		if (response.hasOwnProperty("template") && response.template.hasOwnProperty('name')){
	     			Ti.Filesystem.getFile(Ti.Filesystem.applicationDataDirectory+'/templates/'+response.template.name).write(JSON.stringify(response.template));
					var tdir = Ti.Filesystem.getFile(Ti.Filesystem.applicationDataDirectory+'/data/',response.template.name);
					if (! tdir.exists()) {
			 		   tdir.createDirectory();
					}
					var exists = false;
					for (i=0;i<templateFiles.length;i++) {
						if (templateFiles[i] == response.template.name) {
							exists = true;
							break;
						}
					}
					if (! exists) {
						templateFiles.push(response.template.name);
					}
	     		}
		    },
	     	onerror : function(e) {
	         	alert('error: '+e.error);
				templateView.getParent().remove(templateView);
	     	},
	     	timeout : 5000  // in milliseconds
		 });
		 // Prepare the connection.
 		client.open("GET", templateURL);
 		// Send the request.
 		client.send();
	};
	
	// show a list of available controlled vocabularies and allow CV creation
	// also allow CV modification for locally stored CVs
	self.manageCVs = function(){
		var manageCVView = Ti.UI.createView({
			top: 0,
			zIndex: 2,
			backgroundColor: '#000000',
			width: '100%',
			height: '100%'
		});
	
		var okButton = Ti.UI.createButton({
			top: 5,
			right: buttonSideMargin,
		    title: backTitle
		});
		formComponents.styleButton(okButton);
		okButton.addEventListener('click', function(){
			manageCVView.getParent().remove(manageCVView);
			self.showFormInstanceSelect();
		});
		manageCVView.add(okButton);
		
		var titleLabel = Ti.UI.createLabel({
			text: "Controlled Vocabularies",
			top: 5,
			left: buttonSideMargin,
			width: 'auto',
			height: 'auto',
			color: '#ffffff'
		});
		manageCVView.add(titleLabel);
		
		var array = [];
		
		var addNewButton =  Ti.UI.createButton({
			title: 'new',
			width: 120,
			height: 30,
			top: buttonTopMargin,
			left: buttonSideMargin
		});
		formComponents.styleButton(addNewButton);
		addNewButton.addEventListener('click', function(e){
			var dialog = formComponents.alertDialog({
				title: 'Enter CV name',
			});
			dialog.addEventListener('click', function(e){
				if(e.index==0){
					for (i=0;i<cvFiles.length;i++){
						if(cvFiles[i]==e.text){
							alert('a CV with that name already exists');
							dialog.show();
							return false;
						}
					}
					currentCV = e.text;
					controlledVocabularies[currentCV] = {"label":currentCV,"type":"list","description":currentCV,"terms":[]};
					Ti.Filesystem.getFile(Ti.Filesystem.applicationDataDirectory+'/cvs/'+currentCV).write(JSON.stringify(controlledVocabularies[currentCV]));
					cvFiles.push(currentCV);
					self.cvEditor();
					manageCVView.getParent().remove(manageCVView);
				}
			});
			dialog.show();
		});
		
		manageCVView.add(addNewButton);
		
		var syncButton =  Ti.UI.createButton({
			title: 'check server',
			width: 120,
			height: 30,
			top: buttonTopMargin,
			right: buttonSideMargin
		});
		formComponents.styleButton(syncButton);
		syncButton.addEventListener('click', function(e){
			self.downloadCVs();
			self.manageCVs();
			manageCVView.getParent().remove(manageCVView);
		});
		
		manageCVView.add(syncButton);
		
		var sortedCVs = cvFiles.sort();
		for (var i=0;i<sortedCVs.length;i++){
			var label = Ti.UI.createLabel({
				color: '#000000',
				text: sortedCVs[i],
				height:'auto',
				width:'auto'
			});
			var row = Titanium.UI.createTableViewRow({
				height:46,
				backgroundColor: '#ffffff',
				bound: i
			});
			row.addEventListener('click', function(){
				currentCV = sortedCVs[this.bound];
				self.cvEditor();
				manageCVView.getParent().remove(manageCVView);
			});
			row.add(label);
			array.push(row);
		}
		
		var tableView = Ti.UI.createTableView({
			top: firstRowOffset,
			data: array,
			style:Titanium.UI.iPhone.TableViewStyle.GROUPED
		});
			
		manageCVView.add(tableView);
		
		self.add(manageCVView);
	};
	
	self.cvEditor = function(){
		if (! controlledVocabularies.hasOwnProperty(currentCV)){
			var cvFile = Ti.Filesystem.getFile(Ti.Filesystem.applicationDataDirectory+'/cvs/'+currentCV);
			controlledVocabularies[currentCV] = JSON.parse(cvFile.read().text);
		}
		var cv = controlledVocabularies[currentCV];
		var cvView = Ti.UI.createView({
			top: 0,
			backgroundColor: '#000000',
			width: '100%',
			height: '100%',
			zIndex: 1
		});
		
		var terms = cv.terms.sort().slice(0);
		var thash = {};
		for (i=0;i<terms.length;i++){
			thash[terms[i]] = true;
		}
		var fs = formComponents.filterSelect({ cancelTitle: backTitle, cancel: self.manageCVs, view: cvView, items: terms, skipRows: 1 });
		var newForm = Ti.UI.createTextField({
		    width: searchFieldWidth,
		    left: buttonSideMargin,
		    top: buttonTopMargin,
		    hintText: 'enter new term',
		    height: 'auto',
		    color: '#000000',
		    borderStyle: Ti.UI.INPUT_BORDERSTYLE_ROUNDED
		});
		var newButton = Ti.UI.createButton({
			title: 'add',
			right: buttonSideMargin,
			top: buttonTopMargin
		});
		formComponents.styleButton(newButton);
		newButton.addEventListener('click',function(e){
			// check if the chosen name is unique
			if (thash.hasOwnProperty(newForm.value)){
				alert("that term already exists");
				return false;
			}
			thash[newForm.value]=true;
			terms.push(newForm.value);
			cv.terms = terms;
			Ti.Filesystem.getFile(Ti.Filesystem.applicationDataDirectory+'/cvs/'+currentCV).write(JSON.stringify(controlledVocabularies[currentCV]));			
			self.cvEditor();
			cvView.getParent().remove(cvView);
		});
		cvView.add(newForm);
		cvView.add(newButton);
		for (i=0;i<fs.length;i++){
			fs[i].bound = i;
			fs[i].addEventListener('click', function(){
				var dialog = Ti.UI.createOptionDialog({
				  cancel: 0,
				  options: ['Cancel', 'OK'],
				  selectedIndex: 0,
				  destructive: 1,
				  title: 'Remove this term?'
				});
				dialog.bound = this.bound;
				dialog.addEventListener('click',function(e){
				    if (e.index == 1){
				    	delete thash[terms[this.bound]];
				    	terms.splice(this.bound, 1);
				    	controlledVocabularies[currentCV].terms = terms;
				    	Ti.Filesystem.getFile(Ti.Filesystem.applicationDataDirectory+'/cvs/'+currentCV).write(JSON.stringify(controlledVocabularies[currentCV]));			
						self.cvEditor();
						cvView.getParent().remove(cvView);
				    }
				});
				dialog.show();
			});
		}
		
		self.add(cvView);
	};
	
	// show a list of CVs available on the server and allow download / update
	self.downloadCVs = function(){
		var cvView = Ti.UI.createScrollView({
			top: 0,
			backgroundColor: '#000000',
			width: '100%',
			height: '100%',
			zIndex: 1
		});
		
 		self.add(cvView);
 		
		var cvURL = "http://api.metagenomics.anl.gov/metadata/cv";
		var client = Ti.Network.createHTTPClient({
	     	onload : function(e) {
	     		var response = JSON.parse(this.responseText);
	     		var serverCVlist = [];
	     		if (response.hasOwnProperty("select")){
	     			for (i in response.select){
	     				if (response.select.hasOwnProperty(i)){
	     					var existing = false;
	     					for (h=0;h<cvFiles.length;h++){
	     						if (cvFiles[h]==i){
	     							existing = true;
	     							break;
	     						}
	     					}
	     					serverCVlist.push({name: i, existing: existing, terms: response.select[i]});
	     				}
	     			}
	     		}
	     		var newCVs = 0;
	     		for (i=0;i<serverCVlist.length;i++){
	     			var cv = serverCVlist[i].name;	
	     			if (serverCVlist[i].existing){
	     				var cvFile = Ti.Filesystem.getFile(Ti.Filesystem.applicationDataDirectory+'/cvs/'+cv);
						controlledVocabularies[cv] = JSON.parse(cvFile.read().text);
					} else {
						controlledVocabularies[cv] = {"label":cv,"type":"list","description":cv,"terms":[],"local":false};
						newCVs++;
					}
					controlledVocabularies[cv].terms = serverCVlist[i].terms;
     				Ti.Filesystem.getFile(Ti.Filesystem.applicationDataDirectory+'/cvs/'+cv).write(JSON.stringify(controlledVocabularies[cv]));
	     		}
	     		var cvDir = Ti.Filesystem.getFile(Ti.Filesystem.applicationDataDirectory, 'cvs');
				cvFiles = cvDir.getDirectoryListing();
	     		alert(serverCVlist.length+' CVs downloaded - '+newCVs+' new, '+(serverCVlist.length-newCVs)+' updated.');
		    },
	     	onerror : function(e) {
	         	alert('error: '+e.error);
				cvView.getParent().remove(cvView);
	     	},
	     	timeout : 5000  // in milliseconds
		 });
		 // Prepare the connection.
 		client.open("GET", cvURL);
 		// Send the request.
 		client.send();
	};
	
	// show the options when a form is selected
	self.showFormOptions = function(){
		var formView = Ti.UI.createView({
			top: 0,
			backgroundColor: '#000000',
			width: '100%',
			height: '100%',
			zIndex: 1
		});
		
		var formLabel = Ti.UI.createLabel({
			color:'#ffffff',
			text: currentTemplateName + ' - ' + currentFormName,
			top: 10,
			height:'auto',
			width:'auto'
		});
		
		formView.add(formLabel);
		
		var buttons = formComponents.buttonMenu(['spacer', 'enter data', 'view data', 'export data', 'modify template', 'spacer2', 'main menu']);
		buttons['enter data'].addEventListener('click',self.renderForm);
		formView.add(buttons['enter data']);
		buttons['view data'].addEventListener('click',self.selectDataset);
		formView.add(buttons['view data']);
		buttons['export data'].addEventListener('click',self.exportDataOptions);
		formView.add(buttons['export data']);
		buttons['main menu'].addEventListener('click',function(){
			formView.getParent().remove(formView);
			self.showFormInstanceSelect();
		});
		formView.add(buttons['main menu']);
		buttons['modify template'].addEventListener('click',self.templateEditor);
		formView.add(buttons['modify template']);
		
		self.add(formView);
	};
	
	// show the dataset selection
	self.selectDataset = function(){
		var datasetSelectView = Ti.UI.createView({
			top: 0,
			backgroundColor: '#000000',
			width: '100%',
			height: '100%',
			zIndex: 2
		});
		
		var items = [];
		for (i=0;i<entryData.length;i++){
			items.push(entryData[i][formDefinition.id]);
		}
		
		var fs = formComponents.filterSelect({ view: datasetSelectView, items: items });
		for (i=0;i<fs.length;i++){
			fs[i].bound = i;
			fs[i].addEventListener('click', function(){
				var i = this.bound;
				datasetSelectView.getParent().remove(datasetSelectView);
				currentDatasetIndex = i;
				currentDataset = entryData[currentDatasetIndex];
				self.renderForm();
			});
		}
		
		self.add(datasetSelectView);
	};
	
	// show the options for data export
	self.exportDataOptions = function(){
		var formView = Ti.UI.createView({
			top: 0,
			backgroundColor: '#000000',
			width: '100%',
			height: '100%',
			zIndex: 2
		});
		
		var formLabel = Ti.UI.createLabel({
			color:'#ffffff',
			text: 'Export Form Data (' + currentFormName + ')',
			top: 10,
			height:'auto',
			width:'auto'
		});
		
		formView.add(formLabel);
		
		var buttons = formComponents.buttonMenu(['spacer', 'export to email', 'upload to MG-RAST', 'spacer2', backTitle]);
		buttons[backTitle].addEventListener('click',function(){
			formView.getParent().remove(formView);
			self.showFormOptions();
		});
		formView.add(buttons[backTitle]);
		buttons['export to email'].addEventListener('click',function(){
			var emailDialog = Ti.UI.createEmailDialog();
			emailDialog.subject = 'MetazenCollect Data Export - ' + formDefinition.label + ': ' + currentFormName;
			emailDialog.messageBody = "MetazenCollect Data Export\n\nExport Template: " + currentTemplateName + "\nExport Form: " + currentFormName;
			var f = Ti.Filesystem.getFile(Ti.Filesystem.getApplicationDataDirectory() + '/data/' + currentTemplateName + '/' + currentFormName);
			emailDialog.addAttachment(f);
			emailDialog.open();
			formView.getParent().remove(formView);
		});
		formView.add(buttons['export to email']);
		buttons['upload to MG-RAST'].addEventListener('click',function(){
			var url = "http://api.metagenomics.anl.gov/api2.cgi/metagenome/mgm4440026.3?verbosity=full";
			var client = Ti.Network.createHTTPClient({
		     	onload : function(e) {
		     		var response = JSON.parse(this.responseText);
		     		if (! response.error){
		       	 		alert('Your data was submitted successfully');
			       	 } else {
			       	 	alert('Your data submission failed: '+response.error);
			       	 }
					formView.getParent().remove(formView);
			    },
		     	onerror : function(e) {
		        	Ti.API.debug(e.error);
		         	alert('error');
 					formView.getParent().remove(formView);
		     	},
		     	timeout : 5000  // in milliseconds
			 });
			 // Prepare the connection.
	 		client.open("GET", url);
	 		// Send the request.
	 		client.send();
		});
		formView.add(buttons['upload to MG-RAST']);
		
		self.add(formView);
	};
	
	/*
		FORM RENDER LOGIC
	*/
	
	// render the current form
	self.renderForm = function(){
		var renderView = Ti.UI.createView({
			width: '100%',
			height: '100%',
			zIndex: 2,
			backgroundColor: '#000000'
		});
		var currentControl = null;
 
		var closeBtn = Ti.UI.createButton({
			title: backTitle,
			left: buttonSideMargin,
			top: 10
		});
		formComponents.styleButton(closeBtn);
		closeBtn.addEventListener('click',
			function(e) {
				currentDatasetIndex = entryData.length;
				currentDataset = {};
				renderView.getParent().remove(renderView);
			}
		);
		
		var nextBtn = Ti.UI.createButton({
			title: 'Store',
			right: buttonSideMargin,
			top: 10
		});
		formComponents.styleButton(nextBtn);
		nextBtn.addEventListener('click',
			function(e){
				// fill in default values for entries that were not changed by the user
				for (i in currentGroup.fields){
					if (currentGroup.fields.hasOwnProperty(i) && ! currentDataset.hasOwnProperty(i)){
						currentDataset[i] = currentGroup.fields[i]['default'];
					}
				}
				
				// check if the id is filled out
				if (currentDataset[formDefinition.id]) {
					entryData[currentDatasetIndex] = currentDataset;
					currentDatasetIndex++;
					currentDataset = entryData[currentDatasetIndex] ? entryData[currentDatasetIndex] : {};
					Ti.Filesystem.getFile(Ti.Filesystem.applicationDataDirectory+'/data/'+currentTemplateName+'/'+currentFormName).write(JSON.stringify(entryData));
					self.renderForm();
					renderView.getParent().remove(renderView);
				}
				// otherwise alert about it
				else {
					alert("You must fill out at least the "+formDefinition.fields[formDefinition.id].label+" field.");
				}
			}
		);
		var titleLabel = Ti.UI.createLabel({
				top: 13,
				left: 100,
				width: 120,
				textAlign: 'center',
				text: (currentDatasetIndex == entryData.length) ? '[ new ]' : '['+(currentDatasetIndex+1)+' of '+entryData.length+']',
				color: '#ffffff'
			});
			
		renderView.add(titleLabel);
		renderView.add(closeBtn);
		renderView.add(nextBtn);
		var groupViews = [];
		
		var tabMenu = Ti.UI.createView({
			bottom: 0,
			height: "10%",
			width: "100%",
			zIndex: 9
		});
		
		var menuItemWidth = parseInt(100 / formDefinition.groups.length);
			
		for (i in formDefinition.groups){
			if (! formDefinition.groups[i].toplevel) {
				continue;
			}
			var currGroup = formDefinition.groups[i];
			var currGroupView = Ti.UI.createView({
				top: "10%",
				width: "100%",
				height: (formDefinition.groups.length > 1) ? "80%" : "90%",
				backgroundColor: '#000000',
				zIndex: (i==0) ? 2 : 1
			});
			groupViews.push(currGroupView);
			var menuItem = null;
			if (i==0){
				menuItem = Ti.UI.createLabel({
					text: currGroup.label,
					width: "50%",
					color: '#0088CC',
					height: "100%",
					textAlign: 'center',
					borderColor: '#000000',
					backgroundColor: '#222222',
					left: 0,
					bound: i
				});
			} else {
				menuItem = Ti.UI.createLabel({
					text: currGroup.label,
					width: menuItemWidth + "%",
					textAlign: 'center',
					color: '#ffffff',
					borderColor: '#000000',
					height: "100%",
					left: (i * menuItemWidth)+"%",
					backgroundGradient: {
						type: 'linear',
				        startPoint: { x: '50%', y: '0%' },
				        endPoint: { x: '50%', y: '100%' },
				        colors:['#444444', '#222222']
			        },
			       	bound: i
				});
			}
			menuItem.addEventListener('click', function(){
				for (i=0;i<groupViews.length;i++){
					if (i==this.bound){
						groupViews[i].zIndex = 2;
						tabMenu.children[i].color = '#0088CC';
						tabMenu.children[i].backgroundColor = '#222222';
						tabMenu.children[i].backgroundGradient = {};
					} else {
						groupViews[i].zIndex = 1;
						tabMenu.children[i].color = '#ffffff';
						tabMenu.children[i].backgroundColor = null;
						tabMenu.children[i].backgroundGradient = {
							type: 'linear',
					        startPoint: { x: '50%', y: '0%' },
					        endPoint: { x: '50%', y: '100%' },
					        colors:['#444444', '#222222']
				        };
					}
				}
			});
			tabMenu.add(menuItem);
			
			var tabScroll = Ti.UI.createScrollView();
			currGroupView.add(tabScroll);
			
			var currTop = 0;
			
			// iterate through the fields of the form
			// the switch statement handles the different form types
			for (h in currGroup.fields) {
				var currField = currGroup.fields[h];
				switch (currField.type) {
					case 'text':
						var textLabel = Ti.UI.createLabel({
							color:'#ffffff',
							text: currField.label,
							left: buttonSideMargin,
							top: currTop,
							height:'auto',
							width:'auto'
						});
						
						tabScroll.add(textLabel);
						
						currTop += 30;
						
						var textField = Ti.UI.createTextField({
							borderStyle: Ti.UI.INPUT_BORDERSTYLE_ROUNDED,
							color: '#000000',
							top: currTop,
							left: buttonSideMargin,
							width: 300,
							value: currentDataset[currField.label] ? currentDataset[currField.label] : (currField.value ? currField.value : ''),
							height: 'auto',
							bound: [i,h]
						});
						textField.addEventListener('change', function(e){
							currentDataset[formDefinition.groups[this.bound[0]].fields[this.bound[1]]] = this.value;
						});
						
						tabScroll.add(textField);
						if (h==0){
							textField.focus();
							currentControl = textField;
						}
						
						currTop += 40;
					break;
					case 'geolocation':
						var textLabel = Ti.UI.createLabel({
							color:'#ffffff',
							text: currField.label,
							left: buttonSideMargin,
							top: currTop,
							height:'auto',
							width:'auto'
						});
						
						tabScroll.add(textLabel);
						currTop += 30;
						
						var textField = Ti.UI.createTextField({
							borderStyle: Ti.UI.INPUT_BORDERSTYLE_ROUNDED,
							color: '#000000',
							top: currTop,
							left: buttonSideMargin,
							width: 220,
							value: currentDataset[currField.label] ? currentDataset[currField.label] : (currField.value ? currField.value : ''),
							height: 'auto',
							bound: [i,h]
						});
						textField.addEventListener('change', function(e){
							currentDataset[formDefinition.groups[this.bound[0]].fields[this.bound[1]]] = this.value;
						});
						
						tabScroll.add(textField);
						
						var locationButton = Ti.UI.createButton({
							title: 'get',
					 	 	top: currTop,
							left: 240,
							width: 65,
							height: 30,
							bound: textField
						});
						formComponents.styleButton(locationButton);									  
						tabScroll.add(locationButton);
						
						if (h==0){
							currentControl = locationButton;
						}
						
						locationButton.addEventListener('click', function(e){
							var loc = Ti.Geolocation;
							loc.purpose = 'Your current location to be filled into the form.';
							loc.getCurrentPosition(function(e2){
								if (e2.success) {
									locationButton.bound.value = e2.coords.latitude.toFixed(5) + ' lat, ' + e2.coords.longitude.toFixed(5) + ' lon';
								} else {
									alert(e2.error);	
								}
							});
						});
						currTop += 40;
					break;
					case 'image':
						var textLabel = Ti.UI.createLabel({
							color:'#ffffff',
							text: currField.label,
							left: buttonSideMargin,
							top: currTop,
							height:'auto',
							width:'auto'
						});
						
						tabScroll.add(textLabel);
						currTop += 20;
						
						var cameraButton = Ti.UI.createButton({
							title: 'take picture',
							width: 100,
							height: 30,
							top: currTop,
							left: 200,
						});
						formComponents.styleButton(cameraButton);									
						tabScroll.add(cameraButton);
						
						currTop += 60;
						
						var imageView = Titanium.UI.createImageView({
										image: currentDataset[currField.label] ? currentDataset[currField.label] : currField.value,
										width: 'auto',
										top: currTop,
										bound: [i,h]
									});
						tabScroll.add(imageView);
						
						cameraButton.addEventListener('click', function(e){
							Ti.Media.showCamera({
								mediaTypes: [ Ti.Media.MEDIA_TYPE_PHOTO ],
								saveToPhotoGallery: true,
								success: function(e){
									imageView.image = e.media;
									currentDataset[formDefinition.groups[imageView.bound[0]].fields[imageView.bound[1]]] = e.media;
								},
								error: function(e){
									alert('an error occurred while taking the picture');
									alert(JSON.stringify(e));
								},
								cancel: function(e){
									alert('Photo cancelled.');
								}
							});
						});
						
						if (h==0){
							currentControl = cameraButton;
						}
						
						currTop += 305;
						
					break;
					case 'list':
						if (currField.validation.match(/^cv-/)) {
							var validationType = currField.validation.substr(3);
							var cv = controlledVocabularies[validationType];
							var textLabel = Ti.UI.createLabel({
								color:'#ffffff',
								text: currField.label,
								left: buttonSideMargin,
								top: currTop,
								height:'auto',
								width:'auto'
							});
						
							tabScroll.add(textLabel);
						
							currTop += 30;
							
							// select box
							var tr = Ti.UI.create2DMatrix();
							tr = tr.rotate(90);
 
							var drop_button =  Ti.UI.createButton({
								style:Ti.UI.iPhone.SystemButton.DISCLOSURE,
								transform:tr
							});
								
							var textField = Ti.UI.createTextField({
  								borderStyle: Ti.UI.INPUT_BORDERSTYLE_ROUNDED,
 								color: '#000000',
								top: currTop,
								left: buttonSideMargin,
								width: 300,
								editable: false,
								value: currentDataset[currField.name] ? currentDataset[currField.name] : (currField.value ? currField.value : ''),
								height: 'auto',
								rightButton:drop_button,
								rightButtonMode:Titanium.UI.INPUT_BUTTONMODE_ALWAYS,
							});
							textField.bound = cv;
							
							var selectView = Ti.UI.createScrollView({
								top: 0,
								backgroundColor: '#000000',
								width: '100%',
								height: '100%',
								zIndex: 3
							});
							textField.addEventListener('click', function(e){
								renderView.add(selectView);
								formComponents.filterSelect({
									view: selectView,
									items: this.bound.terms,
									bound: this,
									defaultValue: textField.value,
								});
							});
							
							tabScroll.add(textField);
													
							currTop += 50;
						} else {
							alert('radio type fields must have a controlled vocabulary validation');
						}
					break;
					case 'boolean':
						var textLabel = Ti.UI.createLabel({
							color:'#ffffff',
							text: currField.label,
							left: buttonSideMargin,
							top: currTop,
							height:'auto',
							width:'auto'
						});
						
						tabScroll.add(textLabel);
						currTop += 30;
						
						var valueSwitch = Ti.UI.createSwitch({ value: currentDataset[currField.label] ? currentDataset[currField.label] : (currField.value ? currField.value : false),
															   bound: [i,h],
															   titleOn:'yes',
															   titleOff:'no',
															   top: currTop });
						valueSwitch.addEventListener('change', function(e){
							currentDataset[formDefinition.groups[this.bound[0]].fields[this.bound[1]]] = this.value;
						});
						
						if (h==0){
							currentControl = valueSwitch;
						}
						
						currTop += 40;
						
						tabScroll.add(valueSwitch);
					break;
					default:
						var textLabel = Ti.UI.createLabel({
							color:'#ffffff',
							text: currField.label,
							left: buttonSideMargin,
							top: currTop,
							height:'auto',
							width:'auto'
						});
						
						tabScroll.add(textLabel);
						
						currTop += 30;
						
						var textField = Ti.UI.createTextField({
							borderStyle: Ti.UI.INPUT_BORDERSTYLE_ROUNDED,
							color: '#000000',
							top: currTop,
							left: buttonSideMargin,
							width: 300,
							value: currentDataset[currField.label] ? currentDataset[currField.label] : (currField.value ? currField.value : ''),
							height: 'auto',
							bound: [i,h]
						});
						textField.addEventListener('change', function(e){
							currentDataset[formDefinition.groups[this.bound[0]].fields[this.bound[1]]] = this.value;
						});
						
						tabScroll.add(textField);
						if (h==0){
							textField.focus();
							currentControl = textField;
						}
						
						currTop += 40;
					break;
					break;
				}
			}
			renderView.add(currGroupView);
		}
		if(formDefinition.groups.length > 1) {
			renderView.add(tabMenu);
		}
		self.add(renderView);
	};

	// first have the user select a form instance
	// from there, each view will set the next view
	self.showFormInstanceSelect();
	
				
	return self;
}

module.exports = FormView;