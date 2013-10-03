//Application Window Component Constructor
function ApplicationWindow() {
	//load component dependencies
	var FormView = require('ui/common/FormView');
		
	//create component instance
	var self = Ti.UI.createWindow({
		backgroundColor:'#ffffff',
		navBarHidden:true
	});
		
	//construct UI
	var formView = new FormView();
	self.add(formView);
	
	return self;
}

//make constructor function the public component interface
module.exports = ApplicationWindow;
