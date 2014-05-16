//Application Window Component Constructor
function ApplicationWindow() {
	//load component dependencies
	var Workflow = require('ui/common/Workflow');
		
	//create component instance
	var self = Ti.UI.createWindow({
		backgroundColor:'#ffffff'
	});
		
	// set the valid orientation modes
	self.orientationModes = [Ti.UI.PORTRAIT, Ti.UI.UPSIDE_PORTRAIT];
		
	//construct UI
	var workflow = new Workflow();
	self.add(workflow);
	
	return self;
}

//make constructor function the public component interface
module.exports = ApplicationWindow;
