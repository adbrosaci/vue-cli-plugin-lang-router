const { EOL } = require('os');


module.exports = function addImport(fileContent, name, importStatement) {

	// If the required import exist already, do not proceed
	if (fileContent.indexOf(importStatement) != -1) {
		return fileContent;
	}
	
	// If there's a standalone import of "name", replace it
	else if (standaloneImport(fileContent, name) != null) {
		fileContent = fileContent.replace(standaloneImport(fileContent, name)[0], importStatement);
	}
	
	// If there's a non-standalone import, remove "name" from there and add a standalone import
	else if (nonStandaloneImport(fileContent, name) != null) {
		const match = nonStandaloneImport(fileContent, name);
		const index = match.index + match[0].indexOf(match[1]);
		fileContent = fileContent.substring(0, index) + fileContent.substring(index + match[1].length);

		const imports = fileContent.match(/^import.*$/gm);
		fileContent = fileContent.replace(imports[imports.length - 1], imports[imports.length - 1] + EOL + importStatement);
	}

	// Otherwise just add a standalone import
	else {
		const imports = fileContent.match(/^import.*$/gm);
		fileContent = fileContent.replace(imports[imports.length - 1], imports[imports.length - 1] + EOL + importStatement);
	}

	return fileContent;
}


function standaloneImport (fileContent, name) {
	const regExp = new RegExp(`^import {? *${name} *}? from .+$`, 'm');
	return fileContent.match(regExp);
}

function nonStandaloneImport (fileContent, name) {
	const regExp = new RegExp(`^import .*(( *, *${name})|(${name} *, *)|( *, *{ *${name} *})|({ *${name} *} *, *)).* from .+$`, 'm');
	return fileContent.match(regExp);
}