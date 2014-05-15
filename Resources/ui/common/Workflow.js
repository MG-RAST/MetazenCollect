function Workflow() {
	// global config variables
	var loginURL = "http://api.metagenomics.anl.gov/?verbosity=verbose";
	var templateURLs = [
						// "http://140.221.84.144:8000/node/2736be4f-91b9-41d9-ae3d-d2e958f582fd", // MG-RAST
						"http://140.221.84.144:8000/node/9886a6e1-0cde-4643-9153-3844ac63f758" // Demo
						];
	
	// initialize self
	var self = Ti.UI.createView({
		backgroundColor: '#000000',
		saving: false
	});
	
	// initialize the formComponents module
	var FormComponents = require('ui/common/FormComponents');
	var formComponents = new FormComponents();
	
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
	
	// initialize empty status
	var status = {};
	
	// switch to a new view, cleaning up the old
	self.switchView = function (newView) {
		if (status.currentView !== null) {
			self.remove(status.currentView);
		}
		self.add(newView);
		
		status.currentView = newView;
		
		return;
	};
	
	// run at startup
	self.checkStatus = function(norelay) {
		// initialize status variables
		status = { 	templates: [],
					templateStructures: {},
					datasets: {},
					currentDataset: null,
					currentTemplate: null,
					currentTemplateRoot: null,
					currentView: null,
					currentParentName: null,
					currentHierarchy: [],
					currentGroupName: null,
					currentGroupIndex: null
		};
		
		// check for directories
		// the template directory holds all templates the user has downloaded
		var templateDir = Ti.Filesystem.getFile(Ti.Filesystem.applicationDataDirectory, 'templates');
		if (! templateDir.exists()) {
		    templateDir.createDirectory();
		}
		var templateFiles = templateDir.getDirectoryListing();
		status.templates = [];
		for (var i=0;i<templateFiles.length;i++){
			status.templates.push(templateFiles[i]);
		}
		
		// the data dir has a subdirectory for each template, filled with data files for
		// the according template
		var dataDir = Ti.Filesystem.getFile(Ti.Filesystem.applicationDataDirectory, 'data');
		if (! dataDir.exists()) {
		    dataDir.createDirectory();
		}
		var usedTemplates = dataDir.getDirectoryListing();
		status.datasets = {};
		for(var i=0;i<usedTemplates.length;i++){
			var currentTemplateDatasets = Ti.Filesystem.getFile(Ti.Filesystem.applicationDataDirectory+'/data', usedTemplates[i]).getDirectoryListing();
			for (var h=0;h<currentTemplateDatasets.length;h++){
				if (! status.datasets.hasOwnProperty(usedTemplates[i])) {
					status.datasets[usedTemplates[i]] = {};
				}
				status.datasets[usedTemplates[i]][currentTemplateDatasets[h]] = {};
			}
		}
		
		if (norelay){
			return;
		}
		
		// add the logo
		var logo = Ti.UI.createImageView({
			image:'metazen_logo_wide.png',
			width: '99%',
			top: '30px'
		});
		self.add(logo);
		
		self.showSplash();
	};
	
	self.showSplash = function () {
		// show the splash screen
		var splashScreen = Ti.UI.createView({
			top: 0,
			backgroundColor: '#000000',
			width: '100%',
			height: '100%',
			zIndex: 1
		});
		
		// add the logo
		var logo = Ti.UI.createImageView({
			image:'metazen_logo.png',
			width: '90%',
			top: '150px'
		});
		splashScreen.add(logo);
		
		// put in the login form
		var loginField = Ti.UI.createTextField({
			borderStyle: Ti.UI.INPUT_BORDERSTYLE_ROUNDED,
			color: formComponents.textFontColor,
			height: formComponents.buttonHeight,
			width: '200px',
			left: '80px',
			autocorrect: false,
			font: formComponents.textFont,
			hintText: "login",
			autocapitalization: Ti.UI.TEXT_AUTOCAPITALIZATION_NONE
		});
		loginField.addEventListener('return', function(event){
			passwordField.focus();
		});
		var passwordField = Ti.UI.createTextField({
			borderStyle: Ti.UI.INPUT_BORDERSTYLE_ROUNDED,
			color: formComponents.textFontColor,
			height: formComponents.buttonHeight,
			width: '200px',
			left: '290px',
			passwordMask: true,
			autocorrect: false,
			font: formComponents.textFont,
			autocapitalization: Ti.UI.TEXT_AUTOCAPITALIZATION_NONE,
			hintText: "password"
		});
		passwordField.addEventListener('return', function(event){
			sendBtn.fireEvent('click');
		});
		var sendBtn = Ti.UI.createButton({
			height: formComponents.buttonHeight,
			title: "login",
			width: '100px',
			left: '500px'
		});
		formComponents.styleButton(sendBtn);
		sendBtn.addEventListener('click', function(e){
			var client = Ti.Network.createHTTPClient({
		     	onload : function(e) {
		     		var response;
		     		try {
		     			response = JSON.parse(this.responseText);
		     		} catch (error) {
		     			var dialog = Ti.UI.createAlertDialog({
	     					title: "login failed",
	     					message: "authentication server could not be reached",
	     					buttonNames: ["OK"]
	     				});
	     				dialog.show();
	     				return;
		     		}
	     			if (response.ERROR) {
	     				var dialog = Ti.UI.createAlertDialog({
	     					title: "login failed",
	     					message: "login credentials invalid",
	     					buttonNames: ["OK"]
	     				});
	     				dialog.show();
	     			} else {
	     				self.synchTemplates();
	     				var dialog = Ti.UI.createAlertDialog({
	     					title: "login successful",
	     					message: "Welcome "+response.firstname+" "+response.lastname,
	     					buttonNames: ["OK"]
	     				});
	     				dialog.addEventListener('click', function(e){
	     					self.homeScreen();
	     				});
	     				dialog.show();
	     				self.token = response.token;
	     			}
			    },
		     	onerror : function(e) {
		         	var dialog = Ti.UI.createAlertDialog({
     					title: "login failed",
     					message: "system error",
     					buttonNames: ["OK"]
     				});
     				dialog.show();
		     	},
		     	timeout : 5000  // in milliseconds
			});
			 
		 	// Prepare the connection.
		 	client.open("GET", loginURL);
	 		
	 		// set auth
			var header = "mggo4711"+Ti.Utils.base64encode(loginField.value+":"+passwordField.value);
			client.setRequestHeader('auth', header);
			 
			// Send the request.
			client.send();
		});
		
		splashScreen.add(loginField);
		splashScreen.add(passwordField);
		splashScreen.add(sendBtn);
		
		// show the screen
		self.switchView(splashScreen);
	};
	
	// SERVER QUERIES
	
	// synch templates
	self.synchTemplates = function(){
		for (var i=0;i<templateURLs.length;i++) {
			var templateURL = templateURLs[i];
			var client = Ti.Network.createHTTPClient({
		     	onload : function(e) {
		     		var response;
		     		try {
		     			response = JSON.parse(this.responseText).data.attributes;
		     		} catch (error) {
		     			var dialog = Ti.UI.createAlertDialog({
	     					title: "synchronysation error",
	     					message: "the template server could not be reached",
	     					buttonNames: ["OK"]
	     				});
	     				dialog.show();
	     				return;
		     		}
	     			Ti.Filesystem.getFile(Ti.Filesystem.applicationDataDirectory+'/templates/'+response.name).write(JSON.stringify(response));
					var tdir = Ti.Filesystem.getFile(Ti.Filesystem.applicationDataDirectory+'/data/',response.name);
					if (! tdir.exists()) {
			 		   tdir.createDirectory();
					}
					
					var templatePresent = false;
					for (var i=0;i<status.templates.length;i++) {
						if (status.templates[i] == response.name) {
							templatePresent = true;
							break;
						}
					}
					if (! templatePresent) {
						status.templates.push(response.name);
					}
			    },
		     	onerror : function(e) {
		         	var dialog = Ti.UI.createAlertDialog({
     					title: "synchronysation error",
     					message: "a system error ocurred when synchronizing templates",
     					buttonNames: ["OK"]
     				});
     				dialog.show();
		     	},
		     	timeout : 5000  // in milliseconds
			 });
			 
			 // Prepare the connection.
	 		client.open("GET", templateURL);
	 		
	 		// Send the request.
	 		client.send();
	 	}
	};
	
	// VIEWS
	
	// initial screen
	self.homeScreen = function() {
		var homeView = Ti.UI.createView({
			backgroundColor: '#000000',
			width: '100%',
			top: "100px",
			height: '100%',
			zIndex: 1
		});
		
		var buttons = formComponents.buttonMenu(['spacer','enter new dataset','view / edit data','view / edit templates', 'manage files'], 60);
		buttons['enter new dataset'].addEventListener('click',self.showTemplateSelect);
		homeView.add(buttons['enter new dataset']);
		buttons['view / edit data'].addEventListener('click',self.showDatasetSelect);
		homeView.add(buttons['view / edit data']);
		//buttons['view / edit templates'].addEventListener('click',self.showTemplateEdit);
		//homeView.add(buttons['view / edit templates']);
		buttons['manage files'].addEventListener('click',self.manageFiles);
		homeView.add(buttons['manage files']);
				
		var label = Ti.UI.createLabel({
			color: formComponents.labelFontColor,
			text: 'Main Menu',
			height:'auto',
			font: formComponents.labelFont,
			width:'auto',
			top: '0px'
		});
		homeView.add(label);
		
		self.switchView(homeView);
	};
		
	// template selection
	self.showTemplateSelect = function(){
		var templateSelectView = Ti.UI.createView({
			top: formComponents.topMargin,
			backgroundColor: '#000000',
			width: '100%',
			height: '100%',
			zIndex: 1
		});
		
		// title
		var titleLabel = Ti.UI.createLabel({
			top: 0,
			left: 10,
			color: formComponents.labelFontColor,
			text: 'select a dataset template', 
			font: formComponents.labelFont,
			height:'auto',
			width:'auto'
			});
		templateSelectView.add(titleLabel);
		
		var currentTemplateInstances = Ti.Filesystem.getFile(Ti.Filesystem.applicationDataDirectory+'/data').getDirectoryListing();
		var fs = formComponents.filterSelect({ view: templateSelectView, items: status.templates, skipRows: 1, cancel: self.homeScreen, noCancelBubble: true });
		for (var i=0;i<fs.length;i++){
			fs[i].bound = i;
			fs[i].addEventListener('click', function(){
				status.currentTemplate = status.templates[this.bound];
				var dialog = formComponents.alertDialog({
					title: 'Enter dataset name'
				});
				dialog.addEventListener('click', function(e){
					if(e.index==0){
						
						// check if the chosen name is already taken
						var dataDir = Ti.Filesystem.getFile(Ti.Filesystem.applicationDataDirectory+'/data', status.currentTemplate);
						if (! dataDir.exists()) {
						    dataDir.createDirectory();
						}
						var currentFormInstances = Ti.Filesystem.getFile(Ti.Filesystem.applicationDataDirectory+'/data/'+status.currentTemplate).getDirectoryListing();
						for (var i=0;i<currentFormInstances.length;i++){
							if(currentFormInstances[i]==e.text){
								alert('a form with that name already exists');
								dialog.show();
								return false;
							}
						}
						
						// set the current dataset to the selected name
						status.currentDataset = e.text;
						
						// check if the directory exists
						var tdir = Ti.Filesystem.getFile(Ti.Filesystem.applicationDataDirectory+'/data/',status.currentTemplate);
						if (! tdir.exists()) {
				 		   tdir.createDirectory();
						}
						
						// store an empty hash for this dataset
						var dsfn = Ti.Filesystem.applicationDataDirectory+'data/'+status.currentTemplate+'/'+status.currentDataset;
						dsfn = dsfn.replace(/\s/g, "%20");
						Ti.Filesystem.getFile(dsfn).write(JSON.stringify({}));
						
						// store the dataset name in the datasets object
						if (! status.datasets.hasOwnProperty(status.currentTemplate)) {
							status.datasets[status.currentTemplate] = {};
						}
						status.datasets[status.currentTemplate][status.currentDataset] = {};
						
						// load the template for this dataset
						if (!status.templateStructures.hasOwnProperty(status.currentTemplate)) {
							status.templateStructures[status.currentTemplate] = JSON.parse(Ti.Filesystem.getFile(Ti.Filesystem.applicationDataDirectory+'/templates/'+status.currentTemplate).read().text);
						}
						
						// show the editor
						self.showDatasetEdit();
					}
				});
				dialog.show();
			});
		}
		
		self.switchView(templateSelectView);
	};
	
	// select an already started dataset to edit
	self.showDatasetSelect = function() {
		var datasetSelectView = Ti.UI.createView({
			top: formComponents.topMargin,
			backgroundColor: '#000000',
			width: '100%',
			height: '100%',
			zIndex: 1
		});
		
		// title
		var titleLabel = Ti.UI.createLabel({
			top: 0,
			left: 10,
			color: formComponents.labelFontColor,
			text: 'select a dataset', 
			font: formComponents.labelFont,
			height:'auto',
			width:'auto'
			});
		datasetSelectView.add(titleLabel);
		
		var datasetItems = [];
		var ds2template = [];
		for (var i=0;i<status.templates.length;i++){
			var currentFormInstances = Ti.Filesystem.getFile(Ti.Filesystem.applicationDataDirectory+'/data/'+status.templates[i]).getDirectoryListing();
			for (var h=0;h<currentFormInstances.length;h++){
				datasetItems.push(status.templates[i] + " - " + currentFormInstances[h]);
				ds2template.push({ "template": status.templates[i], "dataset": currentFormInstances[h] });
			}
		} 
		var fs = formComponents.filterSelect({ view: datasetSelectView, items: datasetItems, skipRows: 1, cancel: self.homeScreen, noCancelBubble: true });
		for (var i=0;i<fs.length;i++){
			fs[i].bound = i;
			fs[i].addEventListener('click', function(){
				status.currentTemplate = ds2template[this.bound].template;
				status.currentDataset = ds2template[this.bound].dataset;
				self.loadCurrentDataset();
				status.currentHierarchy = [];
				status.currentGroupIndex = 0;
				status.currentGroupName = null;
				self.showDatasetEdit();
			});
		}
		
		self.switchView(datasetSelectView);
	};
	
	// show the template editor
	self.showTemplateEdit = function(){
		
	};
	
	// data entry form
	self.showDatasetEdit = function(){
		// get the data to edit
		var entryData;
		
		var currTop = 0;
		
		// check if this is the first invocation
		if (status.currentGroupName == null) {
			
			// check if the template structure is loaded
			if (! status.templateStructures.hasOwnProperty(status.currentTemplate)){
				status.templateStructures[status.currentTemplate] = JSON.parse(Ti.Filesystem.getFile(Ti.Filesystem.applicationDataDirectory+'/templates/'+status.currentTemplate).read().text);
			}
			
			// find the toplevelGroup
			for (var i in status.templateStructures[status.currentTemplate].groups){
				if (status.templateStructures[status.currentTemplate].groups.hasOwnProperty(i)) {
					if (status.templateStructures[status.currentTemplate].groups[i].toplevel) {			
						status.currentTemplateRoot = i;
						status.currentGroupName = i;
						break;
					}
				}
			}
			
			if (status.currentHierarchy.length == 0) {
				status.currentHierarchy.push({ "name": status.currentGroupName, "index": null });
			}
			entryData = self.initializeDataset();
		} else {
			entryData = self.initializeDataset();
		}
		
		// get the form defintion
		var formDefinition = status.templateStructures[status.currentTemplate].groups[status.currentGroupName];
		
		// create the view
		var editDatasetView = Ti.UI.createView({
			top: formComponents.topMargin,
			width: '100%',
			height: '100%',
			zIndex: 2,
			backgroundColor: '#000000'
		});
		
		// create a navigation bar
 		var navView = Ti.UI.createView({
 			zIndex: 3,
 			width: maxWidth,
 			height: formComponents.buttonHeight + 15,
 			top: 0,
 			left: 0,
 			backgroundColor: '#000000'
 		});
 		editDatasetView.add(navView);
 
 		// button to close the current view and go one level higher
 		// or to the home screen if we are at the top level
 		var closeBtnTitle = "done";
 		if (status.currentGroupName != status.currentTemplateRoot) {
 			closeBtnTitle = status.currentParentName;
 		}
		var closeBtn = Ti.UI.createButton({
			width: formComponents.smallButtonWidth,
			height: formComponents.buttonHeight,
			title: closeBtnTitle,
			left: formComponents.buttonSideMargin,
			top: 0
		});
		formComponents.styleButton(closeBtn);
		if (status.currentGroupName != status.currentTemplateRoot) {
	 		closeBtn.addEventListener('click',
				function(e) {
					self.saveDataset();
					status.currentGroupName = status.currentParentName;
					status.currentHierarchy.pop();
					status.currentParentName = status.currentHierarchy.length > 1 ? status.currentHierarchy[status.currentHierarchy.length - 2].name : null;
					status.currentGroupIndex = status.currentHierarchy[status.currentHierarchy.length - 1].index;
					self.showDatasetEdit();
				}
			);
	 	} else {
			closeBtn.addEventListener('click',
				function(e) {
					self.saveDataset();
					self.homeScreen();
				}
			);
		}
		navView.add(closeBtn);
		
		// title
		var titleLabel = Ti.UI.createLabel({
					color: formComponents.labelFontColor,
					text: status.templateStructures[status.currentTemplate].groups[status.currentGroupName].label+" - "+status.currentDataset, 
					font: formComponents.labelFont,
					height:'auto',
					width:'auto',
					align: 'left',
					top: "8px",
					left: (formComponents.buttonSideMargin * 2) + formComponents.smallButtonWidth
				});
		navView.add(titleLabel);
		
		// list navigator
		if (status.currentHierarchy.length > 1) {
			var parent = self.getCurrentDataset(true);
			if (typeof parent[status.currentGroupName].length == 'number') {
				var numTotal = parent[status.currentGroupName].length;
				var positionLabel = Ti.UI.createLabel({
						color: formComponents.labelFontColor,
						text: "["+(status.currentGroupIndex + 1)+" of "+numTotal+"]", 
						font: formComponents.labelFont,
						height:'auto',
						width:'auto',
						right: 10 + (formComponents.miniButtonWidth * 2),
						zIndex: 10
					});
				navView.add(positionLabel);
				if (status.currentGroupIndex > 0) {
					var leftBtn = Ti.UI.createButton({
						width: formComponents.miniButtonWidth,
						height: formComponents.buttonHeight,
						title: "<",
						right: formComponents.buttonSideMargin + 5 + formComponents.miniButtonWidth,
						top: 0,
						zIndex: 10
					});
					leftBtn.addEventListener('click',
						function(e) {
							self.saveDataset();
							status.currentGroupIndex--;
							status.currentHierarchy[status.currentHierarchy.length - 1].index = status.currentGroupIndex;
							self.showDatasetEdit();
						}
					);
					formComponents.styleButton(leftBtn);
					navView.add(leftBtn);
				}
				var rightBtn = Ti.UI.createButton({
					width: formComponents.miniButtonWidth,
					height: formComponents.Height,
					title: ">",
					right: formComponents.buttonSideMargin,
					top: 0,
					zIndex: 10
				});
				rightBtn.addEventListener('click',
					function(e) {
						self.saveDataset();
						status.currentGroupIndex++;
						status.currentHierarchy[status.currentHierarchy.length - 1].index = status.currentGroupIndex;
						self.showDatasetEdit();
					}
				);
				formComponents.styleButton(rightBtn);
				navView.add(rightBtn);
			}
		}
		
		// tab scroll for the form items
		var tabScroll = Ti.UI.createScrollView({
			top: formComponents.buttonHeight + 20
		});
		
		// at this point entryData holds a pointer to the current data item in the
		// status.datasets structure and formDefinition holds the template structure data
		// of the current data item
		
		// add the subgroup buttons first
		if (formDefinition.hasOwnProperty('subgroups')){
			// sort the subgroups by index if available
			// otherwise sort by name
			var subgroups = formComponents.sortObjects(formDefinition.subgroups);
			
			// iterate over the subgroups and render a button for each one
			for (var i=0; i<subgroups.length; i++) {
				var subgroupButton = Ti.UI.createButton({
					width: maxWidth - 10,
					height: formComponents.buttonHeight,
					title: subgroups[i].label,
					left: formComponents.buttonSideMargin,
					right: formComponents.buttonSideMargin,
					top: currTop,
					bound: [ subgroups[i].label, subgroups[i].name ]
				});
				formComponents.styleButton(subgroupButton);
				subgroupButton.addEventListener('click',
					function(e) {
						status.currentParentName = status.currentGroupName;
						status.currentGroupIndex = 0;
						status.currentGroupName = this.bound[1];
						status.currentHierarchy.push({ 	"name": status.currentGroupName,
														"index": status.currentGroupIndex });
						self.showDatasetEdit();
					}
				);
				tabScroll.add(subgroupButton);
				currTop += formComponents.buttonHeight + 5;
			}
		}
		
		// now add the entry fields if there are any
		if (formDefinition.hasOwnProperty('fields')) {
			// sort the fields by index if available
			// otherwise sort by name
			var fields = formComponents.sortObjects(formDefinition.fields);
			var inputFields = [];
			for (var i=0; i<fields.length; i++){
				var textLabel = Ti.UI.createLabel({
					color: formComponents.labelFontColor,
					text: fields[i].label,
					left: formComponents.buttonSideMargin,
					top: currTop,
					height: formComponents.buttonHeight,
					font: formComponents.labelFont,
					width:'auto',
					bound: fields[i].description
				});
				textLabel.addEventListener('click', function(){
					alert(this.bound);
				});
				tabScroll.add(textLabel);
				var inputField = self.inputField(fields[i], self.getCurrentDataset(), currTop);
				for (var h=0; h<inputField.elements.length; h++) {
					tabScroll.add(inputField.elements[h]);
				}
				inputFields.push(inputField);
				currTop += inputField.currTop ? inputField.currTop : formComponents.globalLineHeight;
			}
			for (var i=0;i<inputFields.length-1;i++){
				if (inputFields[i].elements.length == 1 && inputFields[i+1].elements.length == 1) {
					inputFields[i].elements[0].bound = i + 1;
					inputFields[i].elements[0].addEventListener('return', function(event){
						try {
							inputFields[this.bound].elements[0].focus();
						} catch (error) {
							
						}
					});
				}
			}
		}
		
		editDatasetView.add(tabScroll);
	
		self.switchView(editDatasetView);
	};
	
	// helper function to draw the different types of entry fields
	// new field types must be implemented in this function
	self.inputField = function(fieldDefinition, fieldSet, currTop){
		// create an input depending on the passed fieldType
		switch (fieldDefinition.type) {
			case 'date':
				var dateButton = Ti.UI.createButton({
					borderStyle: Ti.UI.INPUT_BORDERSTYLE_ROUNDED,
					color: '#000000',
					top: currTop,
					right: formComponents.buttonSideMargin,
					editable: false,
					title: fieldSet[fieldDefinition.name],
					width: formComponents.buttonWidthPercent,
					height: formComponents.buttonHeight,
					bound: fieldDefinition.name
				});
				formComponents.styleButton(dateButton);
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
					  type: Ti.UI.PICKER_TYPE_DATE,
					  value: new Date(),
					  top: '40%'
					});
					pickerView.add(picker);
					var okButton = Ti.UI.createButton({
						title: 'OK',
						bottom: '20%',
						left: '10%',
						bound: this,
						height: formComponents.buttonHeight,
						width: formComponents.smallButtonWidth
					});
					okButton.addEventListener('click',function(){
						var d = picker.getValue();
						var day = d.getDate();
						var month = d.getMonth() + 1;
						var year = d.getFullYear();
						var dstring = year+"/"+month+"/"+day;
						this.bound.title = dstring;
						fieldSet[this.bound.bound] = dstring;
						self.remove(pickerView);
					});
					pickerView.add(okButton);
					formComponents.styleButton(okButton);
					var cancelButton = Ti.UI.createButton({
						title: "Cancel",
						bottom: '20%',
						right: '10%',
						height: formComponents.buttonHeight,
						width: formComponents.smallButtonWidth
					});
					cancelButton.addEventListener('click',function(){
						self.remove(pickerView);
						self.homeScreen();
					});
					formComponents.styleButton(cancelButton);
					pickerView.add(cancelButton);
					self.add(pickerView);
				});
				return { elements: [ dateButton ] };
			break;
			case 'geolocation':
				var textField = Ti.UI.createTextField({
					borderStyle: Ti.UI.INPUT_BORDERSTYLE_ROUNDED,
					color: formComponents.textFontColor,
					font: formComponents.textFont,
					top: currTop,
					right: '10%',
					width: '52%',
					value: fieldSet[fieldDefinition.name],
					height: formComponents.buttonHeight,
					bound: fieldDefinition.name
				});
				textField.addEventListener('change', function(e){
					fieldSet[this.bound] = this.value;
				});
				
				var locationButton = Ti.UI.createButton({
					title: 'get',
			 	 	top: currTop,
					right: formComponents.buttonSideMargin,
					width: '8%',
					height: formComponents.buttonHeight,
					bound: textField
				});			
				formComponents.styleButton(locationButton);					  
				
				locationButton.addEventListener('click', function(e){
					var loc = Ti.Geolocation;
					loc.purpose = 'Your current location to be filled into the form.';
					loc.getCurrentPosition(function(e2){
						if (e2.success) {
							var locVal = e2.coords.latitude.toFixed(5) + ' lat, ' + e2.coords.longitude.toFixed(5) + ' lon';
							locationButton.bound.value = locVal;
							fieldSet[locationButton.bound.bound] = locVal;
						} else {
							var dialog = Ti.UI.createAlertDialog({
		     					title: "aquiring geolocation failed",
		     					message: "a system error ocurred when retriving the GPS coordinates",
		     					buttonNames: ["OK"]
		     				});
		     				dialog.show();	
						}
					});
				});
				
				return { elements: [ textField, locationButton ] };					
			break;
			case 'image':
				var cameraButton = Ti.UI.createButton({
					title: 'take picture',
					width: formComponents.buttonWidthPercent,
					height: formComponents.buttonHeight,
					top: currTop,
					right: formComponents.buttonSideMargin,
				});
				formComponents.styleButton(cameraButton);
				
				var imageView = Titanium.UI.createImageView({
								image: fieldSet[fieldDefinition.name],
								width: '90%',
								left: '5%',
								height: 300,
								top: currTop + formComponents.buttonHeight + 5,
								bound: fieldDefinition.name
							});
				
				cameraButton.addEventListener('click', function(e){
					Ti.Media.showCamera({
						mediaTypes: [ Ti.Media.MEDIA_TYPE_PHOTO ],
						saveToPhotoGallery: true,
						success: function(e){
							imageView.image = e.media;
							fieldSet[imageView.bound] = e.media.nativePath;
						},
						error: function(e){
							alert('an error occurred while taking the picture');
						},
						cancel: function(e){
							alert('Photo cancelled.');
						}
					});
				});
				
				return { elements: [ cameraButton, imageView ], currTop: (310 + formComponents.buttonHeight) };					
			break;
			case 'boolean':
				var valueSwitch = Ti.UI.createSwitch({ value: fieldSet[fieldDefinition.name],
													   bound: fieldDefinition.name,
													   titleOn:'yes',
													   titleOff:'no',
													   height: formComponents.buttonHeight,
													   top: currTop + (formComponents.buttonHeight / 2) - 15 });
				valueSwitch.addEventListener('change', function(e){
					fieldSet[this.bound] = this.value;
				});
				
				return { elements: [ valueSwitch ] };
			break;
			default:
				if (fieldDefinition.validation && fieldDefinition.validation.type == 'cv') {
					var c = fieldDefinition.validation.value;
					
					// select box
					var textField = Ti.UI.createButton({
						borderStyle: Ti.UI.INPUT_BORDERSTYLE_ROUNDED,
						color: formComponents.textFontColor,
						font: formComponents.textFont,
						top: currTop,
						right: formComponents.buttonSideMargin,
						editable: false,
						title: fieldSet[fieldDefinition.name],
						width: formComponents.buttonWidthPercent,
						height: formComponents.buttonHeight,
						bound: [fieldDefinition.name,c]
					});
					formComponents.styleButton(textField);
					
					var selectView = Ti.UI.createScrollView({
						top: formComponents.topMargin,
						backgroundColor: '#000000',
						width: '100%',
						height: '100%',
						zIndex: 3
					});
					textField.addEventListener('click', function(e){
						self.add(selectView);
						var items = status.templateStructures[status.currentTemplate].controlledVocabularies[this.bound[1]].terms.sort();
						formComponents.filterSelect({
							view: selectView,
							items: items,
							defaultValue: textField.title,
							cancel: self.showDatasetEdit,
							bound: this,
							callback: function(textValue, externalBound) {
								fieldSet[externalBound.bound[0]] = textValue;
								externalBound.title = textValue;
							}
						});
					});
								
					return { elements: [ textField ] };
											
				} else {
					var textField = Ti.UI.createTextField({
						borderStyle: Ti.UI.INPUT_BORDERSTYLE_ROUNDED,
						color: formComponents.textFontColor,
						font: formComponents.textFont,
						top: currTop,
						right: formComponents.buttonSideMargin,
						value: fieldSet[fieldDefinition.name],
						width: formComponents.buttonWidthPercent,
						height: formComponents.buttonHeight,
						bound: fieldDefinition.name
					});
					
					textField.addEventListener('change', function(e){
						fieldSet[this.bound] = this.value;
					});
				
					return { elements: [ textField ] };
				}
			break;
		};		
	};
	
	// manage files
	self.manageFiles = function(){
		var manageView = Ti.UI.createView({
			top: formComponents.topMargin,
			backgroundColor: '#000000',
			width: '100%',
			height: '100%',
			zIndex: 1
		});
		
		var buttons = formComponents.buttonMenu(['spacer','export dataset','export template','synch templates w/ server', 'delete files', 'spacer', 'main menu']);
		buttons['export dataset'].addEventListener('click',self.showDatasetExport);
		manageView.add(buttons['export dataset']);
		buttons['export template'].addEventListener('click',self.showTemplateExport);
		manageView.add(buttons['export template']);
		buttons['synch templates w/ server'].addEventListener('click',self.synchTemplates);
		manageView.add(buttons['synch templates w/ server']);
		buttons['delete files'].addEventListener('click',self.showFileDelete);
		manageView.add(buttons['delete files']);
		buttons['main menu'].addEventListener('click',self.homeScreen);
		manageView.add(buttons['main menu']);
				
		var label = Ti.UI.createLabel({
			text: 'Manage Templates and Datasets',
			height:'auto',
			color: formComponents.labelFontColor,
			font: formComponents.labelFont,
			width:'auto',
			top: 0
		});
		manageView.add(label);
		
		self.switchView(manageView);
	};
	
	// show all user created files and allow the user to delete them
	self.showFileDelete = function() {
		var manageView = Ti.UI.createView({
			top: formComponents.topMargin,
			backgroundColor: '#000000',
			width: '100%',
			height: '100%',
			zIndex: 1
		});
		
		// title
		var label = Ti.UI.createLabel({
			text: 'Delete Files on this Device',
			height:'auto',
			color: formComponents.labelFontColor,
			font: formComponents.labelFont,
			width:'auto',
			top: 0
		});
		manageView.add(label);
		
		// collect all template files
		var fileNames = [];
		var fileHandles = [];
		for (var i=0; i<status.templates.length; i++){
			fileNames.push("Template: "+status.templates[i]);
			var fn = Ti.Filesystem.applicationDataDirectory+'/templates/'+status.templates[i];
			fn = fn.replace(/\s/g, "%20");
			fileHandles.push(fn);
		}
		// collect all dataset files
		for (var i in status.datasets){
			if (status.datasets.hasOwnProperty(i)){
				for (var h in status.datasets[i]) {
					if (status.datasets[i].hasOwnProperty(h)){
						var fn = Ti.Filesystem.applicationDataDirectory+'/data/'+i+"/"+h;
						fn = fn.replace(/\s/g, "%20");
						fileHandles.push(fn);
						fileNames.push("Dataset: " + i + " - " + h);
					}
				}
			}
		}
		
		var fs = formComponents.filterSelect({ view: manageView, items: fileNames, skipRows: 1, cancel: self.manageFiles, cancelTitle: "back", noCancelBubble: true });
		for (var i=0;i<fs.length;i++){
			fs[i].bound = i;
			fs[i].addEventListener('click', function(){
				var dialog = Ti.UI.createOptionDialog({
				  cancel: 1,
				  options: ['OK', 'Cancel'],
				  selectedIndex: 0,
				  destructive: 1,
				  title: 'Delete this file?',
				  bound: this.bound
				});
				dialog.addEventListener('click',function(e){
				    if (e.index == 0){
						
						// delete the file
						Ti.Filesystem.getFile(fileHandles[this.bound]).deleteFile();
						
						// reload status
						self.checkStatus();
						
						// show the the file delete menu
						self.showFileDelete();
					}
				});
				dialog.show();
			});
		}
		
		self.switchView(manageView);
	};
	
	// export templates to email
	self.showTemplateExport = function () {
		var manageView = Ti.UI.createView({
			top: formComponents.topMargin,
			backgroundColor: '#000000',
			width: '100%',
			height: '100%',
			zIndex: 1
		});
		
		var label = Ti.UI.createLabel({
			color: formComponents.labelFontColor,
			text: 'Export Templates to email',
			height:'auto',
			font: formComponents.labelFont,
			width:'auto',
			top: 0
		});
		manageView.add(label);
		
		var fs = formComponents.filterSelect({ view: manageView, items: status.templates, skipRows: 1, cancel: self.manageFiles, noCancelBubble: true, cancelTitle: "back" });
		for (var i=0;i<fs.length;i++){
			fs[i].bound = i;
			fs[i].addEventListener('click', function(){
				var templateName = status.templates[this.bound];
				var emailDialog = Ti.UI.createEmailDialog();
				emailDialog.subject = 'MetazenCollect Template Export - ' + templateName;
				emailDialog.messageBody = "MetazenCollect Template Export\n\nExported Template: " + templateName + "\n\nThe template has been attached in JSON format.";
				var f = Ti.Filesystem.getFile(Ti.Filesystem.getApplicationDataDirectory() + '/templates/' + templateName);
				emailDialog.addAttachment(f);
				emailDialog.open();
			});
		}
		
		self.switchView(manageView);
	};
	
	// export datasets to email
	self.showDatasetExport = function () {
		var manageView = Ti.UI.createView({
			top: formComponents.topMargin,
			backgroundColor: '#000000',
			width: '100%',
			height: '100%',
			zIndex: 1
		});
		
		var label = Ti.UI.createLabel({
			color: formComponents.labelFontColor,
			text: 'Export Datasets to email',
			height:'auto',
			font: formComponents.labelFont,
			width:'auto',
			top: 0
		});
		manageView.add(label);
		
		// collect all dataset files
		var fileNames = [];
		var fileHandles = [];
		for (var i in status.datasets){
			if (status.datasets.hasOwnProperty(i)){
				for (var h in status.datasets[i]) {
					if (status.datasets[i].hasOwnProperty(h)){
						var fn = Ti.Filesystem.applicationDataDirectory+'/data/'+i+"/"+h;
						fn = fn.replace(/\s/g, "%20");
						fileHandles.push([i, h]);
						fileNames.push(i + " - " + h);
					}
				}
			}
		}
		
		var fs = formComponents.filterSelect({ view: manageView, items: fileNames, skipRows: 1, cancel: self.manageFiles, noCancelBubble: true, cancelTitle: "back" });
		for (var i=0;i<fs.length;i++){
			fs[i].bound = i;
			fs[i].addEventListener('click', function(){
				var templateName = fileHandles[this.bound][0];
				var datasetName = fileHandles[this.bound][1];
				var emailDialog = Ti.UI.createEmailDialog();
				emailDialog.subject = 'MetazenCollect Dataset Export - ' + templateName;
				emailDialog.messageBody = "MetazenCollect Dataset Export\n\nExported Template: " + templateName + "\nExported Dataset name: "+datasetName+"\n\nThe dataset has been attached in JSON format.";
				var fn = Ti.Filesystem.getApplicationDataDirectory() + '/data/' + templateName + "/" + datasetName;
				fn = fn.replace(/\s/g, "%20");
				var f = Ti.Filesystem.getFile(fn);
				emailDialog.addAttachment(f);
				emailDialog.open();
			});
		}
		
		self.switchView(manageView);
		
		self.switchView(manageView);
	};
	
	// DATA MANIPULATION
	
	// save the current dataset
	self.saveDataset = function () {
		var dsfn = Ti.Filesystem.applicationDataDirectory+'data/'+status.currentTemplate+'/'+status.currentDataset;
		dsfn = dsfn.replace(/\s/g, "%20");
		Ti.Filesystem.getFile(dsfn).write(JSON.stringify(status.datasets[status.currentTemplate][status.currentDataset]));
	};
	
	// get a pointer to the current dataset
	self.getCurrentDataset = function (parent) {
		var currentDataset;
		
		if (status.currentHierarchy.length > 1) {
			currentDataset = status.datasets[status.currentTemplate][status.currentDataset];
			for (var i=0;i<status.currentHierarchy.length;i++) {
				currentDataset = currentDataset[status.currentHierarchy[i].name];
				if (typeof currentDataset.length == 'number') {
					if (currentDataset.length <= status.currentHierarchy[i].index) {
						return currentDataset;
					}
					currentDataset = currentDataset[status.currentHierarchy[i].index];
				}
				if (parent && ((status.currentHierarchy.length - 2) == i)) {
					return currentDataset;
				}
			}
		} else {
			if (parent) {
				return null;
			}
			if (! status.datasets[status.currentTemplate][status.currentDataset].hasOwnProperty(status.currentGroupName)) {
				status.datasets[status.currentTemplate][status.currentDataset][status.currentGroupName] = {};
			}
			currentDataset = status.datasets[status.currentTemplate][status.currentDataset][status.currentGroupName];
		}
	
		return currentDataset;
	};
	
	// add the subgroups, fields and their default values to the current dataset
	self.initializeDataset = function () {
		// get the current dataset
		var entryData = self.getCurrentDataset();
		
		// check if the current dataset already exists
		if (typeof entryData.length == 'number') {
			if (entryData.length > status.currentGroupIndex){
				return entryData[status.currentGroupIndex];
			} else {
				entryData.push({});
				entryData = entryData[entryData.length -1];
			}
		} else {
			var isEmpty = true;
			for (var i in entryData) {
				if (entryData.hasOwnProperty(i)) {
					isEmpty = false;
					break;
				}
			}
			if (! isEmpty) {
				return entryData;
			}
		}
		
		// if we get here, this is a new dataset that needs to be initialized with the default values,
		// otherwise the current data has already been returned
		
		// get the form defintion
		var formDefinition = status.templateStructures[status.currentTemplate].groups[status.currentGroupName];
		
		// this is a new entry, put in all fields
		for (var i in formDefinition.fields){
			if (formDefinition.fields.hasOwnProperty(i)){
				entryData[i] = formDefinition.fields[i]['default'] || "";
			}
		}
		
		// check if there are subgroups
		if (formDefinition.hasOwnProperty('subgroups')) {
			for (var i in formDefinition.subgroups) {
				if (formDefinition.subgroups.hasOwnProperty(i)) {
					
					// check if the subgroup is a list or an instance
					if (formDefinition.subgroups[i].type && formDefinition.subgroups[i].type == 'list') {
						entryData[i] = [];
					} else {
						entryData[i] = {};
					}
				}
			}
			
		}
		
		self.saveDataset();
		
		return entryData;
	};
	
	self.loadCurrentDataset = function () {
		var currFn = Ti.Filesystem.applicationDataDirectory+'/data/'+status.currentTemplate+"/"+status.currentDataset;
		currFn = currFn.replace(/\s/g, "%20");
		status.datasets[status.currentTemplate][status.currentDataset] = JSON.parse(Ti.Filesystem.getFile(currFn).read().text);
	};
	
	self.checkStatus();
	
	return self;
}

module.exports = Workflow;