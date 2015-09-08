function Workflow() {
	// global config variables
	var loginURL = "https://api.metagenomics.anl.gov/?verbosity=verbose";
	var templateURL = "http://shock.metagenomics.anl.gov/node";
	var templateQuery = "?query&application=metazen&type=template";
	var dataURL = "http://shock.metagenomics.anl.gov/node";
	var dataQuery = "?query&application=metazen&type=project";
	
	var customLoginURL = "";
	var customTemplateURL = "";
	var customDataURL = "";
	
	// initialize self
	var self = Ti.UI.createView({
		backgroundColor: '#000000',
		saving: false,
		user: null
	});
	
	// make sure we never lose data
	Titanium.App.addEventListener('close',function(e) { 
		self.saveDataset();
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
	
	self.silentTemplateSynch = false;
	
	// switch to a new view, cleaning up the old
	self.switchView = function (newView) {
		self.add(newView);
		if (status.currentView !== null) {
			self.remove(status.currentView);
		}
		
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
					currentGroupIndex: 0
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
		
		// check if image directory for samples exists
		var imgDir = Ti.Filesystem.getFile(Ti.Filesystem.applicationDataDirectory, 'images');
		if (! imgDir.exists()) {
		    imgDir.createDirectory();
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
		
		// check the server urls
		if (Ti.Filesystem.getFile(Ti.Filesystem.applicationDataDirectory+'/loginURL').exists()) {
			customLoginURL = Ti.Filesystem.getFile(Ti.Filesystem.applicationDataDirectory+'/loginURL').read().text;
		} else {
			customLoginURL = loginURL;
			Ti.Filesystem.getFile(Ti.Filesystem.applicationDataDirectory+'/loginURL').write(loginURL);
		}
		if (Ti.Filesystem.getFile(Ti.Filesystem.applicationDataDirectory+'/templateURL').exists()) {
			customTemplateURL = Ti.Filesystem.getFile(Ti.Filesystem.applicationDataDirectory+'/templateURL').read().text;
		} else {
			customTemplateURL = templateURL;
			Ti.Filesystem.getFile(Ti.Filesystem.applicationDataDirectory+'/templateURL').write(templateURL);
		}
		if (Ti.Filesystem.getFile(Ti.Filesystem.applicationDataDirectory+'/dataURL').exists()) {
			customDataURL = Ti.Filesystem.getFile(Ti.Filesystem.applicationDataDirectory+'/dataURL').read().text;
		} else {
			customDataURL = dataURL;
			Ti.Filesystem.getFile(Ti.Filesystem.applicationDataDirectory+'/dataURL').write(dataURL);
		}
		
		if (norelay){
			return;
		}
		
		// add the logo, visible in all views except splash
		var logo = Ti.UI.createImageView({
			image:'metazen_logo_wide.png',
			top: '30px',
			width: '99%',
			height: 'auto'
		});
		self.add(logo);
		
		self.showSplash();
	};
	
	// SERVER QUERIES
	
	// synch templates
	self.synchTemplates = function(){
		var client = Ti.Network.createHTTPClient({
	     	onload : function(e) {
	     		var response;
	     		try {
	     			response = JSON.parse(this.responseText).data;
	     			self.numTemplatesSynched = 0;
					self.totalNumTemplates = response.length;
	     			for (var i=0; i<response.length; i++) {
						var tURL = customTemplateURL + "/" + response[i].id+"?download";
						var cl = Ti.Network.createHTTPClient({
					     	onload : function(e) {
					     		var resp;
					     		try {
					     			resp = JSON.parse(this.responseText);
					     			self.numTemplatesSynched++;
					     			if (self.numTemplatesSynched == self.totalNumTemplates) {	
						     			if(! self.silentTemplateSynch) {
						     				alert('templates synchronized');
						     			}
						     			self.silentTemplateSynch = false;
						     		}
					     		} catch (error) {
					     			var dialog = Ti.UI.createAlertDialog({
				     					title: "synchronization error",
				     					message: "the template server sent and invalid template",
				     					buttonNames: ["OK"]
				     				});
				     				dialog.show();
				     				return;
					     		}
				     			Ti.Filesystem.getFile(Ti.Filesystem.applicationDataDirectory+'/templates/'+resp.name).write(JSON.stringify(resp));
								var tdir = Ti.Filesystem.getFile(Ti.Filesystem.applicationDataDirectory+'/data/',resp.name);
								if (! tdir.exists()) {
						 		   tdir.createDirectory();
								}
								
								var templatePresent = false;
								for (var i=0;i<status.templates.length;i++) {
									if (status.templates[i] == resp.name) {
										templatePresent = true;
										break;
									}
								}
								if (! templatePresent) {
									status.templates.push(resp.name);
								}
						    },
					     	onerror : function(e) {
					     		console.log(e);
					         	var dialog = Ti.UI.createAlertDialog({
			     					title: "synchronization error",
			     					message: "a system error ocurred when synchronizing one of the templates",
			     					buttonNames: ["OK"]
			     				});
			     				dialog.show();
					     	},
					     	timeout : 5000  // in milliseconds
						 });
						 
						 // Prepare the connection.
				 		cl.open("GET", tURL);
				 		
				 		// Send the request.
				 		cl.send();
	     			}
	     		} catch (error) {
	     			var dialog = Ti.UI.createAlertDialog({
     					title: "synchronization error",
     					message: "the template server could not be reached",
     					buttonNames: ["OK"]
     				});
     				dialog.show();
     				return;
	     		}
		    },
	     	onerror : function(e) {
	         	var dialog = Ti.UI.createAlertDialog({
 					title: "synchronization error",
 					message: "a system error ocurred when synchronizing templates",
 					buttonNames: ["OK"]
 				});
 				dialog.show();
	     	},
	     	timeout : 5000  // in milliseconds
		 });
		 
		 // set auth header
		 client.setRequestHeader('Authorization', "mgrast "+self.user.token);
		 
		 // Prepare the connection.
 		client.open("GET", customTemplateURL + "/" + templateQuery);
 		
 		// Send the request.
 		client.send();	
	};
	
	// perform the dataset synch operation
	self.doDatasetSynch = function(){
		var tURL = customDataURL;
		var cl = Ti.Network.createHTTPClient({
			onload : function(e) {
	     		var resp;
	     		try {
	     			resp = JSON.parse(this.responseText);
	     			var dialog = Ti.UI.createAlertDialog({
     					title: "synchronization OK",
     					message: "the data was successfully stored on the server",
     					buttonNames: ["OK"]
     				});
     				dialog.show();
     				return;
	     		} catch (error) {
	     			var dialog = Ti.UI.createAlertDialog({
     					title: "synchronization error",
     					message: "the data server sent and invalid response",
     					buttonNames: ["OK"]
     				});
     				dialog.show();
     				return;
	     		}
		    },
	     	onerror : function(e) {
	     		console.log(e);
	         	var dialog = Ti.UI.createAlertDialog({
 					title: "synchronization error",
 					message: "a system error ocurred when synchronizing the dataset",
 					buttonNames: ["OK"]
 				});
 				dialog.show();
	     	},
	     	timeout : 5000  // in milliseconds
		});
		
		// Prepare the connection.
 		cl.open("POST", tURL);
 		
 		// set auth header
		cl.setRequestHeader('Authorization', "mgrast "+self.user.token);
		
		var content = '';
		var boundary = '---------------------------170062046428149';

		content += '--'+ boundary + '\r\n';
		content += 'Content-Disposition: form-data; name="upload"; filename="project.json"\r\n';
		content += 'Content-Type: binary/octet-stream\r\n';
		content += '\r\n';
		
		var full_content = Ti.createBuffer({value: content});
		
		var dataFile = Ti.createBuffer({value : JSON.stringify(status.datasets[status.currentTemplate][status.currentDataset])});
		full_content.append(dataFile);
		
		content = '\r\n--'+ boundary + '\r\n';
		content += 'Content-Disposition: form-data; name="attributes"; filename="attributes"\r\n';
		content += 'Content-Type: binary/octet-stream\r\n';
		content += '\r\n';		
		full_content.append(Ti.createBuffer({value: content}));
		
		var attFile = Ti.createBuffer({value : JSON.stringify({
		 							"application": "metazen",
		 			 				"type": "project",
		 			  				"template": status.currentTemplate,
		 			   				"project": status.currentDataset })});
		full_content.append(attFile);
		content = '\r\n';
		content += '--'+ boundary + '--\r\n';
		full_content.append(Ti.createBuffer({value: content}));
		
		var send_data = full_content.toBlob();
		
		cl.setRequestHeader('Content-Type', 'multipart/form-data; boundary=' + boundary);
		
		// Send the request.
 		cl.send(send_data);
	};
	
	// VIEWS
	
	// initial screen
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
		
		var label = Ti.UI.createLabel({
			color: formComponents.labelFontColor,
			text: 'mobile metadata capture',
			height:'auto',
			font: formComponents.labelFont,
			width:'auto',
			bottom: 100
		});
		splashScreen.add(label);
		
		self.checkLogin(splashScreen);
			
		// show the screen
		self.switchView(splashScreen);
	};
	
	// token check at startup
	self.checkLogin = function (view) {
		// check if there is already a user with a valid token
		if (Ti.Filesystem.getFile(Ti.Filesystem.applicationDataDirectory+'/user').exists()) {
			self.user = JSON.parse(Ti.Filesystem.getFile(Ti.Filesystem.applicationDataDirectory+'/user').read().text);
			var client = Ti.Network.createHTTPClient({
		     	onload : function(e) {
		     		var response;
		     		try {
		     			response = JSON.parse(this.responseText);
		     		} catch (error) {
		     			self.loginForm(view);
	     				return;
		     		}
	     			if (response.ERROR) {
	     				var dialog = Ti.UI.createAlertDialog({
	     					title: "Session Expired",
	     					message: "Your session has expired, you need to log in again.",
	     					buttonNames: ["OK"]
	     				});
	     				dialog.show();
	     				self.loginForm(view);
	     			} else {
	     				if (status.templates.length == 0) {
		     				self.silentTemplateSynch = true;
		     				self.synchTemplates();
	     				}
	     				var dialog = Ti.UI.createAlertDialog({
	     					title: "",
	     					message: "Welcome back "+(self.user.firstname ? self.user.firstname+" "+self.user.lastname : self.user.fullname),
	     					buttonNames: ["OK"]
	     				});
	     				dialog.addEventListener('click', function(e){
	     					self.checkSession();
	     				});
	     				dialog.show();
	     			}
			    },
		     	onerror : function(e) {
		         	self.loginForm(view);
		     	},
		     	timeout : 5000  // in milliseconds
			});
			 
		 	// Prepare the connection.
		 	client.open("GET", customLoginURL);

			// Send the request.
			client.send();
		} else {
			self.loginForm(view);
		}
	};
	
	// login input mask with server query
	self.loginForm = function (view) {
		var loginField = Ti.UI.createTextField({
			borderStyle: Ti.UI.INPUT_BORDERSTYLE_ROUNDED,
			color: formComponents.textFontColor,
			height: formComponents.buttonHeight,
			width: '35%',
			left: '5%',
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
			width: '35%',
			left: '41%',
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
			width: '18%',
			left: '77%'
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
	     				self.user = response;
	     				self.silentTemplateSynch = true;
	     				self.synchTemplates();
	     				var dialog = Ti.UI.createAlertDialog({
	     					title: "login successful",
	     					message: "Welcome "+(self.user.firstname ? self.user.firstname+" "+self.user.lastname : self.user.fullname),
	     					buttonNames: ["OK"]
	     				});
	     				dialog.addEventListener('click', function(e){
	     					self.checkSession();
	     				});
	     				dialog.show();
	     				Ti.Filesystem.getFile(Ti.Filesystem.applicationDataDirectory+'/user').write(JSON.stringify(self.user));
	     			}
			    },
		     	onerror : function(e) {
		     		console.log(e);
		         	var dialog = Ti.UI.createAlertDialog({
     					title: "login failed",
     					message: "invalid credentials",
     					buttonNames: ["OK"]
     				});
     				dialog.show();
		     	},
		     	timeout : 5000  // in milliseconds
			});
			 
		 	// Prepare the connection.
		 	client.open("GET", customLoginURL);
	 		
	 		// set auth
			var header = "mggo4711"+Ti.Utils.base64encode(loginField.value+":"+passwordField.value);
			client.setRequestHeader('Authorization', header);
			 
			// Send the request.
			client.send();
		});
		
		view.add(loginField);
		view.add(passwordField);
		view.add(sendBtn);
	};
	
	// check if there was a previous session, if so, restore it
	self.checkSession = function () {
		if (Ti.Filesystem.getFile(Ti.Filesystem.applicationDataDirectory+"/status").exists()) {
			
			// read the status file
			var currStat = JSON.parse(Ti.Filesystem.getFile(Ti.Filesystem.applicationDataDirectory+'/status').read().text);
			
			// check if the dataset still exists
			var currFn = Ti.Filesystem.applicationDataDirectory+'/data/'+currStat.template+"/"+currStat.dataset;
			currFn = currFn.replace(/\s/g, "%20");
			if (! (Ti.Filesystem.getFile(currFn).exists() && Ti.Filesystem.getFile(Ti.Filesystem.applicationDataDirectory+'/templates/'+currStat.template).exists())) {
				self.homeScreen();
				return;
			}
			
			// set dataset, template and hierarchy
			status.currentDataset = currStat.dataset;
			status.currentTemplate = currStat.template;
			status.currentHierarchy = currStat.hierarchy;
			
			// set group name, index and parent
			var lastHier = currStat.hierarchy[currStat.hierarchy.length - 1];
			status.currentGroupName = lastHier.name;
			status.currentGroupIndex = lastHier.index;
			status.currentParentName = null;
			status.currentTemplateRoot = currStat.hierarchy[0].name;
			if (currStat.hierarchy.length > 1) {
				status.currentParentName = currStat.hierarchy[currStat.hierarchy.length - 2].name;
			}
			
			// load template
			status.templateStructures[status.currentTemplate] = JSON.parse(Ti.Filesystem.getFile(Ti.Filesystem.applicationDataDirectory+'/templates/'+status.currentTemplate).read().text);
			
			// load dataset
			self.loadCurrentDataset();
			
			// display the dataset edit view
			self.showDatasetEdit();
		} else { 
			self.homeScreen();
		}
	};
	
	// main menu
	self.homeScreen = function() {
		var homeView = Ti.UI.createView({
			backgroundColor: '#000000',
			width: '100%',
			top: formComponents.topMargin,
			height: 'auto',
			zIndex: 1
		});
		
		var buttons = formComponents.buttonMenu(['spacer','new project','edit project','edit template', 'options'], 20);
		buttons['new project'].addEventListener('click',self.showTemplateSelect);
		homeView.add(buttons['new project']);
		buttons['edit project'].addEventListener('click',self.showDatasetSelect);
		homeView.add(buttons['edit project']);
		buttons['options'].addEventListener('click',self.manageFiles);
		homeView.add(buttons['options']);
				
		var label = Ti.UI.createLabel({
			color: formComponents.labelFontColor,
			text: 'Main Menu',
			height:'auto',
			font: formComponents.labelFont,
			width:'auto',
			top: '0px'
		});
		homeView.add(label);
		
		var login = Ti.UI.createLabel({
			color: formComponents.labelFontColor,
			text: 'logged in as '+(self.user.firstname ? self.user.firstname+" "+self.user.lastname : self.user.fullname),
			height:'auto',
			font: formComponents.labelFont,
			width:'auto',
			bottom: 0,
			left: formComponents.buttonSideMargin
		});
		homeView.add(login);
		
		var logoutButton = Ti.UI.createButton({
			width: formComponents.smallButtonWidth,
			height: formComponents.buttonHeight,
			title: "logout",
			bottom: 0,
			right: formComponents.buttonSideMargin
		});
		formComponents.styleButton(logoutButton);
		logoutButton.backgroundGradient.colors = ['#EE5F5B', '#BD362F'];
		logoutButton.addEventListener('click', function () {
			Ti.Filesystem.getFile(Ti.Filesystem.applicationDataDirectory+'/status').deleteFile();
			Ti.Filesystem.getFile(Ti.Filesystem.applicationDataDirectory+'/user').deleteFile();
			self.user = null;
			self.showSplash();
		});
		homeView.add(logoutButton);
		
		self.switchView(homeView);
	};
		
	// template selection
	self.showTemplateSelect = function(){
		var templateSelectView = Ti.UI.createView({
			top: formComponents.topMargin,
			backgroundColor: '#000000',
			width: '100%',
			height: 'auto',
			zIndex: 1
		});
		
		// title
		var titleLabel = Ti.UI.createLabel({
			top: 0,
			left: 10,
			color: formComponents.labelFontColor,
			text: 'select a template', 
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
					title: 'enter project name'
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
								alert('a project with that name already exists');
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
			height: 'auto',
			zIndex: 1
		});
		
		// title
		var titleLabel = Ti.UI.createLabel({
			top: 0,
			left: 10,
			color: formComponents.labelFontColor,
			text: 'select a project', 
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
	
	// show the dataset select for project synch
	self.synchDatasets = function() {
		var datasetSelectView = Ti.UI.createView({
			top: formComponents.topMargin,
			backgroundColor: '#000000',
			width: '100%',
			height: 'auto',
			zIndex: 1
		});
		
		// title
		var titleLabel = Ti.UI.createLabel({
			top: 0,
			left: 10,
			color: formComponents.labelFontColor,
			text: 'select a project', 
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
				self.doDatasetSynch();
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
				try {
					status.templateStructures[status.currentTemplate] = JSON.parse(Ti.Filesystem.getFile(Ti.Filesystem.applicationDataDirectory+'/templates/'+status.currentTemplate).read().text);
				} catch (error) {
					alert("The selected template could not be found on the device");
					self.homeScreen();
					return;
				}
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
				status.currentHierarchy.push({ "name": status.currentGroupName, "index": 0 });
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
			height: 'auto',
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
					self.saveStatus();
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
					text: status.templateStructures[status.currentTemplate].groups[status.currentGroupName].toplevel ? "Project: " + status.currentDataset : status.templateStructures[status.currentTemplate].groups[status.currentGroupName].label, 
					font: formComponents.labelFont,
					height:'auto',
					width:'auto',
					align: 'left',
					top: formComponents.titleOffset,
					left: (formComponents.buttonSideMargin * 2) + formComponents.smallButtonWidth
				});
		navView.add(titleLabel);
		
		// list navigator
		if (status.currentHierarchy.length > 1) {
			var parent = self.getCurrentDataset(true);
			if (typeof parent[status.currentGroupName].length == 'number') {
				if (self.swipeListener) {
					self.removeEventListener('swipe',self.swipeListener);
				}
				self.swipeListener = function(e){
					if (e.direction == 'right') {
						if (status.currentGroupIndex > 0) {
							self.saveDataset();
							status.currentGroupIndex--;
							status.currentHierarchy[status.currentHierarchy.length - 1].index = status.currentGroupIndex;
							self.saveStatus();
							self.showDatasetEdit();
						}
						return false;
					} else {
						self.saveDataset();
						status.currentGroupIndex++;
						status.currentHierarchy[status.currentHierarchy.length - 1].index = status.currentGroupIndex;
						self.saveStatus();
						self.showDatasetEdit();
						return false;
					}
				};
				self.addEventListener('swipe', self.swipeListener);
				var numTotal = parent[status.currentGroupName].length;
				var positionLabel = Ti.UI.createLabel({
						color: formComponents.labelFontColor,
						text: "["+(status.currentGroupIndex + 1)+" of "+numTotal+"]", 
						font: formComponents.labelFont,
						height:'auto',
						width:'auto',
						top: formComponents.titleOffset,
						right: formComponents.isTablet ? formComponents.buttonSideMargin + 2 + formComponents.miniButtonWidth : formComponents.buttonSideMargin,
						zIndex: 10
					});
				navView.add(positionLabel);
				if (status.currentGroupIndex > 0 && formComponents.isTablet) {
					var leftBtn = Ti.UI.createButton({
						width: formComponents.miniButtonWidth,
						height: formComponents.buttonHeight,
						title: "<",
						right: formComponents.buttonSideMargin + 4 + formComponents.miniButtonWidth + 48 + ((positionLabel.text.length - 6) * 14),
						top: 0,
						zIndex: 10
					});
					leftBtn.addEventListener('click',
						function(e) {
							self.saveDataset();
							status.currentGroupIndex--;
							status.currentHierarchy[status.currentHierarchy.length - 1].index = status.currentGroupIndex;
							self.saveStatus();
							self.showDatasetEdit();
						}
					);
					formComponents.styleButton(leftBtn);
					navView.add(leftBtn);
				}
				if (formComponents.isTablet) {
					var rightBtn = Ti.UI.createButton({
						width: formComponents.miniButtonWidth,
						height: formComponents.buttonHeight,
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
							self.saveStatus();
							self.showDatasetEdit();
						}
					);
					formComponents.styleButton(rightBtn);
					navView.add(rightBtn);
				}
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
						self.saveStatus();
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
					inputFields[i].elements[0].bound2 = i + 1;
					inputFields[i].elements[0].addEventListener('return', function(event){
						try {
							inputFields[this.bound2].elements[0].focus();
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
					width: formComponents.splitWidthLeft,
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
					width: formComponents.splitWidthRight,
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
					right: formComponents.buttonSideMargin
				});
				formComponents.styleButton(cameraButton);
				
				var imageView = Titanium.UI.createImageView({
					image: fieldSet[fieldDefinition.name] || "nopic.jpg",
					width: 'auto',
					height: 'auto',
					top: currTop + formComponents.buttonHeight + 5,
					bound: fieldDefinition.name
				});
				var w, h;
				var hmax = 250;
				if (fieldSet[fieldDefinition.name]) {
					w = imageView.rect.width;
					h = imageView.rect.height;
					var ratio = hmax/h;
				    h = hmax;
				    w = w * ratio;	
					if (w > formComponents.maxWidth) {
						var ratio = formComponents.maxWidth/w;
						w = formComponents.maxWidth;
						h = h * ratio;
					}
				} else {
					h = hmax;
					w = "auto";
				}
				imageView.width = w;
				imageView.height = h;
					
				cameraButton.addEventListener('click', function(e){
					Ti.Media.showCamera({
						mediaTypes: [ Ti.Media.MEDIA_TYPE_PHOTO ],
						saveToPhotoGallery: false,
						success: function(e){
							imageView.image = e.media;
							imageView.width = "auto";
							imageView.height = "auto";
							w = imageView.width;
							h = imageView.height;
							var hmax = 250;
						    var ratio = hmax/h;
						    h = hmax;
						    w = w * ratio;	
							if (w > formComponents.maxWidth) {
								var ratio = formComponents.maxWidth/w;
								w = formComponents.maxWidth;
								h = h * ratio;
							}
							imageView.width = w;
							imageView.height = h;
							var imgnum = Titanium.Filesystem.getFile(Titanium.Filesystem.applicationDataDirectory, "/images").getDirectoryListing().length;
							var f = Titanium.Filesystem.getFile(Titanium.Filesystem.applicationDataDirectory, "/images/"+imgnum+".jpg");
							f.write(e.media);
							fieldSet[imageView.bound] = f.nativePath;
						},
						error: function(e){
							alert('an error occurred while taking the picture');
						},
						cancel: function(e){
							alert('Photo cancelled.');
						}
					});
				});
				
				return { elements: [ cameraButton, imageView ], currTop: (260 + formComponents.buttonHeight) };					
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
						self.add(selectView);
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
			height: 'auto',
			zIndex: 1
		});
		
		var buttons = formComponents.buttonMenu(['spacer', 'export project','upload project', 'synchronize templates', 'select servers', 'delete local files', 'spacer', 'main menu']);
		buttons['export project'].addEventListener('click',self.showDatasetExport);
		manageView.add(buttons['export project']);
		buttons['upload project'].addEventListener('click',self.synchDatasets);
		manageView.add(buttons['upload project']);
		buttons['synchronize templates'].addEventListener('click',self.synchTemplates);
		manageView.add(buttons['synchronize templates']);
		buttons['select servers'].addEventListener('click',self.selectServers);
		manageView.add(buttons['select servers']);
		buttons['delete local files'].addEventListener('click',self.showFileDelete);
		manageView.add(buttons['delete local files']);
		buttons['main menu'].addEventListener('click',self.homeScreen);
		manageView.add(buttons['main menu']);
				
		var label = Ti.UI.createLabel({
			text: 'Options',
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
			height: 'auto',
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
						self.checkStatus(true);
						
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
			height: 'auto',
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
			height: 'auto',
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
	};
	
	self.selectServers = function () {
		var view = Ti.UI.createView({
			top: formComponents.topMargin,
			backgroundColor: '#000000',
			width: '100%',
			height: 'auto',
			zIndex: 1
		});
		
		var label1 = Ti.UI.createLabel({
			color: formComponents.labelFontColor,
			text: 'login URL',
			height:'auto',
			font: formComponents.labelFont,
			width:'auto',
			top: 65
		});
			
		var inputField1 = Ti.UI.createTextField({
			borderStyle: Ti.UI.INPUT_BORDERSTYLE_ROUNDED,
			color: formComponents.textFontColor,
			height: formComponents.buttonHeight,
			width: '48%',
			left: "5%",
			top: 100,
			autocorrect: false,
			font: formComponents.textFont,
			hintText: customLoginURL,
			autocapitalization: Ti.UI.TEXT_AUTOCAPITALIZATION_NONE
		});
		inputField1.addEventListener('return', function(event){
			setButton1.fireEvent('click');
		});
		
		var setButton1 = Ti.UI.createButton({
			height: formComponents.buttonHeight,
			title: "set",
			width: '20%',
			left: '54%',
			top: 100
		});
		formComponents.styleButton(setButton1);
		setButton1.addEventListener('click', function(e){
			var srv = inputField1.value;
			if (srv.length) {
				if (! srv.match(/^https?\:\/\//)) {
					srv = "http://"+srv;
					inputField1.value = srv;
				}
				customLoginURL = srv;
				Ti.Filesystem.getFile(Ti.Filesystem.applicationDataDirectory+'/loginURL').write(customLoginURL);
				alert('synchronization server set');
			} else {
				alert('you must enter a URL');
			}
		});
		var resetButton1 = Ti.UI.createButton({
			height: formComponents.buttonHeight,
			title: "default",
			width: '20%',
			left: '75%',
			top: 100
		});
		formComponents.styleButton(resetButton1);
		resetButton1.addEventListener('click', function(e){
			inputField1.value = loginURL;
			setButton1.fireEvent('click');
		});
		view.add(label1);
		view.add(inputField1);
		view.add(setButton1);
		view.add(resetButton1);
		
		var label2 = Ti.UI.createLabel({
			color: formComponents.labelFontColor,
			text: 'template URL',
			height:'auto',
			font: formComponents.labelFont,
			width:'auto',
			top: 165
		});
			
		var inputField2 = Ti.UI.createTextField({
			borderStyle: Ti.UI.INPUT_BORDERSTYLE_ROUNDED,
			color: formComponents.textFontColor,
			height: formComponents.buttonHeight,
			width: '48%',
			left: "5%",
			top: 200,
			autocorrect: false,
			font: formComponents.textFont,
			hintText: templateURL,
			autocapitalization: Ti.UI.TEXT_AUTOCAPITALIZATION_NONE
		});
		inputField2.addEventListener('return', function(event){
			setButton2.fireEvent('click');
		});
		
		var setButton2 = Ti.UI.createButton({
			height: formComponents.buttonHeight,
			title: "set",
			width: '20%',
			left: '54%',
			top: 200
		});
		formComponents.styleButton(setButton2);
		setButton2.addEventListener('click', function(e){
			var srv = inputField2.value;
			if (srv.length) {
				if (! srv.match(/^https?\:\/\//)) {
					srv = "http://"+srv;
					inputField2.value = srv;
				}
				customTemplateBaseURL = srv;
				Ti.Filesystem.getFile(Ti.Filesystem.applicationDataDirectory+'/templateURL').write(customTemplateBaseURL);
				alert('synchronization server set');
			} else {
				alert('you must enter a URL');
			}
		});
		var resetButton2 = Ti.UI.createButton({
			height: formComponents.buttonHeight,
			title: "default",
			width: '20%',
			left: '75%',
			top: 200
		});
		formComponents.styleButton(resetButton2);
		resetButton2.addEventListener('click', function(e){
			inputField2.value = templateURL;
			setButton2.fireEvent('click');
		});
		view.add(label2);
		view.add(inputField2);
		view.add(setButton2);
		view.add(resetButton2);
		
		var label4 = Ti.UI.createLabel({
			color: formComponents.labelFontColor,
			text: 'data URL',
			height:'auto',
			font: formComponents.labelFont,
			width:'auto',
			top: 265
		});
			
		var inputField4 = Ti.UI.createTextField({
			borderStyle: Ti.UI.INPUT_BORDERSTYLE_ROUNDED,
			color: formComponents.textFontColor,
			height: formComponents.buttonHeight,
			width: '48%',
			left: "5%",
			top: 300,
			autocorrect: false,
			font: formComponents.textFont,
			hintText: customDataURL,
			autocapitalization: Ti.UI.TEXT_AUTOCAPITALIZATION_NONE
		});
		inputField1.addEventListener('return', function(event){
			setButton4.fireEvent('click');
		});
		
		var setButton4 = Ti.UI.createButton({
			height: formComponents.buttonHeight,
			title: "set",
			width: '20%',
			left: '54%',
			top: 300
		});
		formComponents.styleButton(setButton4);
		setButton4.addEventListener('click', function(e){
			var srv = inputField4.value;
			if (srv.length) {
				if (! srv.match(/^https?\:\/\//)) {
					srv = "http://"+srv;
					inputField4.value = srv;
				}
				customDataURL = srv;
				Ti.Filesystem.getFile(Ti.Filesystem.applicationDataDirectory+'/dataURL').write(customDataURL);
				alert('synchronization server set');
			} else {
				alert('you must enter a URL');
			}
		});
		var resetButton4 = Ti.UI.createButton({
			height: formComponents.buttonHeight,
			title: "default",
			width: '20%',
			left: '75%',
			top: 300
		});
		formComponents.styleButton(resetButton4);
		resetButton4.addEventListener('click', function(e){
			inputField4.value = dataURL;
			setButton4.fireEvent('click');
		});
		view.add(label4);
		view.add(inputField4);
		view.add(setButton4);
		view.add(resetButton4);
		
		var backButton = Ti.UI.createButton({
			height: formComponents.buttonHeight,
			title: "back",
			width: formComponents.buttonWidth,
			bottom: 200
		});
		formComponents.styleButton(backButton);
		backButton.addEventListener('click', function(e){
			self.manageFiles();
		});
		
		view.add(backButton);
		
		self.switchView(view);
	};
	
	// DATA MANIPULATION
	
	// save the current dataset
	self.saveDataset = function () {
		var dsfn = Ti.Filesystem.applicationDataDirectory+'/data/'+status.currentTemplate+'/'+status.currentDataset;
		dsfn = dsfn.replace(/\s/g, "%20");
		Ti.Filesystem.getFile(dsfn).write(JSON.stringify(status.datasets[status.currentTemplate][status.currentDataset]));
	};
	
	self.saveStatus = function () {
		// save the current status
		var currStat = {
			hierarchy: status.currentHierarchy,
			template: status.currentTemplate,
			dataset: status.currentDataset
		};
		Ti.Filesystem.getFile(Ti.Filesystem.applicationDataDirectory+"/status").write(JSON.stringify(currStat));
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