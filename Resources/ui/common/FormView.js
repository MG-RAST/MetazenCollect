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
						   	
	var buttonHeight = 35;
	if (Ti.Platform.osname === 'android') {
		buttonHeight = 50;
	}
                        
    var formLabel = Ti.UI.createLabel({
		color:'#000000',
		text: formDefinition.label,
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

	viewDataButton.addEventListener('click', 
		function(e){
			var listView = Ti.UI.createScrollView({
				top: 0,
				width: '100%',
				height: '100%',
				zIndex: 1
			});
			self.add(listView);
			
			var currTop = 10;
			for (var i=0;i<entryData.length;i++){
				var label = Ti.UI.createLabel({
					color:'#ffffff',
					text: entryData[i][formDefinition.id],
					height:'auto',
					width:'auto',
					bound: i
				});
				label.addEventListener('click',
					function(e){
						currentDatasetIndex = this.bound;
						enterDataButton.fireEvent('click');
					}
				);
				listView.add(label);
			}
		}
	);
	
	enterDataButton.addEventListener('click',
		function(e) {
 
			var tabGroup = Ti.UI.createTabGroup({
				bottom: -500,
				width: '100%',
				height: '100%'
			});
 
 			var closeBtn = Ti.UI.createButton({
				title: 'Done'
			});
			closeBtn.addEventListener('click',
				function(e) {
					tabGroup.animate({
						duration: 400,
						bottom: -500
					},
					function() {
						tabGroup.close();
					});
				}
			);
			
			var nextBtn = Ti.UI.createButton({
				title: 'Store'
			});
			nextBtn.addEventListener('click',
				function(e){
					entryData[currentDatasetIndex] = currentDataset;
					currentDatasetIndex++;
					currentDataset = {};
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
 								value: currentDataset[currField.name] ? currentDataset[currField.name] : (currField.value ? currField.value : ''),
 								height: buttonHeight,
 								bound: [i,h]
							});
							textField.addEventListener('change', function(e){
								currentDataset[formDefinition.groups[this.bound[0]].fields[this.bound[1]].name] = this.value;
							});
							
							tabScroll.add(textField);
							
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
 								value: currentDataset[currField.name] ? currentDataset[currField.name] : (currField.value ? currField.value : ''),
 								height: buttonHeight,
 								bound: [i,h]
							});
							textField.addEventListener('change', function(e){
								currentDataset[formDefinition.groups[this.bound[0]].fields[this.bound[1]].name] = this.value;
							});
							
							tabScroll.add(textField);
							
							var locationButton = Ti.UI.createButton({ title: 'get',
																  	  top: currTop,
																	  left: 260,
																	  height: buttonHeight,
																	  bound: textField });
							tabScroll.add(locationButton);
							
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
											image: currentDataset[currField.name] ? currentDataset[currField.name] : currField.value,
											height: 300,
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
										currentDataset[formDefinition.groups[imageView.bound[0]].fields[imageView.bound[1]].name] = e.media;
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
								
								if (Ti.Platform.osname === 'android') {
									picker.bound = [i,h];
									picker.addEventListener('change', function(e){
										currentDataset[formDefinition.groups[this.bound[0]].fields[this.bound[1]].name] = this.getSelectedRow(0).title;
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
										currentDataset[formDefinition.groups[this.bound[0]].fields[this.bound[1]].name] = this.bound[2].value;
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
							
							var valueSwitch = Ti.UI.createSwitch({ value: currentDataset[currField.name] ? currentDataset[currField.name] : (currField.value ? currField.value : false),
																   bound: [i,h],
																   titleOn:'yes',
  																   titleOff:'no',
																   top: currTop });
							valueSwitch.addEventListener('change', function(e){
								currentDataset[formDefinition.groups[this.bound[0]].fields[this.bound[1]].name] = this.value;
							});
							
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
  
			tabGroup.animate({
				duration: 400,
				bottom: 0
			});
		});
				
	return self;
}

module.exports = FormView;