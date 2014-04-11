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
	for(var i=0;i<instanciatedTemplates.length;i++){
		var currentFormInstances = Ti.Filesystem.getFile(Ti.Filesystem.applicationDataDirectory+'/data', instanciatedTemplates[i]).getDirectoryListing();
		for (var h=0;h<currentFormInstances.length;h++){
			formInstances.push(currentFormInstances[h] + ' [' + instanciatedTemplates[i] + ']');
		}
	}
	
	//render appropriate components based on the platform and form factor
	var osname = Ti.Platform.osname,
		version = Ti.Platform.version,
		maxHeight = Ti.Platform.displayCaps.platformHeight,
		maxWidth = Ti.Platform.displayCaps.platformWidth;
	
	//considering tablet to have one dimension over 900px
	var isTablet = osname === 'ipad' || (osname === 'android' && (maxWidth > 899 || maxHeight > 899));
	var isAndroid = false;
	if (osname === 'android') {
		isAndroid = true;
	}

	// initialize variables that hold the current form-definition, required cvs and the entered data
	var formDefinition = {};
	var controlledVocabularies = {};
	for (var i=0;i<cvFiles.length;i++){
		var cv = JSON.parse(Ti.Filesystem.getFile(Ti.Filesystem.applicationDataDirectory+'/cvs/'+cvFiles[i]).read().text);
		controlledVocabularies[cv.label] = cv;
	}
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
	var backTitle        = 'back';
	var minButtonHeight  = 35;
	var minButtonWidth   = 120;
	var globalLineHeight = 40;
	var labelFont = {fontSize: 25 };
	
	if (isTablet) {
		searchFieldWidth = 400;
		minButtonHeight  = 85;
		minButtonWidth   = 200;
		globalLineHeight = 60;	
	}

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
			font: labelFont,
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
		for (var i=0;i<fs.length;i++){
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
		
		var currentTemplateInstances = Ti.Filesystem.getFile(Ti.Filesystem.applicationDataDirectory+'/data').getDirectoryListing();
		var fs = formComponents.filterSelect({ view: templateSelectView, items: templateFiles });
		for (var i=0;i<fs.length;i++){
			fs[i].bound = i;
			fs[i].addEventListener('click', function(){
				currentTemplateName = templateFiles[this.bound];
				var dialog = formComponents.alertDialog({
					title: 'Enter form name'
				});
				dialog.addEventListener('click', function(e){
					if(e.index==0){
						for (var i=0;i<currentTemplateInstances.length;i++){
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
			width: minButtonWidth,
			height: minButtonHeight,
			title: 'create',
			left: 220
		});
		formComponents.styleButton(newButton);
		newButton.addEventListener('click',function(e){
			// check if the chosen name is unique
			for (var i=0;i<currentTemplateInstances.length;i++){
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
		for (var i=1;i<fs.length;i++){
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
			font: labelFont,
			width: 'auto',
			height: 'auto',
			color: '#ffffff'
		});
		editorView.add(titleLabel);

		var buttons = formComponents.buttonMenu(['spacer','general properties','groups','export to email','export to MG-RAST', 'spacer2', backTitle]);
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
		buttons['export to email'].addEventListener('click',function(){
			var emailDialog = Ti.UI.createEmailDialog();
			emailDialog.subject = "Metadata Template Export: "+currentTemplateName;
			emailDialog.toRecipients = [];
			emailDialog.messageBody = "Metadata Template Export of "+currentTemplateName+"\n\nThe template is attached as a JSON file";
			var f = Ti.Filesystem.getFile(Ti.Filesystem.applicationDataDirectory+'/templates/'+currentTemplateName);
			emailDialog.addAttachment(f);
			emailDialog.open();
		});
		editorView.add(buttons['export to email']);
		buttons['export to MG-RAST'].addEventListener('click',function(){
			var shockURL = "http://140.221.84.144:8000/node";
			var client = Ti.Network.createHTTPClient({
		     	onload : function(e) {
		     		var result = JSON.parse(this.responseText);
		     		if (result.error) {
		     			alert(result.error);
		     		} else {
			     		var templateURL = "http://api.metagenomics.anl.gov/validate/template/"+result.data.id;
						var client2 = Ti.Network.createHTTPClient({
					     	onload : function(e) {
					     		result = JSON.parse(this.responseText);
					     		if (result.error) {
					     			alert(result.error);
					     		} else {
					     			alert('your template was posted successfully');
					     		}
						    },
					     	onerror : function(e) {
					         	alert('error: '+e.error);
								templateView.getParent().remove(templateView);
					     	},
					     	timeout : 5000  // in milliseconds
						 });
						 // Prepare the connection.
				 		client2.open("GET", templateURL);
				 		// Send the request.
				 		client2.send();
			 		}
		    },
	     	onerror : function(e) {
	         	alert('error: '+e.error);
				templateView.getParent().remove(templateView);
	     	},
	     	timeout : 5000  // in milliseconds
		 });
		 
			 
		 // create a header
		 var boundary = '----12345568790';  
		 var header = "--" + boundary + "\r\n";  
		 header += "Content-Disposition: form-data; name=\"attributes\";";  
		 header += "filename=\"" + currentTemplateName + "\"\r\n"; 
		 header += "Content-Type: application/octet-stream\r\n\r\n";
		 
		 var fullContent = header + JSON.stringify(formDefinition) + "\r\n--" + boundary + "--"; 
		 
		 // Prepare the connection.
 		 client.open("POST", shockURL);
 		 var token = "un=paczian|tokenid=07806e3c-2cfd-11e3-bb07-12313809f035|expiry=1412431101|client_id=paczian|token_type=Bearer|SigningSubject=https://nexus.api.globusonline.org/goauth/keys/07c63674-2cfd-11e3-bb07-12313809f035|sig=3d6d0aa4cfc14ea2406105257cb2e76ec91fa7c32ccf137e37ec2f5e3313639f3e8c2bfe4fbbae4c8bb91de8c66498251986cfe9d2e3336e736bd48cfbe9b5c3f16baabcf1b2801cf7858b0a275e1e7b275dc7c5576ef7c5b47016157de691fddc2de759af84b2390989d3350464daac59352f4de9baf76b723bfc389711a33a";
 		 client.setRequestHeader("Authorization", "OAuth "+token);
 		 client.setRequestHeader("Content-type", "multipart/form-data; boundary=\"" + boundary + "\"");  
   		 client.setRequestHeader("Connection", "close");  

 		 // Send the request.
 		 client.send(fullContent);
		});
		editorView.add(buttons['export to MG-RAST']);
		buttons[backTitle].addEventListener('click',function(){
			editorView.getParent().remove(editorView);
		});
		editorView.add(buttons[backTitle]);

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
			top: 0,
			font: labelFont,
			width: 'auto',
			height: 'auto',
			color: 'white',
			left: buttonSideMargin
		});
		listView.add(titleLabel);
	
		var okButton = Ti.UI.createButton({
			width: minButtonWidth,
			height: minButtonHeight,
			top: buttonTopMargin,
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
		for (var i in formDefinition.groups){
			if (formDefinition.groups.hasOwnProperty(i)) {
				var label = Ti.UI.createLabel({
					color: '#000000',
					font: labelFont,
					text: formDefinition.groups[i].label,
					height:'auto',
					width:'auto'
				});
				var row = Titanium.UI.createTableViewRow({
					height:minButtonHeight,
					backgroundColor: '#ffffff',
					bound: i
				});
				row.addEventListener('click', function(){
					currentGroup = formDefinition.groups[this.bound];
					self.editGroup();
				});
				row.add(label);
				array.push(row);
			}
		}
		
		var newText = Ti.UI.createTextField({
			color: '#000000',
			hintText: 'new group name',
			height: minButtonHeight,
			width: maxWidth - 20 - (minButtonWidth * 2),
			left: buttonSideMargin,
			top: buttonTopMargin,
		    borderStyle: Ti.UI.INPUT_BORDERSTYLE_ROUNDED
		});
		var newTextButton = Ti.UI.createButton({
			width: minButtonWidth,
			height: minButtonHeight,
			title: 'create',
			right: buttonSideMargin + 10 + minButtonWidth,
			top: buttonTopMargin
		});
		newTextButton.addEventListener('click',function(){
			if (newText.value.length){
				if (formDefinition.groups.hasOwnProperty(newText.value)) {
					alert('a group of that name already exists in this template');
				} else {
					formDefinition.groups[newText.value] = {
																name: newText.value,
																label: newText.value,
																description: "",
																fields: {},
																subgroups: {},
																madatory: false,
																toplevel: false 
															};
					currentGroup = formDefinition.groups[newText.value];
					Ti.Filesystem.getFile(Ti.Filesystem.applicationDataDirectory+'/templates/'+currentTemplateName).write(JSON.stringify(formDefinition));
					listView.getParent().remove(listView);
					self.editGroup();
				}
			} else {
				alert('you need to enter a name for the group');
			}
		});
		formComponents.styleButton(newTextButton);
		listView.add(newTextButton);
		listView.add(newText);
		
		var tableView = Ti.UI.createTableView({
			top: buttonTopMargin + 10 + minButtonHeight,
			data: array,
			style:Titanium.UI.iPhone.TableViewStyle.GROUPED
		});
			
		listView.add(tableView);
		
		self.add(listView);
	};
	
	self.editGroupProperties = function(){
		var editGroupPropertiesView = Ti.UI.createScrollView({
			top: 0,
			zIndex: 2,
			backgroundColor: '#000000',
			width: '100%',
			height: '100%'
		});
		
		var labellist = formComponents.labelList({view: editGroupPropertiesView, labels: [
			'name',
			'label',
			'description',
			'mandatory',
			'toplevel'
		]});
		
		var cancelButton = Ti.UI.createButton({
			width: minButtonWidth,
			height: minButtonHeight,
			title: 'cancel',
			top: 10,
			left: buttonSideMargin
		});
		cancelButton.addEventListener('click',function(){
			self.templateEditor();
			editGroupPropertiesView.getParent().remove(editGroupPropertiesView);
		});
		formComponents.styleButton(cancelButton);
		
		var okButton = Ti.UI.createButton({
			width: minButtonWidth,
			height: minButtonHeight,
			title: 'store',
			top: 10,
			right: buttonSideMargin
		});
		okButton.addEventListener('click',function(){
			currentGroup.name = nameField.value;
			currentGroup.label = labelField.value;
			currentGroup.description = descriptionField.value;
			currentGroup.toplevel = toplevelField.value ? 1 : 0;
			currentGroup.mandatory = mandatoryField.value ? 1 : 0;
			Ti.Filesystem.getFile(Ti.Filesystem.applicationDataDirectory+'/templates/'+currentTemplateName).write(JSON.stringify(formDefinition));
			alert('changes stored');
			self.editGroup();
			editGroupPropertiesView.getParent().remove(editGroupPropertiesView);
		});
		formComponents.styleButton(okButton);
		
		editGroupPropertiesView.add(cancelButton);
		editGroupPropertiesView.add(okButton);
		
		var nameField = Ti.UI.createTextField({
			borderStyle: Ti.UI.INPUT_BORDERSTYLE_ROUNDED,
			color: '#000000',
			top: labellist.positions[0],
			right: 10,
			width: searchFieldWidth,
			value: currentGroup.name || currentGroup.label,
			height: 'auto'
		});
		editGroupPropertiesView.add(nameField);
		
		var labelField = Ti.UI.createTextField({
			borderStyle: Ti.UI.INPUT_BORDERSTYLE_ROUNDED,
			color: '#000000',
			top: labellist.positions[1],
			right: 10,
			width: searchFieldWidth,
			value: currentGroup.label,
			height: 'auto'
		});
		editGroupPropertiesView.add(labelField);
		
		var descriptionField = Ti.UI.createTextArea({
			borderStyle: Ti.UI.INPUT_BORDERSTYLE_ROUNDED,
			color: '#000000',
			top: labellist.positions[2],
			right: 10,
			width: searchFieldWidth,
			value: currentGroup.description,
			height: 'auto'
		});
		editGroupPropertiesView.add(descriptionField);
		
		var mandatoryField = Ti.UI.createSwitch({
			borderStyle: Ti.UI.INPUT_BORDERSTYLE_ROUNDED,
			color: '#000000',
			top: labellist.positions[3],
			right: 10,
			width: searchFieldWidth,
			value: currentGroup.mandatory ? true : false,
			height: 'auto'
		});
		editGroupPropertiesView.add(mandatoryField);
		
		var toplevelField = Ti.UI.createSwitch({
			borderStyle: Ti.UI.INPUT_BORDERSTYLE_ROUNDED,
			color: '#000000',
			top: labellist.positions[4],
			right: 10,
			width: searchFieldWidth,
			value: currentGroup.toplevel ? true : false,
			height: 'auto'
		});
		editGroupPropertiesView.add(toplevelField);
		
		self.add(editGroupPropertiesView);
	};
	
	self.editGroup = function(){
		var editGroupView = Ti.UI.createScrollView({
			top: 0,
			zIndex: 2,
			backgroundColor: '#000000',
			width: '100%',
			height: '100%'
		});
			
		var titleLabel = Ti.UI.createLabel({
			text: currentGroup.name,
			top: 0,
			font: labelFont,
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
		for (var i in currentGroup.fields){
			if (currentGroup.fields.hasOwnProperty(i)) {
				var label = Ti.UI.createLabel({
					color: '#000000',
					text: currentGroup.fields[i].label || currentGroup.fields[i].name || i,
					font: labelFont,
					height:'auto',
					width:'auto'
				});
				var row = Titanium.UI.createTableViewRow({
					height:minButtonHeight,
					backgroundColor: '#ffffff',
					bound: i
				});
				row.addEventListener('click', function(){
					currentField = currentGroup.fields[this.bound];
					self.editField();
					editGroupView.getParent().remove(editGroupView);
				});
				row.add(label);
				array.push(row);
			}
		}
		
		var smallButton = parseInt(minButtonWidth * 0.7);
		var addNewButton =  Ti.UI.createButton({
			title: 'add field',
			width: smallButton,
			height: minButtonHeight,
			left: buttonSideMargin,
			top: buttonTopMargin
		});
		formComponents.styleButton(addNewButton);
		addNewButton.addEventListener('click', function(e){
			currentField = {
							"name": "new",
							"label": "new",
							"validation": { "type": "none"},
							"description": "",
							"default": "",
							"type": "text"
							};
			currentGroup.fields["new"] = currentField;
			self.editField();
			editGroupView.getParent().remove(editGroupView);
		});
		editGroupView.add(addNewButton);
		
		var editSubgroupsButton =  Ti.UI.createButton({
			title: 'subgroups',
			width: smallButton,
			height: minButtonHeight,
			left: buttonSideMargin + 5 + smallButton,
			top: buttonTopMargin
		});
		formComponents.styleButton(editSubgroupsButton);
		editSubgroupsButton.addEventListener('click', function(e){
			var validGroups = [];
			for (var i in formDefinition.groups) {
				if (formDefinition.groups.hasOwnProperty(i)){
					var hasSubgroups = false;
					for (var h in formDefinition.groups[i].subgroups){
						if (formDefinition.groups[i].subgroups[h]) {
							hasSubgroups = true;
							break;
						}
					}
					if (! hasSubgroups && ! currentGroup.subgroups.hasOwnProperty(i) && currentGroup.name != i){
						validGroups.push(i);
					}
				}
			}
			if (validGroups.length){
				var filterView = Ti.UI.createView({ width: '100%', top: 0, height: '100%', zIndex: 5, backgroundColor: '#000000' });
				self.add(filterView);
				formComponents.filterSelect({ view: filterView, items: validGroups, bound: editGroupView, callback: function(groupName, view) {
						currentGroup.subgroups[groupName] = { label: groupName, mandatory: false, type: "instance" };
						self.editSubgroup(groupName);
						view.getParent().remove(view);
					}
				});
			} else {
				alert('There are no groups available to add. You can only add groups that do not have subgroups to avoid circular references.');
			}
		});
		editGroupView.add(editSubgroupsButton);
		
		var generalGroupProperties =  Ti.UI.createButton({
			title: 'edit properties',
			width: smallButton,
			height: minButtonHeight,
			top: buttonTopMargin,
			left: buttonSideMargin + 10 + (2 * smallButton) 
		});
		formComponents.styleButton(generalGroupProperties);
		generalGroupProperties.addEventListener('click', function(e){
			self.editGroupProperties();
		});
		editGroupView.add(generalGroupProperties);
		
		var delGroup =  Ti.UI.createButton({
			title: 'delete group',
			width: smallButton,
			height: minButtonHeight,
			left: buttonSideMargin + 15 + (smallButton * 3),
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
				    	var groupLength = 0;
				    	for (var i in formDefinition.groups){
				    		if (formDefinition.groups.hasOwnProperty(i)){
				    			groupLength++;	
			    			}	
				    	}
				    	if (groupLength==1){
				    		alert("The last group of a template cannot be deleted.");
				    	} else {
				    		for (var i in formDefinition.groups){
				    			if (formDefinition.groups.hasOwnProperty(i)){
				    				if (formDefinition.groups[i].name == currentGroup.name) {
					    				delete formDefinition.groups[i];
					    				break;
					    			}
					    		}
				    		}
				    		Ti.Filesystem.getFile(Ti.Filesystem.applicationDataDirectory+'/templates/'+currentTemplateName).write(JSON.stringify(formDefinition));
				    		alert("group deleted");
				    		for (var i in formDefinition.groups){
								if (formDefinition.groups.hasOwnProperty(i)){
				    				currentGroup = formDefinition.groups[i];
				    				break;
				    			}
				    		}
				    		
				    		self.groupEditor();
							editGroupView.getParent().remove(editGroupView);
				    	}
				    }
				});
				dialog.show();
		});
		editGroupView.add(delGroup);
		
		var back =  Ti.UI.createButton({
			title: backTitle,
			width: smallButton,
			height: minButtonHeight,
			top: buttonTopMargin,
			left: buttonSideMargin + 20 + (4 * smallButton) 
		});
		formComponents.styleButton(back);
		back.addEventListener('click', function(e){
			Ti.Filesystem.getFile(Ti.Filesystem.applicationDataDirectory+'/templates/'+currentTemplateName).write(JSON.stringify(formDefinition));
			self.groupEditor();
			editGroupView.getParent().remove(editGroupView);
		});
		editGroupView.add(back);
		
		var tableView = Ti.UI.createTableView({
			top: buttonTopMargin + 10 + minButtonHeight,
			data: array,
			style:Titanium.UI.iPhone.TableViewStyle.GROUPED
		});
			
		editGroupView.add(tableView);
		
		self.add(editGroupView);
	};
	
	// show the subgroups of a group for selection
	self.editSubgroups = function(){
		
	};
	
	// edit the properties of a subgroup
	self.editSubgroup = function(groupName){
		var subgroup = currentGroup.subgroups[groupName];
		var propertySelectView = Ti.UI.createView({
			top: 0,
			backgroundColor: '#000000',
			width: '100%',
			height: '100%',
			zIndex: 1
		});
		
		var labellist = formComponents.labelList({view: propertySelectView, labels: [
			'label',
			'mandatory',
			'type'
		]});
		
		var cancelButton = Ti.UI.createButton({
			width: minButtonWidth,
			height: minButtonHeight,
			title: 'cancel',
			top: 10,
			left: buttonSideMargin
		});
		cancelButton.addEventListener('click',function(){
			self.editGroup();
			propertySelectView.getParent().remove(propertySelectView);
		});
		formComponents.styleButton(cancelButton);
		
		var okButton = Ti.UI.createButton({
			width: minButtonWidth,
			height: minButtonHeight,
			title: 'store',
			top: 10,
			right: buttonSideMargin
		});
		okButton.addEventListener('click',function(){
			subgroup.lanel = labelField.value;
			subgroup.mandatory = mandatoryField.value;
			subgroup.type = typeField.value;
			Ti.Filesystem.getFile(Ti.Filesystem.applicationDataDirectory+'/templates/'+currentTemplateName).write(JSON.stringify(formDefinition));
			alert('changes stored');
			self.editGroup();
			propertySelectView.getParent().remove(propertySelectView);
		});
		formComponents.styleButton(okButton);
		
		propertySelectView.add(cancelButton);
		propertySelectView.add(okButton);
		
		var labelField = Ti.UI.createTextField({
			borderStyle: Ti.UI.INPUT_BORDERSTYLE_ROUNDED,
			color: '#000000',
			top: labellist.positions[0],
			right: 10,
			width: searchFieldWidth,
			value: subgroup.label,
			height: 'auto'
		});
		propertySelectView.add(labelField);
		
		var mandatoryField = Ti.UI.createTextField({
			borderStyle: Ti.UI.INPUT_BORDERSTYLE_ROUNDED,
			color: '#000000',
			top: labellist.positions[1],
			right: 10,
			width: searchFieldWidth,
			value: subgroup.mandatory,
			height: 'auto'
		});
		propertySelectView.add(mandatoryField);
		
		var typeField = Ti.UI.createTextArea({
			borderStyle: Ti.UI.INPUT_BORDERSTYLE_ROUNDED,
			color: '#000000',
			top: labellist.positions[2],
			right: 10,
			width: searchFieldWidth,
			value: subgroup.type,
			height: 'auto'
		});
		propertySelectView.add(typeField);
		
		self.add(propertySelectView);
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
		
		var labellist = formComponents.labelList({view: propertySelectView, labels: [
			'name',
			'label',
			'description'
		]});
		
		var cancelButton = Ti.UI.createButton({
			width: minButtonWidth,
			height: minButtonHeight,
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
			width: minButtonWidth,
			height: minButtonHeight,
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
			right: 10,
			width: searchFieldWidth,
			value: formDefinition.name || formDefinition.label,
			height: 'auto'
		});
		propertySelectView.add(nameField);
		
		var labelField = Ti.UI.createTextField({
			borderStyle: Ti.UI.INPUT_BORDERSTYLE_ROUNDED,
			color: '#000000',
			top: labellist.positions[1],
			right: 10,
			width: searchFieldWidth,
			value: formDefinition.label,
			height: 'auto'
		});
		propertySelectView.add(labelField);
		
		var descriptionField = Ti.UI.createTextArea({
			borderStyle: Ti.UI.INPUT_BORDERSTYLE_ROUNDED,
			color: '#000000',
			top: labellist.positions[2],
			right: 10,
			width: searchFieldWidth,
			value: formDefinition.description,
			height: 'auto'
		});
		propertySelectView.add(descriptionField);
		
		self.add(propertySelectView);
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
		
		var field = currentField;
		
		var labellist = formComponents.labelList({view: scrollView, labels: [
			'name',
			'label',
			'type',
			'validation type',
			'validation',
			'default value',
			'description'			
		]});
		
		var nameField = Ti.UI.createTextField({
			borderStyle: Ti.UI.INPUT_BORDERSTYLE_ROUNDED,
			color: '#000000',
			top: labellist.positions[0],
			right: 10,
			width: searchFieldWidth,
			value: field.name || field.label,
			height: 'auto'
		});
		scrollView.add(nameField);
		
		var labelField = Ti.UI.createTextField({
			borderStyle: Ti.UI.INPUT_BORDERSTYLE_ROUNDED,
			color: '#000000',
			top: labellist.positions[1],
			right: 10,
			width: searchFieldWidth,
			value: field.label || field.name,
			height: 'auto'
		});
		scrollView.add(labelField);
		
		var typeField = Ti.UI.createButton({
			borderStyle: Ti.UI.INPUT_BORDERSTYLE_ROUNDED,
			color: '#000000',
			top: labellist.positions[2],
			right: 10,
			width: searchFieldWidth,
			title: field.type,
			height: 'auto'
		});
		typeField.addEventListener('click',function(){
			formComponents.select({
				items: fieldTypes,
				defaultValue: field.type,
				rootWindow: self,
				callback: function(value){
					typeField.title = value;
				}
			});
		});
		scrollView.add(typeField);
		
		var validationTypeField = Ti.UI.createButton({
			borderStyle: Ti.UI.INPUT_BORDERSTYLE_ROUNDED,
			color: '#000000',
			top: labellist.positions[3],
			right: 10,
			width: searchFieldWidth,
			title: field.validation.type,
			height: 'auto'
		});
		validationTypeField.addEventListener('click',function(){
			formComponents.select({
				items: [ 'none', 'cv', 'regular-expression' ],
				rootWindow: self,
				defaultValue: field.validation.type,
				callback: function(value){
					validationTypeField.title = value;
					if (value == "regular-expression"){
						validationField.enabled = true;
						validationFieldButton.visible = false;
					} else if (value == "none") {
						validationField.enabled = false;
						validationFieldButton.visible = false;
					} else {
						validationFieldButton.visible = true;
					}
				}
			});
		});
		scrollView.add(validationTypeField);
		
		var validationFieldButton = Ti.UI.createButton({
			borderStyle: Ti.UI.INPUT_BORDERSTYLE_ROUNDED,
			color: '#000000',
			top: labellist.positions[4],
			right: 10,
			width: searchFieldWidth,
			opacity: 1.0,
			title: field.validation.type == 'cv' ? field.validation.value : "",
			height: 'auto',
			visible: field.validation.type == 'cv' ? true : false,
			zIndex: 2
		});
		validationFieldButton.addEventListener('click',function(){
			var currcvs = [];
			for (var i in controlledVocabularies){
				if (controlledVocabularies.hasOwnProperty(i)){
					currcvs.push(i);
				}
			}
			formComponents.select({
				items: currcvs,
				rootWindow: self,
				callback: function(value){
					validationFieldButton.title = value;
				}
			});
		});
		scrollView.add(validationFieldButton);
		var validationField = Ti.UI.createTextField({
			borderStyle: Ti.UI.INPUT_BORDERSTYLE_ROUNDED,
			color: '#000000',
			top: labellist.positions[4],
			right: 10,
			width: searchFieldWidth,
			opacity: 1.0,
			zIndex: 1,
			enabled: field.validation.type == 'none' ? false : true,
			value: field.validation.type == 'none' ? "" : field.validation.value,
			height: 'auto',
		});
		scrollView.add(validationField);
		
		var defaultField = Ti.UI.createTextField({
			borderStyle: Ti.UI.INPUT_BORDERSTYLE_ROUNDED,
			color: '#000000',
			top: labellist.positions[5],
			right: 10,
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
			top: labellist.positions[6],
			right: 10,
			width: searchFieldWidth,
			fontSize: 24,
			value: field.description,
			height: 100
		});
		scrollView.add(descriptionField);
		
		var cancelButton = Ti.UI.createButton({
			width: minButtonWidth,
			height: minButtonHeight,
			title: "cancel",
			top: 5,
			left: buttonSideMargin
		});
		formComponents.styleButton(cancelButton);
		cancelButton.addEventListener('click',function(){
			self.editGroup();
			scrollView.getParent().remove(scrollView);
		});
		scrollView.add(cancelButton);
		
		var okButton = Ti.UI.createButton({
			width: minButtonWidth,
			height: minButtonHeight,
			title: 'ok',
			top: 5,
			right: buttonSideMargin
		});
		okButton.addEventListener('click',function(){
			if (nameField.value != currentField.name) {
				var newField = { "name": nameField.value };
				delete currentGroup.fields[currentField.name];
				currentField = newField;
				currentGroup.fields[currentField.name] = currentField;
			}
			currentField.label = labelField.value;
			currentField.description = descriptionField.value;
			currentField.value = defaultField.value;
			if (validationTypeField.title == "none"){
				currentField.validation = { "type": "none" };
			} else if (validationTypeField.title == "regular-expression"){
				currentField.validation = { "type": "regular-expression",
											"value": validationField.value };
			} else {
				currentField.validation = { "type": "cv",
											"value": validationFieldButton.title };
			}
			currentField.type = typeField.title;
			Ti.Filesystem.getFile(Ti.Filesystem.applicationDataDirectory+'/templates/'+currentTemplateName).write(JSON.stringify(formDefinition));
			alert('updated');
			self.editGroup();
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
		currentDataset = entryData[0] || self.initializeDataset();
		currentDatasetIndex = 0;
		entryData[0] = currentDataset;
		
		// now iterate through the form to check for CVs
		var missingCVs = [];
		for (var i in formDefinition.fields){
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
		for (var i=0;i<templateFiles.length;i++){
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
			width: minButtonWidth,
			height: minButtonHeight,
			top: buttonTopMargin,
			left: buttonSideMargin,
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
			font: labelFont,
			left: buttonSideMargin,
			width: 'auto',
			height: 'auto',
			color: '#ffffff'
		});
		manageTemplateView.add(titleLabel);
		
		var array = [];
		
		var addNewButton =  Ti.UI.createButton({
			title: 'new',
			width: minButtonWidth,
			height: minButtonHeight,
			right: buttonSideMargin + minButtonWidth + 5,
			top: buttonTopMargin
		});
		formComponents.styleButton(addNewButton);
		addNewButton.addEventListener('click', function(e){
			var dialog = formComponents.alertDialog({
				title: 'Enter template name'
			});
			dialog.addEventListener('click', function(e){
				if(e.index==0){
					for (var i=0;i<templateFiles.length;i++){
						if(templateFiles[i]==e.text){
							alert('a template with that name already exists');
							dialog.show();
							return false;
						}
					}
					currentTemplateName = e.text;
					formDefinition = { "name": currentTemplateName,
									   "cvs": {},
									   "label": currentTemplateName,
									   "description": "a custom form",
									   "groups": [{"name": "main", "label":"main","description":"main group","fields":[],"toplevel": 1,"mandatory":1}]};
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
			width: minButtonWidth,
			height: minButtonHeight,
			top: buttonTopMargin,
			right: buttonSideMargin
		});
		formComponents.styleButton(syncButton);
		syncButton.addEventListener('click', function(e){
			/*
	 		 This section needs to be modified to load a list of all available templates on the server versus only the mgrast default one
	 		 */ 
			var templateURL = "http://140.221.84.144:8000/node/2736be4f-91b9-41d9-ae3d-d2e958f582fd";
			var client = Ti.Network.createHTTPClient({
		     	onload : function(e) {
		     		var response = JSON.parse(this.responseText).data.attributes;
	     			Ti.Filesystem.getFile(Ti.Filesystem.applicationDataDirectory+'/templates/'+response.name).write(JSON.stringify(response));
					var tdir = Ti.Filesystem.getFile(Ti.Filesystem.applicationDataDirectory+'/data/',response.name);
					if (! tdir.exists()) {
			 		   tdir.createDirectory();
					}
					var exists = false;
					for (var i=0;i<templateFiles.length;i++) {
						if (templateFiles[i] == response.name) {
							exists = true;
							break;
						}
					}
					if (! exists) {
						templateFiles.push(response.name);
					}
					alert('updated templates');
					self.manageTemplates();
					manageTemplateView.getParent().remove(manageTemplateView);
			    },
		     	onerror : function(e) {
		         	alert('error: '+e.error);
		     	},
		     	timeout : 5000  // in milliseconds
			 });
			 // Prepare the connection.
	 		client.open("GET", templateURL);
	 		// Send the request.
	 		client.send();
		});
		
		manageTemplateView.add(syncButton);
		
		var sortedTemplates = templateFiles.sort();
		for (var i=0;i<sortedTemplates.length;i++){
			var label = Ti.UI.createLabel({
				color: '#000000',
				text: sortedTemplates[i],
				font: labelFont,
				height:'auto',
				width:'auto'
			});
			var row = Titanium.UI.createTableViewRow({
				height:minButtonHeight,
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
			top: minButtonHeight + buttonTopMargin + 10,
			data: array,
			style:Titanium.UI.iPhone.TableViewStyle.GROUPED
		});
			
		manageTemplateView.add(tableView);
		
		self.add(manageTemplateView);
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
			width: minButtonWidth,
			height: minButtonHeight,
			top: buttonTopMargin,
			left: buttonSideMargin,
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
			font: labelFont,
			left: buttonSideMargin,
			width: 'auto',
			height: 'auto',
			color: '#ffffff'
		});
		manageCVView.add(titleLabel);
		
		var array = [];
		
		var addNewButton =  Ti.UI.createButton({
			title: 'new',
			width: minButtonWidth,
			height: minButtonHeight,
			top: buttonTopMargin,
			right: buttonSideMargin + 5 + minButtonWidth
		});
		formComponents.styleButton(addNewButton);
		addNewButton.addEventListener('click', function(e){
			var dialog = formComponents.alertDialog({
				title: 'Enter CV name',
			});
			dialog.addEventListener('click', function(e){
				if(e.index==0){
					for (var i=0;i<cvFiles.length;i++){
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
			width: minButtonWidth,
			height: minButtonHeight,
			top: buttonTopMargin,
			right: buttonSideMargin
		});
		formComponents.styleButton(syncButton);
		syncButton.addEventListener('click', function(e){
			var cvURL = "http://api.metagenomics.anl.gov/metadata/cv";
			var client = Ti.Network.createHTTPClient({
		     	onload : function(e) {
		     		var response = JSON.parse(this.responseText);
		     		var serverCVlist = [];
		     		if (response.hasOwnProperty("select")){
		     			for (var i in response.select){
		     				if (response.select.hasOwnProperty(i)){
		     					var existing = false;
		     					for (var h=0;h<cvFiles.length;h++){
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
		     		for (var i=0;i<serverCVlist.length;i++){
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
		     		self.manageCVs();
					manageCVView.getParent().remove(manageCVView);
			    },
		     	onerror : function(e) {
		         	alert('error: '+e.error);
		     	},
		     	timeout : 5000  // in milliseconds
			 });
			 // Prepare the connection.
	 		client.open("GET", cvURL);
	 		// Send the request.
	 		client.send();
		});
		
		manageCVView.add(syncButton);
		
		var sortedCVs = cvFiles.sort();
		for (var i=0;i<sortedCVs.length;i++){
			var label = Ti.UI.createLabel({
				color: '#000000',
				text: sortedCVs[i],
				font: labelFont,
				height:'auto',
				width:'auto'
			});
			var row = Titanium.UI.createTableViewRow({
				height:minButtonHeight,
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
			top: buttonTopMargin + minButtonHeight + 10,
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
		for (var i=0;i<terms.length;i++){
			thash[terms[i]] = true;
		}
		var fs = formComponents.filterSelect({ cancelTitle: backTitle, cancel: self.manageCVs, view: cvView, items: terms, skipRows: 1 });
		var newForm = Ti.UI.createTextField({
		    width: maxWidth - minButtonWidth - 20,
		    left: buttonSideMargin,
		    top: 10 + minButtonHeight,
		    hintText: 'enter new term',
		    height: minButtonHeight,
		    color: '#000000',
		    borderStyle: Ti.UI.INPUT_BORDERSTYLE_ROUNDED
		});
		var newButton = Ti.UI.createButton({
			width: minButtonWidth,
			height: minButtonHeight,
			title: 'add',
			right: buttonSideMargin,
			top: 10 + minButtonHeight
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
		for (var i=0;i<fs.length;i++){
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
			font: labelFont,
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
		for (var i=0;i<entryData.length;i++){
			items.push(entryData[i]['id']);
		}
		
		var fs = formComponents.filterSelect({ view: datasetSelectView, items: items });
		for (var i=0;i<fs.length;i++){
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
			font: labelFont,
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
			var url = "http://api.metagenomics.anl.gov/metagenome/mgm4440026.3?verbosity=full";
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
	
	// create an empty dataset for the current template
	self.initializeDataset = function(){
		var dataset = {};
		
		for (var i in formDefinition.groups){
			if (formDefinition.groups.hasOwnProperty(i)){
				if (formDefinition.groups[i].toplevel){
					dataset[i] = null;
					dataset[i] = self.addSubgroupToDataset(dataset[i], i);
					dataset.id = i + " " + entryData.length;
				}
			}
		}
		return dataset;
	};
	
	// create a subgroup entry into a group dataset
	self.addSubgroupToDataset = function(container, subgroup){
		if (formDefinition.groups.hasOwnProperty(subgroup)){
			var sg = {};
			for (var h in formDefinition.groups[subgroup].fields){
				if (formDefinition.groups[subgroup].fields.hasOwnProperty(h)){
					sg[h] = formDefinition.groups[subgroup].fields[h]['default'] || "";
				}
			}
			for (var h in formDefinition.groups[subgroup].subgroups){
				if (formDefinition.groups[subgroup].subgroups.hasOwnProperty(h)){
					if (formDefinition.groups[subgroup].subgroups[h].type == 'list') {
						sg[formDefinition.groups[subgroup].subgroups[h].label] = [];
					} else {
						sg[formDefinition.groups[subgroup].subgroups[h].label] = null;
					}
				}
			}
			if (container){
				container.push(sg);
			} else {
				container = sg;
			}
		} else {
			alert('subgroup '+subgroup+' does not exist in template');
		}
		return container;
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
 
 		var navView = Ti.UI.createView({
 			zIndex: 3,
 			width: maxWidth - (minButtonWidth * 2) - 10,
 			height: minButtonHeight + 15,
 			top: 0,
 			left: minButtonWidth + 5,
 			backgroundColor: '#000000'
 		});
 		renderView.add(navView);
 
		var closeBtn = Ti.UI.createButton({
			width: minButtonWidth,
			height: minButtonHeight,
			title: 'save',
			left: buttonSideMargin,
			top: 10
		});
		formComponents.styleButton(closeBtn);
		closeBtn.addEventListener('click',
			function(e) {
				Ti.Filesystem.getFile(Ti.Filesystem.applicationDataDirectory+'/data/'+currentTemplateName+'/'+currentFormName).write(JSON.stringify(entryData));
				renderView.getParent().remove(renderView);
			}
		);
		
		var nextBtn = Ti.UI.createButton({
			width: minButtonWidth,
			height: minButtonHeight,
			title: 'new',
			right: buttonSideMargin,
			top: 10
		});
		formComponents.styleButton(nextBtn);
		nextBtn.addEventListener('click',
			function(e){
				currentDatasetIndex = entryData.length;
				currentDataset = self.initializeDataset();
				entryData[currentDatasetIndex] = currentDataset;				
			}
		);

		renderView.add(closeBtn);
		//renderView.add(nextBtn);
		var groupViews = [];
		
		var tabMenu = Ti.UI.createView({
			bottom: 0,
			height: "10%",
			width: "100%",
			zIndex: 9
		});
		
		var menuItemWidth = parseInt(100 / formDefinition.groups.length);
		var toplevelGroups = [];
		for (var i in formDefinition.groups){
			if (formDefinition.groups.hasOwnProperty(i)) {
				if (formDefinition.groups[i].toplevel) {					
					toplevelGroups.push(formDefinition.groups[i]);
				}
			}
		}			
		for (var i=0;i<toplevelGroups.length;i++) {
			var currGroup = toplevelGroups[i];
			var currGroupView = Ti.UI.createView({
				top: 15 + minButtonHeight,
				width: "100%",
				height: (toplevelGroups.length > 1) ? "80%" : "90%",
				backgroundColor: '#000000',
				zIndex: (i==0) ? 2 : 1
			});
			groupViews.push(currGroupView);
			var menuItem = null;
			if (i==0){
				currentGroup = currGroup;
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
				for (var h=0;h<groupViews.length;h++){
					if (h==this.bound){
						groupViews[h].zIndex = 2;
						tabMenu.children[h].color = '#0088CC';
						tabMenu.children[h].backgroundColor = '#222222';
						tabMenu.children[h].backgroundGradient = {};
					} else {
						groupViews[h].zIndex = 1;
						tabMenu.children[h].color = '#ffffff';
						tabMenu.children[h].backgroundColor = null;
						tabMenu.children[h].backgroundGradient = {
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
			
			self.renderGroup(tabScroll, currGroup, navView, null, currentDataset[toplevelGroups[i].name]);
			
			currGroupView.add(tabScroll);
			
			renderView.add(currGroupView);
		}
		if(toplevelGroups.length > 1) {
			renderView.add(tabMenu);
		}
		self.add(renderView);
	};

	self.renderGroup = function(tabScroll, currGroup, navView, parentGroup, dataStore){
		if (parentGroup) {
			var parentButton = Ti.UI.createButton({
				width: maxWidth - (2 * minButtonWidth) - 20,
				height: minButtonHeight,
				title: parentGroup,
				left: 5,
				top: 10,
				bound: tabScroll
			});
			formComponents.styleButton(parentButton);
			parentButton.addEventListener('click',
				function(e) {
					this.bound.getParent().getParent().remove(this.bound.getParent());
					this.getParent().remove(this);
				}
			);
			navView.add(parentButton);
		}
		
		// check if this is a list or and instance
		if (dataStore.length && parentGroup) {
			var groupInstances = [];
			for (var k=0;k<dataStore.length;k++){
				var item = dataStore[k];
				var label = Ti.UI.createLabel({
					color: '#000000',
					text: item.name ? item.name : formDefinition.groups[parentGroup].subgroups[currGroup.name].label + " " + k, 
					font: labelFont,
					height:'auto',
					width:'auto'
				});
				var row = Titanium.UI.createTableViewRow({
					height:minButtonHeight,
					backgroundColor: '#ffffff',
					bound: k
				});
				row.addEventListener('click', function(){
					self.renderGroupContent(tabScroll, currGroup, navView, parentGroup, dataStore[this.bound]);
					groupInstanceView.getParent().remove(groupInstanceView);
				});
				row.add(label);
				groupInstances.push(row);
			}
			var label = Ti.UI.createLabel({
				color: '#000000',
				text: 'new',
				font: labelFont,
				height:'auto',
				width:'auto'
			});
			var row = Titanium.UI.createTableViewRow({
				height:minButtonHeight,
				backgroundColor: '#ffffff'
			});
			row.addEventListener('click', function(){
				dataStore[dataStore.length] = self.addSubgroupToDataset(dataStore, currGroup.name);
				self.renderGroupContent(tabScroll, currGroup, navView, parentGroup, dataStore[dataStore.length - 1]);
				groupInstanceView.getParent().remove(groupInstanceView);
			});
			row.add(label);
			groupInstances.push(row);
			
			var groupInstanceView = Ti.UI.createTableView({
				zIndex: 5,
				top: buttonTopMargin + minButtonHeight + 10,
				data: groupInstances,
				style:Titanium.UI.iPhone.TableViewStyle.GROUPED,
				height: '100%'
			});
			self.add(groupInstanceView);
			
		} else {
			self.renderGroupContent(tabScroll, currGroup, navView, parentGroup, dataStore);
		}
	};
		
	self.renderGroupContent = function(tabScroll, currGroup, navView, parentGroup, dataStore){
		var currTop = 0;
		
		tabScroll.visible = false;
		
		// iterate over the subgroups of this group
		for (var j in currGroup.subgroups) {
			if (currGroup.subgroups.hasOwnProperty(j)) {
				var subgroupButton = Ti.UI.createButton({
					width: maxWidth - 10,
					height: minButtonHeight,
					title: currGroup.subgroups[j].label,
					left: buttonSideMargin,
					right: buttonSideMargin,
					top: currTop,
					bound: [ currGroup.subgroups[j].label, j ]
				});
				formComponents.styleButton(subgroupButton);
				subgroupButton.addEventListener('click',
					function(e) {
						var sgView = Ti.UI.createView({
							top: 0,
							width: "100%",
							height: "100%",
							backgroundColor: '#000000',
							zIndex: 4
						});
						var sgTabScroll = Ti.UI.createScrollView();
						sgView.add(sgTabScroll);
						if (formDefinition.groups[currGroup.name].subgroups[this.bound[1]].type == 'list'){
							if (! dataStore[this.bound[0]].length) {
								dataStore[this.bound[0]] = self.addSubgroupToDataset(dataStore[this.bound[0]], this.bound[1]);
							}
						} else {
							if (typeof dataStore[this.bound] == 'undefined') {
								dataStore[this.bound[0]] = self.addSubgroupToDataset(dataStore[this.bound[0]], this.bound[1]);
							}
						}
						self.renderGroup(sgTabScroll, formDefinition.groups[this.bound[1]], navView, currGroup.name, dataStore[this.bound[0]]);
						tabScroll.getParent().add(sgView);
					}
				);
				currTop += minButtonHeight + 5;
				tabScroll.add(subgroupButton);
			}
			
		}
			
		// iterate through the fields of this group
		// the switch statement handles the different form types
		for (var j in currGroup.fields) {
			if (currGroup.fields.hasOwnProperty(j)){
				var currField = currGroup.fields[j];
				switch (currField.type) {
					case 'date':
						var textLabel = Ti.UI.createLabel({
							color:'#ffffff',
							text: currField.label,
							left: buttonSideMargin,
							top: currTop,
							height:'auto',
							font: labelFont,
							width:'40%',
							bound: currField.description
						});
						textLabel.addEventListener('click', function(){
							alert(this.bound);
						});
						
						tabScroll.add(textLabel);
						
						var dateButton = Ti.UI.createButton({
							borderStyle: Ti.UI.INPUT_BORDERSTYLE_ROUNDED,
							color: '#000000',
							top: currTop,
							right: buttonSideMargin,
							width: '45%',
							editable: false,
							title: dataStore[currField.name] ? dataStore[currField.name] : (currField['default'] ? currField['default'] : ''),
							height: 'auto',
							bound: [i,j]
						});
						dateButton.addEventListener('click', function(){
							var pickerView = Ti.UI.createView({
								width: '100%',
								height: '100%',
								backgroundColor: '#000000',
								top: 0,
								zIndex: 10,
								opacity: 1.0
							});
							var picker = Ti.UI.createPicker({
							  type:Ti.UI.PICKER_TYPE_DATE,
							  value:new Date(),
							  top: '40%'
							});
							pickerView.add(picker);
							var okButton = Ti.UI.createButton({
								title: 'OK',
								bottom: '20%',
								left: '10%',
								bound: this,
								height: minButtonHeight,
								width: minButtonWidth
							});
							okButton.addEventListener('click',function(){
								var d = picker.getValue();
								var day = d.getDate();
								var month = d.getMonth() + 1;
								var year = d.getFullYear();
								var dstring = year+"/"+month+"/"+day;
								this.bound.title = dstring;
								dataStore[this.bound.bound[1]] = dstring;
								self.remove(pickerView);
							});
							pickerView.add(okButton);
							formComponents.styleButton(okButton);
							var cancelButton = Ti.UI.createButton({
								title: "Cancel",
								bottom: '20%',
								right: '10%',
								height: minButtonHeight,
								width: minButtonWidth
							});
							cancelButton.addEventListener('click',function(){
								self.remove(pickerView);
							});
							formComponents.styleButton(cancelButton);
							pickerView.add(cancelButton);
							self.add(pickerView);
						});
						tabScroll.add(dateButton);
						
						currTop += globalLineHeight;
					break;
					case 'geolocation':
						var textLabel = Ti.UI.createLabel({
							color:'#ffffff',
							text: currField.label,
							left: buttonSideMargin,
							top: currTop,
							font: labelFont,
							height:'auto',
							width:'45%',
							bound: currField.description
						});
						textLabel.addEventListener('click', function(){
							alert(this.bound);
						});
						
						tabScroll.add(textLabel);
						
						var textField = Ti.UI.createTextField({
							borderStyle: Ti.UI.INPUT_BORDERSTYLE_ROUNDED,
							color: '#000000',
							top: currTop,
							right: '8%',
							width: '37%',
							value: dataStore[currField.name] ? dataStore[currField.name] : (currField['default'] ? currField['default'] : ''),
							height: 'auto',
							bound: [i,j]
						});
						textField.addEventListener('change', function(e){
							dataStore[this.bound[1]] = this.value;
						});
						
						tabScroll.add(textField);
						
						var locationButton = Ti.UI.createButton({
							title: 'get',
					 	 	top: currTop,
							right: 0,
							width: '8%',
							height: 'auto',
							bound: textField
						});								  
						tabScroll.add(locationButton);
						
						if (j==0){
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
						currTop += globalLineHeight;
					break;
					case 'image':
						var textLabel = Ti.UI.createLabel({
							color:'#ffffff',
							text: currField.label,
							left: buttonSideMargin,
							top: currTop,
							font: labelFont,
							height:'auto',
							width:'auto',
							bound: currField.description
						});
						textLabel.addEventListener('click', function(){
							alert(this.bound);
						});
						
						tabScroll.add(textLabel);
						
						var cameraButton = Ti.UI.createButton({
							title: 'take picture',
							width: minButtonWidth,
							height: minButtonHeight,
							top: currTop,
							right: 10,
						});
						formComponents.styleButton(cameraButton);									
						tabScroll.add(cameraButton);
						
						currTop += minButtonHeight + 5;
						
						var imageView = Titanium.UI.createImageView({
										image: dataStore[currField.name] ? dataStore[currField.name] : currField['default'],
										width: '90%',
										left: '5%',
										height: 300,
										top: currTop,
										bound: [i,j]
									});
						tabScroll.add(imageView);
						
						cameraButton.addEventListener('click', function(e){
							Ti.Media.showCamera({
								mediaTypes: [ Ti.Media.MEDIA_TYPE_PHOTO ],
								saveToPhotoGallery: true,
								success: function(e){
									imageView.image = e.media;
									dataStore[imageView.bound[1]] = e.media.nativePath;
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
						
						if (j==0){
							currentControl = cameraButton;
						}
						
						currTop += 305;
						
					break;
					case 'boolean':
						var textLabel = Ti.UI.createLabel({
							color:'#ffffff',
							text: currField.label,
							left: buttonSideMargin,
							font: labelFont,
							top: currTop,
							height:'auto',
							width:'auto',
							bound: currField.description
						});
						textLabel.addEventListener('click', function(){
							alert(this.bound);
						});
						
						tabScroll.add(textLabel);
						currTop += 30;
						
						var valueSwitch = Ti.UI.createSwitch({ value: dataStore[currField.name] ? true : (currField['default'] ? true : false),
															   bound: [i,j],
															   titleOn:'yes',
															   titleOff:'no',
															   top: currTop });
						valueSwitch.addEventListener('change', function(e){
							dataStore[this.bound[1]] = this.value;
						});
						
						if (j==0){
							currentControl = valueSwitch;
						}
						
						currTop += globalLineHeight;
						
						tabScroll.add(valueSwitch);
					break;
					default:
						var textLabel = Ti.UI.createLabel({
							color:'#ffffff',
							text: currField.label,
							left: buttonSideMargin,
							top: currTop,
							font: labelFont,
							height:'auto',
							width:'auto',
							bound: currField.description
						});
						textLabel.addEventListener('click', function(){
							alert(this.bound);
						});
					
						tabScroll.add(textLabel);
						
						if (currField.validation.type == 'cv') {
							var c = currField.validation.value;
							
							// select box
							var textField = Ti.UI.createButton({
  								borderStyle: Ti.UI.INPUT_BORDERSTYLE_ROUNDED,
 								color: '#000000',
								top: currTop,
								right: buttonSideMargin,
								width: '45%',
								editable: false,
								title: dataStore[currField.name] ? dataStore[currField.name] : (currField['default'] ? currField['default'] : ''),
								height: 'auto',
								bound: [i,j,c]
							});
							
							var selectView = Ti.UI.createScrollView({
								top: 0,
								backgroundColor: '#000000',
								width: '100%',
								height: '100%',
								zIndex: 3
							});
							textField.addEventListener('click', function(e){
								self.add(selectView);
								formComponents.filterSelect({
									view: selectView,
									items: controlledVocabularies[this.bound[2]].terms.sort(),
									bound: this,
									callback: function(value, bound){
										bound.title = value;
										dataStore[bound.bound[1]] = value;
									},
									defaultValue: textField.title,
								});
							});
							
							tabScroll.add(textField);
													
							currTop += globalLineHeight;
						} else {
							var textField = Ti.UI.createTextField({
								borderStyle: Ti.UI.INPUT_BORDERSTYLE_ROUNDED,
								color: '#000000',
								top: currTop,
								right: buttonSideMargin,
								width: '45%',
								value: dataStore[currField.name] ? dataStore[currField.name] : (currField['default'] ? currField['default'] : ''),
								height: 'auto',
								bound: [i,j]
							});
							
							textField.addEventListener('change', function(e){
								dataStore[this.bound[1]] = this.value;
							});
						
							tabScroll.add(textField);
							if (j==0){
								textField.focus();
								currentControl = textField;
							}
						
							currTop += globalLineHeight;
						}
					break;
				}
			}
		}
		
		tabScroll.visible = true;
	};
	
	// first have the user select a form instance
	// from there, each view will set the next view
	self.showFormInstanceSelect();
	
				
	return self;
}

module.exports = FormView;