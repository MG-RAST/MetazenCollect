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
	var self = Ti.UI.createView();
	
	// initialize the formComponents module
	var FormComponents = require('ui/common/FormComponents');
	var formComponents = new FormComponents();
	
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
	var orientation = 'vertical';

	/*
	 * 
	 * 	VIEW FUNCTIONS
	 * 
	 */   	
	 
	// show the options to select an existing template instance or show the available templates
	self.showFormInstanceSelect = function(){
		var buttons = formComponents.buttonMenu(['select existing form','create new form']);
		buttons['select existing form'].addEventListener('click',self.showFormSelect);
		self.add(buttons['select existing form']);
		buttons['create new form'].addEventListener('click',self.showTemplateSelect);
		self.add(buttons['create new form']);
	};
	
	// show a list of the created form instances
	self.showFormSelect = function(){
		var formSelectView = Ti.UI.createView({
			top: 0,
			backgroundColor: '#ffffff',
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
	
	// show a selection of form templates and the options to create a new one and sync from server
	self.showTemplateSelect = function(){
		var templateSelectView = Ti.UI.createView({
			top: 0,
			backgroundColor: '#ffffff',
			width: '100%',
			height: '100%',
			zIndex: 1
		});
		
		var items = ['load template from server','create new template'];
		for (i=0;i<templateFiles.length;i++){
			items.push(templateFiles[i]);
		}
		var fs = formComponents.filterSelect({ view: templateSelectView, items: items });
		for (i=0;i<fs.length;i++){
			fs[i].bound = i;
			fs[i].addEventListener('click', function(){
				var i = this.bound;
				if (i==0){
					// show the template loader
					self.templateLoader();
				} else if (i==1){
					// a new template is to be created, open the template editor
					self.templateEditor();
				} else {
					// an existing template was selected, load it
					currentTemplateName = items[i];
					templateSelectView.getParent().remove(templateSelectView);
					self.showTemplateInstanceSelect();
				}
			});
		}
		
		self.add(templateSelectView);
	};
	
	self.showTemplateInstanceSelect = function(){
		var templateSelectView = Ti.UI.createView({
			top: 0,
			backgroundColor: '#ffffff',
			width: '100%',
			height: '100%',
			zIndex: 1
		});
		
		var currentTemplateInstances = Ti.Filesystem.getFile(Ti.Filesystem.applicationDataDirectory+'/data', currentTemplateName).getDirectoryListing();
		currentTemplateInstances.unshift('');
		var fs = formComponents.filterSelect({ view: templateSelectView, items: currentTemplateInstances });
		fs[0].remove(fs[0].children[0]);
		var newForm = Ti.UI.createTextField({
		    width: 200,
		    left: 10,
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
			templateSelectView.parent.remove(templateSelectView);
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
	
	// get the list of available templates from the server and allow downloading to device
	self.templateLoader = function(){
		
	};
	
	// show the template editor
	self.templateEditor = function(){
		// check if this is an existing template, otherwise create a new one
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
			if (currentFormName){
				return true;
			} else {
				// something went wrong with the name picking
				alert('could not instanciate template');
			}
		} else {
			alert('The requested template "'+currentTemplateName+'" is not available on this device.');
			return false;
		}
	};
	
	// show a list of available controlled vocabularies and allow CV creation
	// also allow CV modification for locally stored CVs
	self.manageCVs = function(){
		
	};
	
	// show a list of CVs available on the server and allow download / update
	self.downloadCVs = function(){
		
	};
	
	// render the current form
	self.renderForm = function(){
		var tabGroup = Ti.UI.createTabGroup({
			bottom: 0,
			width: '100%',
			height: '100%'
			});
 
			var currentControl = null;
 
 			var closeBtn = Ti.UI.createButton({
				title: 'Back'
		});
		closeBtn.addEventListener('click',
			function(e) {
				currentDatasetIndex = entryData.length;
				currentDataset = {};
				tabGroup.close();
			}
		);
		
		var nextBtn = Ti.UI.createButton({
			title: 'Store'
		});
		nextBtn.addEventListener('click',
			function(e){
				// fill in default values for entries that were not chqnged by the user
				for (i in formDefinition.fields){
					if (formDefinition.fields.hasOwnProperty(i) && ! currentDataset.hasOwnProperty(i)){
						currentDataset[i] = formDefinition.fields[i].value;
					}
				}
				
				entryData[currentDatasetIndex] = currentDataset;
				currentDatasetIndex++;
				currentDataset = entryData[currentDatasetIndex] ? entryData[currentDatasetIndex] : {};
				Ti.Filesystem.getFile(Ti.Filesystem.applicationDataDirectory+'/data/'+currentTemplateName+'/'+currentFormName).write(JSON.stringify(entryData));
				self.renderForm();
				tabGroup.close();
			}
		);

		for (var i=0;i<formDefinition.groups.length;i++){
			var currGroup = formDefinition.groups[i];
			var tabWin = Ti.UI.createWindow({
				title: (currGroup.label ? currGroup.label : 'Main') + ' ['+currentDatasetIndex+']',
				backgroundColor: '#000',
				width: '100%',
				height: '100%'
			});
			
			var tabScroll = Ti.UI.createScrollView();
			tabWin.add(tabScroll);
			var tab = Ti.UI.createTab({
				icon: 'KS_nav_ui.png',
				width: '100%',
				height: '100%',
				title: currGroup.label ? currGroup.label : 'Main',
				window: tabWin
			});
			
			tabWin.leftNavButton = closeBtn;
			tabWin.rightNavButton = nextBtn;
			
			var tabLabel = Ti.UI.createLabel({
				color:'#ffffff',
				text: currGroup.description,
				top: 10,
				height:'auto',
				width:'auto'
			});
			
			tabScroll.add(tabLabel);
			
			var currTop = 50;
			
			// iterate through the fields of the form
			// the switch statement handles the different form types
			for (var h=0;h<currGroup.fields.length;h++) {
				var currField = formDefinition.fields[currGroup.fields[h]];
				switch (currField.type) {
					case 'textbox':
						var textLabel = Ti.UI.createLabel({
							color:'#ffffff',
							text: currField.label,
							left: 10,
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
							left: 10,
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
							left: 10,
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
							left: 10,
							width: 250,
							value: currentDataset[currField.label] ? currentDataset[currField.label] : (currField.value ? currField.value : ''),
							height: 'auto',
							bound: [i,h]
						});
						textField.addEventListener('change', function(e){
							currentDataset[formDefinition.groups[this.bound[0]].fields[this.bound[1]]] = this.value;
						});
						
						tabScroll.add(textField);
						
						var locationButton = Ti.UI.createButton({ title: 'get',
															  	  top: currTop,
																  left: 260,
																  height: 'auto',
																  bound: textField });
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
							})
						});
						currTop += 40;
					break;
					case 'image':
						var textLabel = Ti.UI.createLabel({
							color:'#ffffff',
							text: currField.label,
							left: 10,
							top: currTop,
							height:'auto',
							width:'auto'
						});
						
						tabScroll.add(textLabel);
						currTop += 20;
						
						var cameraButton = Ti.UI.createButton({ title: 'take picture',
																top: currTop,
																left: 200,
																height: 'auto' });
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
								left: 10,
								top: currTop,
								height:'auto',
								width:'auto'
							});
						
							tabScroll.add(textLabel);
						
							currTop += 30;
							
							// select box
							var picker = Ti.UI.createPicker({top:43});
							picker.selectionIndicator=true;
							var pickerValues = []	
							for (var j=0;j<cv.terms.length;j++) {
								pickerValues.push(Ti.UI.createPickerRow({title:cv.terms[j]}));
							}
							picker.add(pickerValues);
							
							if (h==0){
								currentControl = picker;
							}
							
							if (Ti.Platform.osname === 'android') {
								picker.bound = [i,h];
								picker.addEventListener('change', function(e){
									currentDataset[formDefinition.groups[this.bound[0]].fields[this.bound[1]]] = this.getSelectedRow(0).title;
								});
								picker.top = currTop;
								picker.left = 10;
								tabScroll.add(picker);
							} else {
								var picker_view = Ti.UI.createView({
									height:251,
									bottom:-400,
									zIndex: 1
								});
 
								var slide_in = Ti.UI.createAnimation({bottom:0});
								var slide_out = Ti.UI.createAnimation({bottom:-400});
 
								var cancel = Ti.UI.createButton({
									title:'Cancel',
									style:Ti.UI.iPhone.SystemButtonStyle.BORDERED,
									bound: picker
								});
								cancel.addEventListener('click',function() {
									//this.bound.columns[0].removeRow(this.bound.columns[0].rows[1]);
									//this.bound.reloadColumn(this.bound.columns[0]);
									picker_view.animate(slide_out);
								});
 
								var done = Ti.UI.createButton({
									title:'Done',
									style:Ti.UI.iPhone.SystemButtonStyle.DONE
								});
 
								var spacer = Ti.UI.createButton({
									systemButton:Titanium.UI.iPhone.SystemButton.FLEXIBLE_SPACE
								});
								
								var toolbar = Ti.UI.iOS.createToolbar({ top:0,
																	    items:[cancel,spacer,done]});
								
								picker_view.add(toolbar);
								picker_view.add(picker);
								
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
  									left: 10,
 									width: 300,
 									editable: false,
 									value: currentDataset[currField.name] ? currentDataset[currField.name] : (currField.value ? currField.value : ''),
 									height: 'auto',
 									rightButton:drop_button,
									rightButtonMode:Titanium.UI.INPUT_BUTTONMODE_ALWAYS,
								});
								drop_button.addEventListener('click', function(e){
									picker_view.animate(slide_in);
									
								});
								textField.addEventListener('click', function(e){
									picker_view.animate(slide_in);
									
								});
								done.bound = [i,h,textField];
								done.addEventListener('click',function() {
									this.bound[2].value = picker.getSelectedRow(0).title;
									currentDataset[formDefinition.groups[this.bound[0]].fields[this.bound[1]]] = this.bound[2].value;
									picker_view.animate(slide_out);
								});
							
								tabScroll.add(textField);
								tabScroll.add(picker_view);
							}
							
							currTop += 50;
						} else {
							alert('radio type fields must have a controlled vocabulary validation')
						}
					break;
					case 'boolean':
						var textLabel = Ti.UI.createLabel({
							color:'#ffffff',
							text: currField.label,
							left: 10,
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
						alert('invalid field type "'+currField.type+'"')
					break;
				}
			}
			
			tabGroup.addTab(tab);	
		}

		tabGroup.open();
	};
	
	// show the options when a form is selected
	self.showFormOptions = function(){
		var formView = Ti.UI.createView({
			top: 0,
			backgroundColor: '#ffffff',
			width: '100%',
			height: '100%',
			zIndex: 1
		});
		
		var formLabel = Ti.UI.createLabel({
			color:'#000000',
			text: currentTemplateName + ' - ' + currentFormName,
			top: 10,
			height:'auto',
			width:'auto'
		});
		
		formView.add(formLabel);
		
		var buttons = formComponents.buttonMenu(['spacer', 'enter data', 'view data', 'export data', 'switch template', 'modify template']);
		buttons['enter data'].addEventListener('click',self.renderForm);
		formView.add(buttons['enter data']);
		buttons['view data'].addEventListener('click',self.selectDataset);
		formView.add(buttons['view data']);
		buttons['export data'].addEventListener('click',self.exportDataOptions);
		formView.add(buttons['export data']);
		buttons['switch template'].addEventListener('click',self.showTemplateSelect);
		formView.add(buttons['switch template']);
		buttons['modify template'].addEventListener('click',self.templateEditor);
		formView.add(buttons['modify template']);
		
		self.add(formView);
	};
	
	// show the dataset selection
	self.selectDataset = function(){
		var datasetSelectView = Ti.UI.createView({
			top: 0,
			backgroundColor: '#ffffff',
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
			backgroundColor: '#ffffff',
			width: '100%',
			height: '100%',
			zIndex: 2
		});
		
		var buttons = formComponents.buttonMenu(['back', 'export to email', 'upload to MG-RAST', 'export to file']);
		buttons['back'].addEventListener('click',function(){
			formView.getParent().remove(formView);
			self.showFormOptions();
		});
		formView.add(buttons['back']);
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
		buttons['export to file'].addEventListener('click',self.showTemplateSelect);
		formView.add(buttons['export to file']);
		
		self.add(formView);
	};

	// first have the user select a form instance
	// from there, each view will set the next view
	self.showFormInstanceSelect();
	
				
	return self;
}

module.exports = FormView;