const chalk = require('chalk');


module.exports = {
	info,
	warn,
	error
}


// Informative messages
function info (msg) {
	console.log(chalk.bgCyan.black(' INFO ') + ' ' + chalk.cyan(msg));
	return true;
}

// Warning messages
function warn (msg) {
	console.log(chalk.bgYellow.black(' WARN ') + ' ' + chalk.yellow(msg));
	return true;
}

// Error messages
function error (msg) {
	console.log(chalk.bgRed.black(' ERROR ') + ' ' + chalk.red(msg));
	return false;
}