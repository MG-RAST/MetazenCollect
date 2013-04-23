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
 *  - create separate modules for each view
 *  - create component module for composite UI elements
 *  - create module for data management
 * 		- send / receive API
 * 		- store / load disk
 * 		- send email
 * 	- clean up nomenclature
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
	var self = Ti.UI.createView();
	
	var controlledVocabularies = {
									'gender': {
												type: 'short-list',
												description: 'gender',
												terms: [
															'male',
															'female'
													   ]
											   }
								 };
	
	var formDefinition = {
							name: 'exampleForm',
							label: 'Example Form',
							owner: 'public',
							description: 'This is an example form to demostrate the structure of the JSON representation of a form',
							id: 'name',
							fields: {
										'name': {
						   			   			 		label: 'name',
						   			   			 		description: 'name of the sample',
						   			   			 		value: null,
						   			   			 		type: 'textbox',
						   			   			 		validation: 'string'
						   			   			 	},
						   			  
						   			 	'biome': {
						   			   			 		label: 'biome',
						   			   			 		description: 'the biome the sample was taken from',
						   			   			 		value: null,
						   			   			 		type: 'textbox',
						   			   			 		validation: 'CV-biome'
						   			   			 	},
						   			   	'picture': {
						   			   			 		label: 'picture',
						   			   			 		description: 'picture of the sample site',
						   			   			 		value: null,
						   			   			 		type: 'image',
						   			   			 		validation: 'image'
						   			   			 	},
						   			   	'pH': {
						   			   			 		label: 'pH',
						   			   			 		description: 'the pH of the sample',
						   			   			 		value: null,
						   			   			 		type: 'textbox',
						   			   			 		validation: 'float'
						   			   			 	},
						   			   	'location': {
						   			   			 		label: 'location',
						   			   			 		description: 'the location of the sample',
						   			   			 		value: null,
						   			   			 		type: 'geolocation',
						   			   			 		validation: 'geolocation'
						   			   			 	},
						   			   	'gender': {
						   			   			 		label: 'gender',
						   			   			 		description: 'the pH of the sample',
						   			   			 		value: 'male',
						   			   			 		type: 'list',
						   			   			 		validation: 'cv-gender'
						   			   			 	},
						   			   	'sanitized': {
						   			   			 		label: 'sanitized',
						   			   			 		description: 'did the sample guy wash his hands',
						   			   			 		value: true,
						   			   			 		type: 'boolean',
						   			   			 		validation: 'boolean'
						   			   			 	}
						   	},
						   groups: [
						   			{
						   				name: 'fieldData',
						   				label: 'Field Data',
						   				description: 'All data that is collected in the field',
						   				fields: [
						   							'name',
						   							'biome',
						   							'picture',
						   							'pH',
						   							'location',
						   							'gender',
						   							'sanitized'
						   			   			]
						   			 }
						   		   ]
						  };
						   	
	var entryData = [];
	var currentDatasetIndex = 0;
	var currentDataset = {};
	var orientation = 'vertical';
	var availableForms = [];
	var filledForms = {};
	var currentFormInstanceName = 'hansolo'
	
	// check for existing form data
	var savedData = Ti.Filesystem.getFile(Ti.Filesystem.getApplicationDataDirectory() + '/formData');
	if (savedData.getSize() > 0){
		availableForms = JSON.parse(savedData.read());
	} else {
		savedData.write( JSON.stringify([ { name: 'Example Form',
											data: formDefinition } ]) );
	}
	
	// check for existing user input data
	var userData = Ti.Filesystem.getFile(Ti.Filesystem.getApplicationDataDirectory() + '/userData');
	if (userData.getSize() > 0){
		filledForms = JSON.parse(userData.read());
	} else {
		userData.write( JSON.stringify({ 'Example Form': { 'hansolo': [ { 'name': 'hans',
																		  'biome': 'biome 1' } ] } }));
	}
						   	
	var buttonHeight = 35;
	if (Ti.Platform.osname === 'android') {
		buttonHeight = 50;
	}
                        
    var formLabel = Ti.UI.createLabel({
		color:'#000000',
		text: formDefinition.label + ' - ' + currentFormInstanceName,
		top: 10,
		height:'auto',
		width:'auto'
	});
	self.add(formLabel);
	
	var selectFormButton = Ti.UI.createButton({
		title: 'select form',
		top: 50,
		width: 180,
		height: buttonHeight
	});
	
	self.add(selectFormButton);
	
	var exportButton = Ti.UI.createButton({
		title: 'export form',
		top: 100,
		width: 180,
		height: buttonHeight
	});
	
	var exportView = self.exportView = function (){
		var listView = Ti.UI.createView({
			top: 0,
			backgroundColor: '#ffffff',
			width: '100%',
			height: '100%',
			zIndex: 1
		});
		
		var cancel = Ti.UI.createButton({
			top: 5,
			left: 5,
		    title: 'Cancel',
		    width: 'auto',
		    height:30
		});
		cancel.addEventListener('click', function(e){
			self.remove(listView);
		});

		var viewTitle = Ti.UI.createLabel({
		    top: 8,
		    left: 100,
		    height: 'auto',
		    color: '#000000',
		    backgroundColor: '#ffffff',
		    text: 'Export Options'
		});
		
		listView.add(cancel);
		listView.add(viewTitle);
		
		self.add(listView);
		var array = [];

		// export to email
		var mailLabel = Ti.UI.createLabel({
			color:'#000000',
			backgroundColor:'#ffffff',
			text: 'eMail',
			height:'auto',
			width:'auto',
		});
		var mailRow = Ti.UI.createTableViewRow({
			height:46
		});
		mailRow.addEventListener('click',
			function(e){
				var emailDialog = Ti.UI.createEmailDialog();
				emailDialog.subject = 'MetazenCollect Data Export - ' + formDefinition.label + ': ' + currentFormInstanceName;
				emailDialog.messageBody = "MetazenCollect Data Export\n\nExport Form Type: " + formDefinition.label + "\nForm Instance Name: " + currentFormInstanceName;
				var f = Ti.Filesystem.getFile(Ti.Filesystem.getApplicationDataDirectory() + '/userData');
				emailDialog.addAttachment(f);
				emailDialog.open();
				self.remove(listView);
			}
		);
		mailRow.add(mailLabel);
		array.push(mailRow);
		
		// export to file
		var fileLabel = Ti.UI.createLabel({
			color:'#000000',
			backgroundColor:'#ffffff',
			text: 'file',
			height:'auto',
			width:'auto',
		});
		var fileRow = Titanium.UI.createTableViewRow({
			height:46
		});
		fileRow.addEventListener('click',
			function(e){
				alert('exporting to file');
				self.remove(listView);
			}
		);
		fileRow.add(fileLabel);
		array.push(fileRow);
				
		// export to API
		var apiLabel = Ti.UI.createLabel({
			color:'#000000',
			backgroundColor:'#ffffff',
			text: 'MG-RAST',
			height:'auto',
			width:'auto',
		});
		var apiRow = Ti.UI.createTableViewRow({
			height:46
		});
		apiRow.addEventListener('click',
			function(e){
				alert('exporting to MG-RAST');
				var url = "http://api.metagenomics.anl.gov/api2.cgi/metagenome/mgm4440026.3?verbosity=full";
				var client = Ti.Network.createHTTPClient({
			     	onload : function(e) {
			     		var response = JSON.parse(this.responseText);
			     		if (! response.error){
			       	 		alert('Your data was submitted successfully');
				       	 } else {
				       	 	alert('Your data submission failed: '+response.error);
				       	 }
 						self.remove(listView);
				    },
			     	onerror : function(e) {
			        	Ti.API.debug(e.error);
			         	alert('error');
     					self.remove(listView);
			     	},
			     	timeout : 5000  // in milliseconds
				 });
				 // Prepare the connection.
		 		client.open("GET", url);
		 		// Send the request.
		 		client.send();
			}
		);
		apiRow.add(apiLabel);
		array.push(apiRow);
		
		// create the table view
		var tableView = Ti.UI.createTableView({
			top: 40,
			data: array,
			style:Titanium.UI.iPhone.TableViewStyle.GROUPED
		});
					
		listView.add(tableView);
	};
	
	exportButton.addEventListener('click',self.exportView);
	
	self.add(exportButton);
	
	var enterDataButton = Ti.UI.createButton({
		title: 'enter data',
		top: 150,
		width: 180,
		height: buttonHeight
	});
 
	self.add(enterDataButton);

	var viewDataButton = Ti.UI.createButton({
		title: 'view data',
		top: 200,
		width: 180,
		height: buttonHeight
	});
 
	self.add(viewDataButton);
	
	var selectFormInstance = self.selectFormInstance = function (formName){
		var existingForms = filledForms[formName] ? filledForms[formName] : {};
		alert(existingForms);
	};
	
	var selectForm = self.selectForm = function (){
		var listView = Ti.UI.createView({
			top: 0,
			backgroundColor: '#ffffff',
			width: '100%',
			height: '100%',
			zIndex: 1
		});
		
		var cancel = Ti.UI.createButton({
			top: 5,
			left: 5,
		    title: 'Cancel',
		    width: 'auto',
		    height:30
		});
		cancel.addEventListener('click', function(e){
			self.remove(listView);
		});

		var filterbox = Ti.UI.createTextField({
		    width: 200,
		    top: 5,
		    left: 100,
		    height: 'auto',
		    color: '#000000',
		    backgroundColor: '#ffffff',
		    borderStyle: Ti.UI.INPUT_BORDERSTYLE_ROUNDED
		});
		
		listView.add(cancel);
		listView.add(filterbox);
		
		self.add(listView);
		var array = [];
		for (var i=0;i<availableForms.length;i++){
			var label = Ti.UI.createLabel({
				color:'#000000',
				backgroundColor:'#ffffff',
				text: availableForms[i].name,
				height:'auto',
				width:'auto',
			});
			var row = Titanium.UI.createTableViewRow({
				height:46
			});
			row.addEventListener('click',
				function(e){
					self.remove(listView);
					self.selectFormInstance(this.children[0].text);
				}
			);
			row.add(label);
			array.push(row);
		}
		
		var tableView = Ti.UI.createTableView({
			top: 40,
			data: array,
			style:Titanium.UI.iPhone.TableViewStyle.GROUPED
		});
		
		filterbox.addEventListener('change', function(e){
			if (this.value.length) {
				var currArray = [];
				for (i=0;i<array.length;i++){
					if (array[i].children[0].text.toLowerCase().indexOf(this.value.toLowerCase())>-1) {
						currArray.push(array[i]);
					}
				}
			} else {
				currArray = array;
			}
			tableView.data = currArray;
		});
					
		listView.add(tableView);

	};
	selectFormButton.addEventListener('click', self.selectForm);
	
	var viewDataset = self.viewDataset = function (){
		var listView = Ti.UI.createView({
			top: 0,
			backgroundColor: '#ffffff',
			width: '100%',
			height: '100%',
			zIndex: 1
		});
		
		var cancel = Ti.UI.createButton({
			top: 5,
			left: 5,
		    title: 'Cancel',
		    width: 'auto',
		    height:30
		});
		cancel.addEventListener('click', function(e){
			self.remove(listView);
		});

		var filterbox = Ti.UI.createTextField({
		    width: 200,
		    top: 5,
		    left: 100,
		    height: 'auto',
		    color: '#000000',
		    backgroundColor: '#ffffff',
		    borderStyle: Ti.UI.INPUT_BORDERSTYLE_ROUNDED
		});
		
		listView.add(cancel);
		listView.add(filterbox);
		
		self.add(listView);
		var array = [];
		for (var i=0;i<entryData.length;i++){
			var label = Ti.UI.createLabel({
				color:'#000000',
				backgroundColor:'#ffffff',
				text: entryData[i][formDefinition.id],
				height:'auto',
				width:'auto',
			});
			var row = Titanium.UI.createTableViewRow({
				height:46,
				bound: i
			});
			row.addEventListener('click',
				function(e){
					currentDatasetIndex = this.bound;
					currentDataset = entryData[currentDatasetIndex];
					self.remove(listView);
					enterDataButton.fireEvent('click');
				}
			);
			row.add(label);
			array.push(row);
		}
		
		var tableView = Ti.UI.createTableView({
			top: 40,
			data: array,
			style:Titanium.UI.iPhone.TableViewStyle.GROUPED
		});
		
		filterbox.addEventListener('change', function(e){
			if (this.value.length) {
				var currArray = [];
				for (i=0;i<array.length;i++){
					if (array[i].children[0].text.toLowerCase().indexOf(this.value.toLowerCase())>-1) {
						currArray.push(array[i]);
					}
				}
			} else {
				currArray = array;
			}
			tableView.data = currArray;
		});
					
		listView.add(tableView);
	};

	viewDataButton.addEventListener('click', self.viewDataset);
	
	enterDataButton.addEventListener('click',
		function(e) {
 
			var tabGroup = Ti.UI.createTabGroup({
				bottom: 0,
				width: '100%',
				height: '100%'
			});
 
			var currentControl = null;
 
 			var closeBtn = Ti.UI.createButton({
				title: 'Done'
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
					tabGroup.close();
					enterDataButton.fireEvent('click');
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
 								height: buttonHeight,
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
 								height: buttonHeight,
 								bound: [i,h]
							});
							textField.addEventListener('change', function(e){
								currentDataset[formDefinition.groups[this.bound[0]].fields[this.bound[1]]] = this.value;
							});
							
							tabScroll.add(textField);
							
							var locationButton = Ti.UI.createButton({ title: 'get',
																  	  top: currTop,
																	  left: 260,
																	  height: buttonHeight,
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
																	height: buttonHeight });
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
	 									height: buttonHeight,
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
		});
				
	return self;
}

module.exports = FormView;